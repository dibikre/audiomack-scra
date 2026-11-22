<?php

declare(strict_types=1);

/**
 * Modèle de normalisation d'un profil artiste Audiomack.
 */
final class ModeleArtiste
{
    public static function normaliser(?array $brut): ?array
    {
        if ($brut === null || $brut === []) {
            return null;
        }

        $slug = (string) ($brut['url_slug'] ?? '');
        $urlProfil = $slug !== '' ? 'https://audiomack.com/' . $slug : null;
        $stats = is_array($brut['stats'] ?? null) ? $brut['stats'] : [];
        $localisation = is_array($brut['location'] ?? null)
            ? ($brut['location']['display'] ?? null)
            : ($brut['hometown'] ?? null);

        $imageBase = (string) ($brut['image_base'] ?? $brut['image'] ?? '');
        $banniere = (string) ($brut['image_banner'] ?? '');
        $statutVerifie = (string) ($brut['verified'] ?? '');

        return [
            'id' => (string) ($brut['id'] ?? ''),
            'name' => (string) ($brut['name'] ?? $slug),
            'url_slug' => $slug,
            'permalink_url' => $urlProfil,
            'avatar_url' => Formatage::construireUrlImage($imageBase, 400),
            'banner_url' => $banniere !== '' ? Formatage::construireUrlImage($banniere, 1050) : null,
            'verified' => in_array($statutVerifie, ['yes', 'authenticated', 'tastemaker'], true),
            'verified_tier' => $statutVerifie,
            'verified_pro' => ($brut['verified_via_pro'] ?? '') === 'yes',
            'genre' => (string) ($brut['genre'] ?? ''),
            'label' => (string) ($brut['label'] ?? $brut['label_name'] ?? ''),
            'location' => is_string($localisation) && $localisation !== '' ? $localisation : null,
            'bio' => (string) ($brut['bio'] ?? ''),
            'website' => (string) ($brut['url'] ?? ''),
            'twitter' => !empty($brut['twitter']) ? 'https://x.com/' . ltrim((string) $brut['twitter'], '@') : null,
            'instagram' => !empty($brut['instagram']) ? 'https://instagram.com/' . ltrim((string) $brut['instagram'], '@') : null,
            'youtube' => (string) ($brut['youtube'] ?? ''),
            'tiktok' => (string) ($brut['tiktok'] ?? ''),
            'facebook' => (string) ($brut['facebook'] ?? ''),
            'created_at' => Formatage::convertirDateIso($brut['created'] ?? null),
            'followers_count' => isset($brut['followers_count']) ? (int) $brut['followers_count'] : (int) ($brut['follow_count'] ?? 0),
            'following_count' => (int) ($brut['following_count'] ?? 0),
            'upload_count' => (int) ($brut['upload_count'] ?? 0),
            'track_count' => isset($brut['track_count']) ? (int) $brut['track_count'] : null,
            'album_count' => isset($brut['album_count']) ? (int) $brut['album_count'] : null,
            'favorites_count' => (int) ($brut['favorites_count'] ?? 0),
            'playlists_count' => (int) ($brut['playlists_count'] ?? 0),
            'reup_count' => (int) ($brut['reup_count'] ?? 0),
            'plays_count' => isset($stats['plays-raw']) ? (int) $stats['plays-raw'] : null,
        ];
    }
}
