<?php

declare(strict_types=1);

/**
 * Modèle de normalisation d'une piste audio Audiomack.
 */
final class ModelePiste
{
    public static function normaliser(array $brut): array
    {
        $id = (string) ($brut['id'] ?? $brut['song_id'] ?? '');
        $dureeSecondes = (int) ($brut['duration'] ?? 0);
        $stats = is_array($brut['stats'] ?? null) ? $brut['stats'] : [];
        $uploader = is_array($brut['uploader'] ?? null) ? $brut['uploader'] : [];
        $slugArtiste = (string) ($uploader['url_slug'] ?? $brut['uploader_url_slug'] ?? '');
        $slugTitre = (string) ($brut['url_slug'] ?? '');
        $type = (string) ($brut['type'] ?? 'song');

        $urlPermalien = $brut['links']['self'] ?? null;
        if (!$urlPermalien && $slugArtiste !== '' && $slugTitre !== '') {
            $segmentType = $type === 'album' ? 'album' : 'song';
            $urlPermalien = 'https://audiomack.com/' . $slugArtiste . '/' . $segmentType . '/' . $slugTitre;
        }

        $imageBase = (string) ($brut['image_base'] ?? $brut['image'] ?? '');
        $detailsAlbum = is_array($brut['album_details'] ?? null) ? $brut['album_details'] : [];

        return [
            'id' => $id,
            'type' => $type,
            'title' => (string) ($brut['title'] ?? 'Untitled'),
            'artist_display' => (string) ($brut['artist'] ?? $uploader['name'] ?? ''),
            'url_slug' => $slugTitre,
            'uploader_slug' => $slugArtiste,
            'permalink_url' => $urlPermalien,
            'artwork_url' => Formatage::construireUrlImage($imageBase, 500),
            'artwork_thumb' => Formatage::construireUrlImage($imageBase, 200),
            'genre' => (string) ($brut['genre'] ?? ''),
            'explicit' => ($brut['explicit'] ?? '') === 'yes',
            'duration_s' => $dureeSecondes,
            'duration_ms' => $dureeSecondes * 1000,
            'duration_human' => Formatage::formaterDureeHumaine($dureeSecondes),
            'description' => (string) ($brut['description'] ?? ''),
            'released_at' => Formatage::convertirDateIso($brut['released'] ?? $brut['original_release_date'] ?? null),
            'uploaded_at' => Formatage::convertirDateIso($brut['uploaded'] ?? null),
            'playback_count' => (int) ($stats['plays-raw'] ?? 0),
            'likes_count' => (int) ($stats['favorites-raw'] ?? 0),
            'reposts_count' => (int) ($stats['reposts-raw'] ?? 0),
            'playlists_count' => (int) ($stats['playlists-raw'] ?? 0),
            'comment_count' => (int) ($stats['comments'] ?? 0),
            'download_count' => (int) ($stats['track_dls'] ?? $stats['downloads-raw'] ?? 0),
            'waveform' => Formatage::extraireFormeOnde($brut['volume_data'] ?? null),
            'stream_proxy_url' => $id !== '' ? './api.php?action=flux&id=' . urlencode($id) : null,
            'download_proxy_url' => $id !== '' ? './api.php?action=telecharger&id=' . urlencode($id) : null,
            'publisher' => [
                'artist' => (string) ($brut['artist'] ?? ''),
                'album_title' => (string) ($detailsAlbum['title'] ?? $brut['album'] ?? ''),
                'producer' => (string) ($brut['producer'] ?? ''),
                'featuring' => (string) ($brut['featuring'] ?? ''),
                'isrc' => (string) ($brut['isrc'] ?? ''),
                'upc_or_ean' => (string) ($brut['upc'] ?? $detailsAlbum['upc'] ?? ''),
                'p_line' => (string) ($brut['pline'] ?? ''),
                'c_line' => (string) ($brut['cline'] ?? ''),
            ],
        ];
    }

    public static function normaliserCarteRecherche(array $brut): ?array
    {
        $type = (string) ($brut['type'] ?? 'song');
        if ($type !== 'song' && $type !== 'album') {
            return null;
        }
        $piste = self::normaliser($brut);
        if (!$piste['permalink_url']) {
            return null;
        }
        return [
            'id' => $piste['id'],
            'type' => $type,
            'titre' => $piste['title'],
            'artiste' => $piste['artist_display'],
            'artiste_slug' => $piste['uploader_slug'],
            'artiste_url' => $piste['uploader_slug'] !== '' ? 'https://audiomack.com/' . $piste['uploader_slug'] : null,
            'url' => $piste['permalink_url'],
            'pochette' => $piste['artwork_url'],
            'duree' => $type === 'song' ? $piste['duration_human'] : 'Album',
            'ecoutes' => $piste['playback_count'],
            'genre' => $piste['genre'],
        ];
    }
}
