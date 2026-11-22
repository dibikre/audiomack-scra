<?php

declare(strict_types=1);

/**
 * Modèle de normalisation des sections de données d'un profil artiste Audiomack.
 */
final class ModeleDonneesArtiste
{
    public static function normaliserCarteMedia(array $brut, string $slugSecours = ''): ?array
    {
        $type = (string) ($brut['type'] ?? 'song');
        if (!in_array($type, ['song', 'album'], true)) {
            return null;
        }

        $piste = ModelePiste::normaliser($brut);
        $slugUploader = $piste['uploader_slug'] !== '' ? $piste['uploader_slug'] : $slugSecours;
        $url = $piste['permalink_url'];
        if (!$url && $slugUploader !== '' && $piste['url_slug'] !== '') {
            $segment = $type === 'album' ? 'album' : 'song';
            $url = 'https://audiomack.com/' . $slugUploader . '/' . $segment . '/' . $piste['url_slug'];
        }
        if (!$url && $piste['id'] !== '') {
            $url = 'https://audiomack.com/song/' . $piste['id'];
        }
        if (!$url) {
            return null;
        }

        return [
            'id' => $piste['id'],
            'type' => $type,
            'titre' => $piste['title'],
            'artiste' => $piste['artist_display'],
            'artiste_slug' => $slugUploader,
            'url' => $url,
            'pochette' => $piste['artwork_url'],
            'duree' => $type === 'song' ? $piste['duration_human'] : 'Album',
            'ecoutes' => $piste['playback_count'],
            'genre' => $piste['genre'],
            'apercu_acces' => (string) ($brut['preview'] ?? ''),
            'date_sortie' => $piste['released_at'],
        ];
    }

    /**
     * @param array<int, mixed> $elements
     * @return list<array<string, mixed>>
     */
    public static function normaliserListeMedias(array $elements, string $slugSecours = ''): array
    {
        $cartes = [];
        foreach ($elements as $item) {
            if (!is_array($item)) {
                continue;
            }
            $carte = self::normaliserCarteMedia($item, $slugSecours);
            if ($carte !== null) {
                $cartes[] = $carte;
            }
        }
        return $cartes;
    }

    public static function normaliserPlaylist(array $brut): ?array
    {
        $id = (string) ($brut['id'] ?? $brut['playlistId'] ?? '');
        $slugPlaylist = (string) ($brut['url_slug'] ?? '');
        $artiste = is_array($brut['artist'] ?? null) ? $brut['artist'] : [];
        $slugArtiste = (string) ($artiste['url_slug'] ?? '');
        $url = (string) ($brut['links']['self'] ?? '');
        if ($url === '' && $slugArtiste !== '' && $slugPlaylist !== '') {
            $url = 'https://audiomack.com/' . $slugArtiste . '/playlist/' . $slugPlaylist;
        }
        if ($url === '') {
            return null;
        }

        $imageBase = (string) ($brut['image_base'] ?? $brut['image'] ?? '');
        $nbPistes = (int) ($brut['track_count'] ?? $brut['tracks_count'] ?? 0);

        return [
            'id' => $id,
            'type' => 'playlist',
            'titre' => (string) ($brut['title'] ?? 'Playlist'),
            'artiste' => (string) ($artiste['name'] ?? $slugArtiste),
            'artiste_slug' => $slugArtiste,
            'url' => $url,
            'pochette' => Formatage::construireUrlImage($imageBase, 400),
            'duree' => $nbPistes > 0 ? $nbPistes . ' tracks' : 'Playlist',
            'nombre_pistes' => $nbPistes,
            'genre' => (string) ($brut['genre'] ?? ''),
            'mis_a_jour' => (string) ($brut['time_ago'] ?? ''),
        ];
    }

    /**
     * @param array<int, mixed> $elements
     * @return list<array<string, mixed>>
     */
    public static function normaliserListePlaylists(array $elements): array
    {
        $playlists = [];
        foreach ($elements as $item) {
            if (!is_array($item)) {
                continue;
            }
            $carte = self::normaliserPlaylist($item);
            if ($carte !== null) {
                $playlists[] = $carte;
            }
        }
        return $playlists;
    }

    /**
     * @param array<int, mixed> $elements
     * @return list<array<string, mixed>>
     */
    public static function normaliserDonateurs(array $elements): array
    {
        $donateurs = [];
        foreach ($elements as $item) {
            if (!is_array($item)) {
                continue;
            }
            $artisteBrut = is_array($item['artist'] ?? null) ? $item['artist'] : null;
            $artiste = ModeleArtiste::normaliser($artisteBrut);
            if ($artiste === null) {
                continue;
            }
            $donateurs[] = [
                'rang' => (int) ($item['rank'] ?? (count($donateurs) + 1)),
                'montant_total' => (int) ($item['total_amount'] ?? 0),
                'nombre_soutiens' => (int) ($item['total_item'] ?? 0),
                'date_soutien' => Formatage::convertirDateIso($item['donation_time'] ?? null),
                'artiste' => $artiste,
            ];
        }
        return $donateurs;
    }

    /**
     * @param array<int, mixed> $elements
     * @return list<array<string, mixed>>
     */
    public static function normaliserSoutiensAutres(array $elements): array
    {
        $soutiens = [];
        foreach ($elements as $item) {
            if (!is_array($item) || !is_array($item['music'] ?? null)) {
                continue;
            }
            $media = self::normaliserCarteMedia($item['music']);
            if ($media === null) {
                continue;
            }
            $soutiens[] = [
                'produit' => (string) ($item['product'] ?? 'Support'),
                'date_soutien' => Formatage::convertirDateIso($item['donation_time'] ?? null),
                'media' => $media,
            ];
        }
        return $soutiens;
    }
}
