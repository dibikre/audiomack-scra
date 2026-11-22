<?php

declare(strict_types=1);

/**
 * Service de résolution de flux audio signé et de proxy HTTP (streaming & téléchargement).
 */
final class ServiceFluxAudio
{
    private ServiceClientAudiomack $client;
    private ServiceHar $serviceHar;
    private Journalisation $journal;

    public function __construct(
        ServiceClientAudiomack $client,
        ServiceHar $serviceHar,
        Journalisation $journal
    ) {
        $this->client = $client;
        $this->serviceHar = $serviceHar;
        $this->journal = $journal;
    }

    public function verifierFlux(string $idPiste): array
    {
        if (!ctype_digit($idPiste)) {
            throw new InvalidArgumentException('Invalid track identifier.');
        }

        $playData = $this->client->obtenirUrlLecture($idPiste);
        $urlSignee = (string) ($playData['signedUrl'] ?? '');
        if ($urlSignee === '') {
            throw new RuntimeException('No playable stream available for this track.');
        }

        $infosEntete = $this->inspecterEntetesFlux($urlSignee);
        $mime = $infosEntete['content_type'];
        $taille = $infosEntete['content_length'];
        $format = str_contains($mime, 'mpeg') || str_contains($urlSignee, '.mp3') ? 'MP3' : 'M4A / AAC';
        $extension = $format === 'MP3' ? 'mp3' : 'm4a';

        return [
            'id' => $idPiste,
            'format' => $format,
            'extension' => $extension,
            'mime' => $mime,
            'size_bytes' => $taille,
            'play_uuid' => (string) ($playData['playUuid'] ?? ''),
            'proxy_url' => './api.php?action=telecharger&id=' . urlencode($idPiste),
            'stream_url' => './api.php?action=flux&id=' . urlencode($idPiste),
        ];
    }

    public function diffuserFlux(string $idPiste, bool $telechargement, string $titre = 'track'): never
    {
        if (!ctype_digit($idPiste)) {
            ReponseHttp::envoyerErreur('Invalid track identifier.', 400);
        }

        try {
            $playData = $this->client->obtenirUrlLecture($idPiste);
            $urlSignee = (string) ($playData['signedUrl'] ?? '');
            if ($urlSignee === '') {
                throw new RuntimeException('Signed stream URL missing.');
            }
            $this->relayerUrl($urlSignee, $telechargement, $titre);
        } catch (Throwable $erreur) {
            $this->journal->avertissement('Echec flux distant, tentative HAR', ['id' => $idPiste, 'erreur' => $erreur->getMessage()]);
            $binaireHar = $this->serviceHar->extraireAudioIntegre($idPiste);
            if ($binaireHar !== null) {
                $this->envoyerBinaire($binaireHar, 'audio/mp4', $telechargement, $titre, 'm4a');
            }
            ReponseHttp::envoyerErreur('Unable to stream audio: ' . $erreur->getMessage(), 502);
        }
    }

    private function inspecterEntetesFlux(string $url): array
    {
        $canal = curl_init($url);
        if ($canal === false) {
            return ['content_type' => 'audio/mp4', 'content_length' => null];
        }
        curl_setopt_array($canal, [
            CURLOPT_NOBODY => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_USERAGENT => ConfigurationApi::AGENT_UTILISATEUR,
        ]);
        curl_exec($canal);
        $mime = (string) (curl_getinfo($canal, CURLINFO_CONTENT_TYPE) ?: 'audio/mp4');
        $taille = curl_getinfo($canal, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
        curl_close($canal);

        return [
            'content_type' => explode(';', $mime)[0],
            'content_length' => is_numeric($taille) && $taille > 0 ? (int) $taille : null,
        ];
    }

    private function relayerUrl(string $urlSignee, bool $telechargement, string $titre): never
    {
        $infos = $this->inspecterEntetesFlux($urlSignee);
        $mime = $infos['content_type'] ?: 'audio/mp4';
        $extension = str_contains($mime, 'mpeg') ? 'mp3' : 'm4a';
        $plageRange = $_SERVER['HTTP_RANGE'] ?? null;

        $entetesSortie = [
            'Accept-Ranges: bytes',
            'Content-Type: ' . $mime,
            'Cache-Control: private, max-age=300',
        ];
        if ($infos['content_length'] !== null && !$plageRange) {
            $entetesSortie[] = 'Content-Length: ' . $infos['content_length'];
        }
        if ($telechargement) {
            $nomFichier = Formatage::nettoyerNomFichier($titre) . '.' . $extension;
            $entetesSortie[] = 'Content-Disposition: attachment; filename="' . $nomFichier . '"';
        }

        $canal = curl_init($urlSignee);
        if ($canal === false) {
            throw new RuntimeException('Stream relay initialization failed.');
        }

        $entetesRequete = ['User-Agent: ' . ConfigurationApi::AGENT_UTILISATEUR];
        if (is_string($plageRange) && preg_match('/^bytes=\d+-\d*$/', $plageRange)) {
            $entetesRequete[] = 'Range: ' . $plageRange;
        }

        $statutEnvoye = false;
        curl_setopt_array($canal, [
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 0,
            CURLOPT_HTTPHEADER => $entetesRequete,
            CURLOPT_HEADERFUNCTION => static function ($ch, string $ligne) use (&$statutEnvoye, $entetesSortie): int {
                if (!$statutEnvoye && preg_match('#^HTTP/\S+\s+(\d{3})#', $ligne, $m)) {
                    http_response_code((int) $m[1]);
                    foreach ($entetesSortie as $e) {
                        header($e);
                    }
                    $statutEnvoye = true;
                } elseif (preg_match('/^(Content-Range|Content-Length):/i', $ligne)) {
                    header(trim($ligne));
                }
                return strlen($ligne);
            },
            CURLOPT_WRITEFUNCTION => static function ($ch, string $morceau): int {
                echo $morceau;
                flush();
                return strlen($morceau);
            },
        ]);

        curl_exec($canal);
        curl_close($canal);
        exit;
    }

    private function envoyerBinaire(string $binaire, string $mime, bool $telechargement, string $titre, string $ext): never
    {
        http_response_code(200);
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . strlen($binaire));
        header('Accept-Ranges: bytes');
        if ($telechargement) {
            header('Content-Disposition: attachment; filename="' . Formatage::nettoyerNomFichier($titre) . '.' . $ext . '"');
        }
        echo $binaire;
        exit;
    }
}
