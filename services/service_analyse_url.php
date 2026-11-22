<?php

declare(strict_types=1);

/**
 * Service de validation d'URL Audiomack et de résolution complète des ressources.
 */
final class ServiceAnalyseUrl
{
    private ServiceClientAudiomack $client;

    public function __construct(ServiceClientAudiomack $client)
    {
        $this->client = $client;
    }

    public function analyserUrl(string $urlBrute): array
    {
        $cible = $this->parserCible($urlBrute);

        return match ($cible['genre']) {
            'song' => $this->chargerPiste(
                $this->client->obtenirPisteParSlug($cible['artiste'], $cible['slug'])
            ),
            'song_id' => $this->chargerPiste(
                $this->client->obtenirPisteParId($cible['id'])
            ),
            'album' => $this->chargerCollection(
                $this->client->obtenirAlbum($cible['artiste'], $cible['slug']),
                'album'
            ),
            'playlist' => $this->chargerCollection(
                $this->client->obtenirPlaylist($cible['artiste'], $cible['slug']),
                'playlist'
            ),
            'artist' => $this->chargerProfilArtiste($cible['artiste']),
        };
    }

    private function parserCible(string $entree): array
    {
        $propre = trim($entree);
        if (ctype_digit($propre)) {
            return ['genre' => 'song_id', 'id' => $propre];
        }

        if (!preg_match('#^https?://#i', $propre)) {
            $propre = 'https://' . $propre;
        }

        $parties = parse_url($propre);
        $hote = strtolower((string) ($parties['host'] ?? ''));
        if (!in_array($hote, ['audiomack.com', 'www.audiomack.com', 'm.audiomack.com'], true)) {
            throw new InvalidArgumentException('Please enter a valid Audiomack URL (audiomack.com).');
        }

        $chemin = trim((string) ($parties['path'] ?? ''), '/');
        $segments = $chemin !== '' ? array_values(array_filter(explode('/', $chemin))) : [];

        if (count($segments) >= 3 && in_array($segments[1], ['song', 'album', 'playlist'], true)) {
            return [
                'genre' => $segments[1],
                'artiste' => $segments[0],
                'slug' => $segments[2],
            ];
        }

        if (count($segments) === 1 && preg_match('/^[a-zA-Z0-9._-]+$/', $segments[0])) {
            return [
                'genre' => 'artist',
                'artiste' => $segments[0],
            ];
        }

        throw new InvalidArgumentException('Unsupported Audiomack URL format. Try a song, album, playlist, or artist link.');
    }

    private function chargerPiste(array $brut): array
    {
        if (empty($brut['id'])) {
            throw new RuntimeException('Track not found on Audiomack.');
        }

        $piste = ModelePiste::normaliser($brut);
        $artisteBrut = is_array($brut['uploader'] ?? null) ? $brut['uploader'] : null;

        if ($artisteBrut === null && $piste['uploader_slug'] !== '') {
            try {
                $artisteBrut = $this->client->obtenirArtiste($piste['uploader_slug']);
            } catch (Throwable) {
                $artisteBrut = null;
            }
        }

        return [
            'kind' => 'song',
            'track' => $piste,
            'artist' => ModeleArtiste::normaliser($artisteBrut),
            'collection' => null,
        ];
    }

    private function chargerCollection(array $brut, string $type): array
    {
        if (empty($brut['id'])) {
            throw new RuntimeException(ucfirst($type) . ' not found on Audiomack.');
        }

        $collection = ModeleCollection::normaliser($brut, $type);
        $artisteBrut = is_array($brut['uploader'] ?? null)
            ? $brut['uploader']
            : (is_array($brut['artist'] ?? null) ? $brut['artist'] : null);

        return [
            'kind' => $type,
            'track' => null,
            'artist' => ModeleArtiste::normaliser($artisteBrut),
            'collection' => $collection,
        ];
    }

    private function chargerProfilArtiste(string $slugArtiste): array
    {
        $artisteBrut = $this->client->obtenirArtiste($slugArtiste);
        if (empty($artisteBrut['id'])) {
            throw new RuntimeException('Artist profile not found on Audiomack.');
        }
        $artiste = ModeleArtiste::normaliser($artisteBrut);
        $pistesPopulaires = [];

        try {
            $contenu = $this->client->requeteGet('/search_artist_content', [
                'artist_id' => (string) $artisteBrut['id'],
                'type' => 'songs',
                'sort' => 'rank',
                'page' => '1',
            ]);
            foreach (($contenu['results'] ?? []) as $index => $item) {
                if (!is_array($item)) {
                    continue;
                }
                $piste = ModelePiste::normaliser($item);
                $pistesPopulaires[] = [
                    'index' => $index + 1,
                    'id' => $piste['id'],
                    'title' => $piste['title'],
                    'artist' => $piste['artist_display'],
                    'duration_s' => $piste['duration_s'],
                    'duration_human' => $piste['duration_human'],
                    'isrc' => $piste['publisher']['isrc'] ?? '',
                    'producer' => $piste['publisher']['producer'] ?? '',
                    'url' => $piste['permalink_url'] ?? '',
                    'artwork_url' => $piste['artwork_thumb'],
                ];
            }
        } catch (Throwable) {
            $pistesPopulaires = [];
        }

        return [
            'kind' => 'artist',
            'track' => null,
            'artist' => $artiste,
            'collection' => [
                'id' => $artiste['id'] ?? '',
                'type' => 'artist_top',
                'title' => 'Top Tracks by ' . ($artiste['name'] ?? $slugArtiste),
                'artist_display' => $artiste['name'] ?? $slugArtiste,
                'genre' => $artiste['genre'] ?? '',
                'artwork_url' => $artiste['avatar_url'] ?? null,
                'permalink_url' => $artiste['permalink_url'] ?? null,
                'released_at' => null,
                'track_count' => count($pistesPopulaires),
                'playback_count' => $artiste['plays_count'] ?? null,
                'likes_count' => null,
                'tracks' => $pistesPopulaires,
            ],
        ];
    }
}
