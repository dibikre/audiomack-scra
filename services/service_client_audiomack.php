<?php

declare(strict_types=1);

/**
 * Client HTTP principal pour consommer l'API Audiomack v1 avec OAuth 1.0a.
 */
final class ServiceClientAudiomack
{
    private ServiceOAuth $serviceOAuth;
    private ServiceHar $serviceHar;
    private Journalisation $journal;

    public function __construct(
        ServiceOAuth $serviceOAuth,
        ServiceHar $serviceHar,
        Journalisation $journal
    ) {
        $this->serviceOAuth = $serviceOAuth;
        $this->serviceHar = $serviceHar;
        $this->journal = $journal;
    }

    public function requeteGet(string $chemin, array $parametres = []): array
    {
        $cheminPropre = '/' . ltrim($chemin, '/');
        $canal = $this->preparerCanal($cheminPropre, $parametres);
        $corps = curl_exec($canal);
        $codeHttp = (int) curl_getinfo($canal, CURLINFO_HTTP_CODE);
        $erreurCurl = curl_error($canal);
        curl_close($canal);

        if ($corps === false || $codeHttp === 0) {
            $this->journal->avertissement('Echec reseau Audiomack, tentative HAR', ['chemin' => $cheminPropre, 'erreur' => $erreurCurl]);
            $secours = $this->serviceHar->rechercherDansHar($cheminPropre, (string) ($parametres['q'] ?? ''));
            if ($secours !== null) {
                return $secours;
            }
            throw new RuntimeException('Network error while contacting Audiomack API.');
        }

        $donnees = json_decode((string) $corps, true);
        if (!is_array($donnees)) {
            $this->journal->erreur('Reponse JSON invalide depuis Audiomack', ['chemin' => $cheminPropre, 'http' => $codeHttp]);
            throw new RuntimeException('Invalid response received from Audiomack API.');
        }

        if ($codeHttp >= 400) {
            $messageApi = (string) ($donnees['message'] ?? $donnees['error'] ?? ('Audiomack API returned HTTP ' . $codeHttp));
            $this->journal->avertissement('Erreur API Audiomack', ['chemin' => $cheminPropre, 'http' => $codeHttp, 'message' => $messageApi]);
            throw new RuntimeException($messageApi);
        }

        return $donnees;
    }

    /**
     * Exécute plusieurs requêtes GET en parallèle via curl_multi avec repli HAR individuel.
     *
     * @param array<string, array{chemin: string, parametres?: array<string, string>}> $requetes
     * @return array<string, array|null>
     */
    public function requetesMultiGet(array $requetes): array
    {
        $multi = curl_multi_init();
        $canaux = [];
        $meta = [];

        foreach ($requetes as $cle => $spec) {
            $chemin = '/' . ltrim($spec['chemin'], '/');
            $parametres = $spec['parametres'] ?? [];
            $canal = $this->preparerCanal($chemin, $parametres);
            $canaux[$cle] = $canal;
            $meta[$cle] = ['chemin' => $chemin, 'parametres' => $parametres];
            curl_multi_add_handle($multi, $canal);
        }

        do {
            $statut = curl_multi_exec($multi, $actifs);
            if ($actifs) {
                curl_multi_select($multi, 0.2);
            }
        } while ($actifs && $statut === CURLM_OK);

        $resultats = [];
        foreach ($canaux as $cle => $canal) {
            $corps = curl_multi_getcontent($canal);
            $codeHttp = (int) curl_getinfo($canal, CURLINFO_HTTP_CODE);
            curl_multi_remove_handle($multi, $canal);
            curl_close($canal);

            $donnees = ($corps !== null && $corps !== '' && $codeHttp > 0 && $codeHttp < 400)
                ? json_decode($corps, true)
                : null;

            if (!is_array($donnees)) {
                $donnees = $this->serviceHar->rechercherDansHar($meta[$cle]['chemin']);
            }
            $resultats[$cle] = is_array($donnees) ? $donnees : null;
        }
        curl_multi_close($multi);
        return $resultats;
    }

    private function preparerCanal(string $cheminPropre, array $parametres): CurlHandle
    {
        $urlBase = rtrim(ConfigurationApi::urlBase(), '/') . $cheminPropre;
        $enteteAuth = $this->serviceOAuth->genererEntete('GET', $urlBase, $parametres);
        $urlComplete = $parametres !== [] ? $urlBase . '?' . http_build_query($parametres) : $urlBase;

        $canal = curl_init($urlComplete);
        if ($canal === false) {
            throw new RuntimeException('Unable to initialize HTTP client.');
        }

        curl_setopt_array($canal, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => ConfigurationApi::DELAI_REQUETE_SECONDES,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_ENCODING => '',
            CURLOPT_HTTPHEADER => [
                'Authorization: ' . $enteteAuth,
                'Accept: application/json',
                'User-Agent: ' . ConfigurationApi::AGENT_UTILISATEUR,
            ],
        ]);
        return $canal;
    }

    public function obtenirPisteParSlug(string $slugArtiste, string $slugTitre): array
    {
        $reponse = $this->requeteGet('/music/song/' . rawurlencode($slugArtiste) . '/' . rawurlencode($slugTitre));
        return is_array($reponse['results'] ?? null) ? $reponse['results'] : $reponse;
    }

    public function obtenirPisteParId(string $idPiste): array
    {
        $reponse = $this->requeteGet('/music/' . rawurlencode($idPiste));
        return is_array($reponse['results'] ?? null) ? $reponse['results'] : $reponse;
    }

    public function obtenirAlbum(string $slugArtiste, string $slugAlbum): array
    {
        $reponse = $this->requeteGet('/music/album/' . rawurlencode($slugArtiste) . '/' . rawurlencode($slugAlbum));
        return is_array($reponse['results'] ?? null) ? $reponse['results'] : $reponse;
    }

    public function obtenirPlaylist(string $slugArtiste, string $slugPlaylist): array
    {
        $reponse = $this->requeteGet('/playlist/' . rawurlencode($slugArtiste) . '/' . rawurlencode($slugPlaylist));
        return is_array($reponse['results'] ?? null) ? $reponse['results'] : $reponse;
    }

    public function obtenirArtiste(string $slugArtiste): array
    {
        $reponse = $this->requeteGet('/artist/' . rawurlencode($slugArtiste));
        return is_array($reponse['results'] ?? null) ? $reponse['results'] : $reponse;
    }

    public function obtenirUrlLecture(string $idPiste): array
    {
        return $this->requeteGet('/music/play/' . rawurlencode($idPiste));
    }

    public function rechercher(string $requete, int $page = 1, int $limite = 12, string $filtre = 'music'): array
    {
        return $this->requeteGet('/livesearch', [
            'q' => $requete,
            'show' => $filtre,
            'sort' => 'popular',
            'page' => (string) $page,
            'limit' => (string) $limite,
            'exclude_tracks' => '1',
        ]);
    }
}
