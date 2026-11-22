<?php

declare(strict_types=1);

/**
 * Modèle de normalisation d'un album ou d'une playlist Audiomack.
 */
final class ModeleCollection
{
    public static function normaliser(array $brut, string $typeCollection): array
    {
        $slugArtiste = (string) ($brut['uploader']['url_slug'] ?? $brut['artist']['url_slug'] ?? '');
        $slugCollection = (string) ($brut['url_slug'] ?? '');
        $urlPermalien = $brut['links']['self'] ?? null;
        if (!$urlPermalien && $slugArtiste !== '' && $slugCollection !== '') {
            $urlPermalien = 'https://audiomack.com/' . $slugArtiste . '/' . $typeCollection . '/' . $slugCollection;
        }

        $imageBase = (string) ($brut['image_base'] ?? $brut['image'] ?? '');
        $pistesBrutes = is_array($brut['tracks'] ?? null) ? $brut['tracks'] : [];
        $pistes = [];

        foreach ($pistesBrutes as $index => $element) {
            if (!is_array($element)) {
                continue;
            }
            $id = (string) ($element['song_id'] ?? $element['id'] ?? '');
            $slugPiste = (string) ($element['url_slug'] ?? '');
            $artistePisteSlug = (string) ($element['uploader_url_slug'] ?? $slugArtiste);
            $urlPiste = ($artistePisteSlug !== '' && $slugPiste !== '')
                ? 'https://audiomack.com/' . $artistePisteSlug . '/song/' . $slugPiste
                : ($id !== '' ? 'https://audiomack.com/song/' . $id : '');

            $pistes[] = [
                'index' => $index + 1,
                'id' => $id,
                'title' => (string) ($element['title'] ?? 'Track ' . ($index + 1)),
                'artist' => (string) ($element['artist'] ?? $brut['artist'] ?? ''),
                'duration_s' => (int) ($element['duration'] ?? 0),
                'duration_human' => Formatage::formaterDureeHumaine((int) ($element['duration'] ?? 0)),
                'isrc' => (string) ($element['isrc'] ?? ''),
                'producer' => (string) ($element['producer'] ?? ''),
                'url' => $urlPiste,
                'artwork_url' => Formatage::construireUrlImage($imageBase, 200),
            ];
        }

        $stats = is_array($brut['stats'] ?? null) ? $brut['stats'] : [];
        return [
            'id' => (string) ($brut['id'] ?? ''),
            'type' => $typeCollection,
            'title' => (string) ($brut['title'] ?? 'Collection'),
            'artist_display' => is_string($brut['artist'] ?? null)
                ? $brut['artist']
                : (string) ($brut['artist']['name'] ?? ''),
            'genre' => (string) ($brut['genre'] ?? ''),
            'artwork_url' => Formatage::construireUrlImage($imageBase, 500),
            'permalink_url' => $urlPermalien,
            'released_at' => Formatage::convertirDateIso($brut['released'] ?? $brut['created'] ?? null),
            'track_count' => count($pistes) > 0 ? count($pistes) : (int) ($brut['track_count'] ?? 0),
            'playback_count' => isset($stats['plays-raw']) ? (int) $stats['plays-raw'] : null,
            'likes_count' => isset($stats['favorites-raw']) ? (int) $stats['favorites-raw'] : null,
            'tracks' => $pistes,
        ];
    }
}
