<?php

declare(strict_types=1);

/**
 * Service de récupération et d'agrégation des données complètes d'un artiste Audiomack.
 */
final class ServiceDonneesArtiste
{
    private ServiceClientAudiomack $client;
    private Journalisation $journal;

    public function __construct(ServiceClientAudiomack $client, Journalisation $journal)
    {
        $this->client = $client;
        $this->journal = $journal;
    }

    public function obtenirPageArtisteComplete(string $slugArtiste): array
    {
        $slugPropre = $this->validerSlug($slugArtiste);
        $artisteBrut = $this->client->obtenirArtiste($slugPropre);
        if (empty($artisteBrut['id'])) {
            throw new RuntimeException('Artist profile not found on Audiomack.');
        }

        $artiste = ModeleArtiste::normaliser($artisteBrut);
        $idArtiste = (string) $artisteBrut['id'];
        $slugEncode = rawurlencode($slugPropre);
        $idEncode = rawurlencode($idArtiste);
        $dateFin = gmdate('Y-m-d');
        $dateDebut = gmdate('Y-m-d', strtotime('-30 days'));

        $lots = $this->client->requetesMultiGet([
            'analytique' => [
                'chemin' => '/analytics/artists/' . $idEncode . '/public-account',
                'parametres' => ['startDate' => $dateDebut, 'endDate' => $dateFin],
            ],
            'epingles' => [
                'chemin' => '/artist/' . $slugEncode . '/pinned',
                'parametres' => ['fill_with_uploads' => 'true'],
            ],
            'pistes' => [
                'chemin' => '/search_artist_content',
                'parametres' => ['artist_id' => $idArtiste, 'type' => 'songs', 'sort' => 'rank', 'page' => '1'],
            ],
            'albums' => [
                'chemin' => '/search_artist_content',
                'parametres' => ['artist_id' => $idArtiste, 'type' => 'albums', 'sort' => 'date', 'page' => '1', 'exclude_tracks' => '1'],
            ],
            'playlists' => [
                'chemin' => '/artist/' . $slugEncode . '/playlists',
                'parametres' => ['page' => '1'],
            ],
            'favoris' => [
                'chemin' => '/artist/' . $slugEncode . '/favorites',
                'parametres' => ['show' => 'music', 'page' => '1'],
            ],
            'reups' => [
                'chemin' => '/artist/' . $slugEncode . '/reups',
                'parametres' => ['page' => '1', 'exclude_tracks' => '1'],
            ],
            'acces_anticipe' => [
                'chemin' => '/artist/' . $slugEncode . '/early-access',
                'parametres' => ['page' => '1'],
            ],
            'donateurs' => [
                'chemin' => '/artist/' . $idEncode . '/donation',
                'parametres' => ['type' => 'top-supporters', 'offset' => '0', 'limit' => '10'],
            ],
            'soutiens_autres' => [
                'chemin' => '/artist/' . $idEncode . '/donation-for-others',
                'parametres' => ['type' => 'recent-music', 'offset' => '0', 'limit' => '10'],
            ],
            'apparitions_playlists' => [
                'chemin' => '/analytics/artists/' . $idEncode . '/appears-on-playlists',
                'parametres' => ['page' => '1', 'limit' => '20'],
            ],
        ]);

        $auditeursMensuels = $lots['analytique']['data']['listener'] ?? null;
        if ($artiste !== null) {
            $artiste['monthly_listeners'] = is_numeric($auditeursMensuels) ? (int) $auditeursMensuels : null;
        }

        $epinglesBruts = is_array($lots['epingles'] ?? null)
            ? (isset($lots['epingles']['results']) ? $lots['epingles']['results'] : $lots['epingles'])
            : [];

        $pistesBrutes = is_array($lots['pistes']['results'] ?? null) ? $lots['pistes']['results'] : [];
        $albumsBruts = is_array($lots['albums']['results'] ?? null) ? $lots['albums']['results'] : [];
        $playlistsBrutes = is_array($lots['playlists']['results'] ?? null) ? $lots['playlists']['results'] : [];
        $favorisBruts = is_array($lots['favoris']['results'] ?? null) ? $lots['favoris']['results'] : [];
        $reupsBruts = is_array($lots['reups']['results'] ?? null) ? $lots['reups']['results'] : [];
        $anticipeBruts = is_array($lots['acces_anticipe']['results'] ?? null) ? $lots['acces_anticipe']['results'] : [];
        $donateursBruts = is_array($lots['donateurs']['results'] ?? null) ? $lots['donateurs']['results'] : [];
        $soutiensBruts = is_array($lots['soutiens_autres']['results'] ?? null) ? $lots['soutiens_autres']['results'] : [];
        $apparitionsBrutes = is_array($lots['apparitions_playlists']['data']['rows'] ?? null)
            ? $lots['apparitions_playlists']['data']['rows']
            : [];

        $this->journal->info('Page artiste chargee', ['slug' => $slugPropre, 'id' => $idArtiste]);

        return [
            'kind' => 'artist',
            'track' => null,
            'artist' => $artiste,
            'artist_sections' => [
                'epingles' => ModeleDonneesArtiste::normaliserListeMedias($epinglesBruts, $slugPropre),
                'pistes' => ModeleDonneesArtiste::normaliserListeMedias($pistesBrutes, $slugPropre),
                'albums' => ModeleDonneesArtiste::normaliserListeMedias($albumsBruts, $slugPropre),
                'playlists' => ModeleDonneesArtiste::normaliserListePlaylists($playlistsBrutes),
                'favoris' => ModeleDonneesArtiste::normaliserListeMedias($favorisBruts, $slugPropre),
                'reups' => ModeleDonneesArtiste::normaliserListeMedias($reupsBruts, $slugPropre),
                'acces_anticipe' => ModeleDonneesArtiste::normaliserListeMedias($anticipeBruts, $slugPropre),
                'donateurs' => ModeleDonneesArtiste::normaliserDonateurs($donateursBruts),
                'soutiens_autres' => ModeleDonneesArtiste::normaliserSoutiensAutres($soutiensBruts),
                'apparitions_playlists' => ModeleDonneesArtiste::normaliserListePlaylists($apparitionsBrutes),
                'suite' => [
                    'pistes' => count($pistesBrutes) >= 20,
                    'albums' => count($albumsBruts) >= 20,
                    'playlists' => count($playlistsBrutes) >= 20,
                    'favoris' => count($favorisBruts) >= 20,
                    'reups' => count($reupsBruts) >= 20,
                    'acces_anticipe' => count($anticipeBruts) >= 20,
                    'apparitions_playlists' => count($apparitionsBrutes) >= 20,
                ],
            ],
            'collection' => null,
        ];
    }

