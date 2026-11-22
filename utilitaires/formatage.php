<?php

declare(strict_types=1);

/**
 * Fonctions utilitaires de formatage et normalisation pour Audiomack.
 */
final class Formatage
{
    public static function formaterDureeHumaine(int $secondes): string
    {
        if ($secondes <= 0) {
            return '0:00';
        }
        $heures = intdiv($secondes, 3600);
        $minutes = intdiv($secondes % 3600, 60);
        $reste = $secondes % 60;

        if ($heures > 0) {
            return sprintf('%d:%02d:%02d', $heures, $minutes, $reste);
        }
        return sprintf('%d:%02d', $minutes, $reste);
    }

    public static function convertirDateIso(mixed $horodatage): ?string
    {
        if ($horodatage === null || $horodatage === '' || $horodatage === '0') {
            return null;
        }
        if (is_numeric($horodatage)) {
            $valeur = (int) $horodatage;
            if ($valeur <= 0) {
                return null;
            }
            return gmdate('c', $valeur);
        }
        return is_string($horodatage) ? $horodatage : null;
    }

    /**
     * Analyse le champ volume_data retourné par l'API Audiomack (chaîne JSON ou tableau).
     *
     * @return float[]
     */
    public static function extraireFormeOnde(mixed $donneesVolume): array
    {
        if (is_string($donneesVolume) && $donneesVolume !== '') {
            $decode = json_decode($donneesVolume, true);
            $donneesVolume = is_array($decode) ? $decode : [];
        }
        if (!is_array($donneesVolume) || $donneesVolume === []) {
            return [];
        }

        $echantillons = [];
        foreach ($donneesVolume as $point) {
            if (is_numeric($point)) {
                $echantillons[] = max(0.0, min(1.0, ((float) $point) / 100.0));
            }
        }
        return $echantillons;
    }

    public static function nettoyerNomFichier(string $nom): string
    {
        $texte = trim($nom);
        if (function_exists('iconv') && $texte !== '') {
            $converti = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $texte);
            if (is_string($converti) && $converti !== '') {
                $texte = $converti;
            }
        }
        $propre = preg_replace('/[^a-zA-Z0-9 \-_]/', '_', $texte) ?: 'audiomack_track';
        $propre = preg_replace('/\s+/', ' ', $propre) ?: 'audiomack_track';
        $propre = trim((string) preg_replace('/_+/', '_', $propre), " _-");
        if (strlen($propre) > 120) {
            $propre = rtrim(substr($propre, 0, 120), " _-");
        }
        return $propre !== '' ? $propre : 'audiomack_track';
    }

    public static function construireUrlImage(?string $urlBase, int $largeur = 500): ?string
    {
        if ($urlBase === null || $urlBase === '') {
            return null;
        }
        $urlSansParam = explode('?', $urlBase)[0];
        if (!preg_match('#^https?://#i', $urlSansParam)) {
            return null;
        }
        return $urlSansParam . '?width=' . $largeur;
    }
}
