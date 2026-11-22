<?php

declare(strict_types=1);

/**
 * Service de stockage local des fichiers audio dans le dossier relatif musiques/.
 */
final class ServiceStockageAudio
{
    private const EXTENSIONS_AUTORISEES = ['m4a', 'mp3', 'aac'];

    private string $dossierMusiques;
    private Journalisation $journal;

    public function __construct(?string $dossierMusiques = null, ?Journalisation $journal = null)
    {
        $this->dossierMusiques = rtrim($dossierMusiques ?? ConfigurationApi::dossierMusiques(), '/\\');
        $this->journal = $journal ?? new Journalisation();
    }

    public function assurerDossier(): string
    {
        if (!is_dir($this->dossierMusiques)) {
            if (!@mkdir($this->dossierMusiques, 0755, true) && !is_dir($this->dossierMusiques)) {
                throw new RuntimeException('Unable to create local musiques directory.');
            }
        }
        if (!is_writable($this->dossierMusiques)) {
            throw new RuntimeException('Local musiques directory is not writable.');
        }
        return $this->dossierMusiques;
    }

    /**
     * @return array{nom_fichier: string, chemin_absolu: string, chemin_relatif: string, extension: string}
     */
    public function construireChemin(string $titre, string $extension = 'm4a'): array
    {
        $ext = strtolower(trim($extension));
        if (!in_array($ext, self::EXTENSIONS_AUTORISEES, true)) {
            $ext = 'm4a';
        }
        $base = Formatage::nettoyerNomFichier($titre);
        $nomFichier = basename($base . '.' . $ext);

        return [
            'nom_fichier' => $nomFichier,
            'chemin_absolu' => $this->dossierMusiques . DIRECTORY_SEPARATOR . $nomFichier,
            'chemin_relatif' => 'musiques/' . $nomFichier,
            'extension' => $ext,
        ];
    }

    public function trouverFichierExistant(string $titre, string $extension = 'm4a'): ?array
    {
        $cible = $this->construireChemin($titre, $extension);
        if (is_file($cible['chemin_absolu'])) {
            $taille = filesize($cible['chemin_absolu']);
            if ($taille !== false && $taille > 0) {
                $cible['size_bytes'] = $taille;
                return $cible;
            }
        }
        return null;
    }

    public function sauvegarderDepuisUrl(
        string $urlSignee,
        string $titre,
        string $extension,
        ?string $binaireSecours = null
    ): array {
        $this->assurerDossier();
        $existant = $this->trouverFichierExistant($titre, $extension);
        if ($existant !== null) {
            return $existant;
        }

        $cible = $this->construireChemin($titre, $extension);
        $temporaire = $cible['chemin_absolu'] . '.part.' . bin2hex(random_bytes(4));

        $flux = @fopen($temporaire, 'wb');
        if ($flux === false) {
            throw new RuntimeException('Unable to open temporary audio file for writing.');
        }

        $canal = curl_init($urlSignee);
        if ($canal === false) {
            fclose($flux);
            @unlink($temporaire);
            throw new RuntimeException('Unable to initialize audio download client.');
        }

        curl_setopt_array($canal, [
            CURLOPT_FILE => $flux,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 180,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_USERAGENT => ConfigurationApi::AGENT_UTILISATEUR,
        ]);

        $succes = curl_exec($canal);
        $codeHttp = (int) curl_getinfo($canal, CURLINFO_HTTP_CODE);
        $erreurCurl = curl_error($canal);
        curl_close($canal);
        fclose($flux);

        $taille = is_file($temporaire) ? (int) filesize($temporaire) : 0;
        if (!$succes || $codeHttp >= 400 || $taille === 0) {
            @unlink($temporaire);
            if ($binaireSecours !== null && $binaireSecours !== '') {
                return $this->sauvegarderBinaire($binaireSecours, $titre, $extension);
            }
            $this->journal->erreur('Echec sauvegarde audio locale', [
                'http' => $codeHttp,
                'erreur' => $erreurCurl,
                'cible' => $cible['chemin_relatif'],
            ]);
            throw new RuntimeException('Failed to download remote audio stream.');
        }

        if (!@rename($temporaire, $cible['chemin_absolu'])) {
            @unlink($temporaire);
            throw new RuntimeException('Failed to save downloaded audio file.');
        }

        $cible['size_bytes'] = $taille;
        $this->journal->info('Audio sauvegarde localement', ['chemin' => $cible['chemin_relatif'], 'octets' => $taille]);
        return $cible;
    }

    public function sauvegarderBinaire(string $binaire, string $titre, string $extension = 'm4a'): array
    {
        $this->assurerDossier();
        $cible = $this->construireChemin($titre, $extension);
        $temporaire = $cible['chemin_absolu'] . '.part.' . bin2hex(random_bytes(4));
        if (@file_put_contents($temporaire, $binaire) === false) {
            @unlink($temporaire);
            throw new RuntimeException('Unable to write local audio file.');
        }
        if (!@rename($temporaire, $cible['chemin_absolu'])) {
            @unlink($temporaire);
            throw new RuntimeException('Unable to finalize local audio file.');
        }
        $cible['size_bytes'] = strlen($binaire);
        return $cible;
    }

    public function envoyerFichierLocal(string $cheminAbsolu, string $mime, string $nomTelechargement): never
    {
        if (!is_file($cheminAbsolu)) {
            ReponseHttp::envoyerErreur('Local audio file not found.', 404);
        }
        $taille = (int) filesize($cheminAbsolu);
        http_response_code(200);
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . $taille);
        header('Accept-Ranges: bytes');
        header('Content-Disposition: attachment; filename="' . basename($nomTelechargement) . '"');
        readfile($cheminAbsolu);
        exit;
    }
}