    public function obtenirOngletArtiste(string $slugArtiste, string $idArtiste, string $onglet, int $page): array
    {
        $slugPropre = $this->validerSlug($slugArtiste);
        if (!ctype_digit($idArtiste)) {
            throw new InvalidArgumentException('Invalid artist identifier.');
        }

        $slugEncode = rawurlencode($slugPropre);
        $idEncode = rawurlencode($idArtiste);
        $pageStr = (string) max(1, $page);

        $reponse = match ($onglet) {
            'pistes' => $this->client->requeteGet('/search_artist_content', [
                'artist_id' => $idArtiste,
                'type' => 'songs',
                'sort' => 'rank',
                'page' => $pageStr,
            ]),
            'albums' => $this->client->requeteGet('/search_artist_content', [
                'artist_id' => $idArtiste,
                'type' => 'albums',
                'sort' => 'date',
                'page' => $pageStr,
                'exclude_tracks' => '1',
            ]),
            'playlists' => $this->client->requeteGet('/artist/' . $slugEncode . '/playlists', ['page' => $pageStr]),
            'favoris' => $this->client->requeteGet('/artist/' . $slugEncode . '/favorites', ['show' => 'music', 'page' => $pageStr]),
            'reups' => $this->client->requeteGet('/artist/' . $slugEncode . '/reups', ['page' => $pageStr, 'exclude_tracks' => '1']),
            'acces_anticipe' => $this->client->requeteGet('/artist/' . $slugEncode . '/early-access', ['page' => $pageStr]),
            'apparitions_playlists' => $this->client->requeteGet('/analytics/artists/' . $idEncode . '/appears-on-playlists', ['page' => $pageStr, 'limit' => '20']),
            default => throw new InvalidArgumentException('Unsupported artist tab requested.'),
        };

        $bruts = $onglet === 'apparitions_playlists'
            ? (is_array($reponse['data']['rows'] ?? null) ? $reponse['data']['rows'] : [])
            : (is_array($reponse['results'] ?? null) ? $reponse['results'] : []);

        $items = in_array($onglet, ['playlists', 'apparitions_playlists'], true)
            ? ModeleDonneesArtiste::normaliserListePlaylists($bruts)
            : ModeleDonneesArtiste::normaliserListeMedias($bruts, $slugPropre);

        return [
            'items' => $items,
            'suivant' => count($bruts) >= 20,
        ];
    }

    private function validerSlug(string $slugArtiste): string
    {
        $slugPropre = trim($slugArtiste);
        if (!preg_match('/^[a-zA-Z0-9._-]{1,100}$/', $slugPropre)) {
            throw new InvalidArgumentException('Invalid Audiomack artist slug.');
        }
        return $slugPropre;
    }
}
