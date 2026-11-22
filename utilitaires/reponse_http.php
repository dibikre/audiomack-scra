<?php

declare(strict_types=1);

/**
 * Utilitaires de réponse HTTP JSON et de validation des entrées.
 */
final class ReponseHttp
{
    public static function envoyerSucces(array $donnees, int $statut = 200): never
    {
        http_response_code($statut);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['success' => true] + $donnees, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function envoyerErreur(string $message, int $statut = 400): never
    {
        http_response_code($statut);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode([
            'success' => false,
            'error' => $message,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function lireParametreTexte(string $nom, string $defaut = '', int $longueurMax = 500): string
    {
        $valeur = $_GET[$nom] ?? $defaut;
        if (!is_string($valeur)) {
            return $defaut;
        }
        $propre = trim($valeur);
        if (mb_strlen($propre) > $longueurMax) {
            return mb_substr($propre, 0, $longueurMax);
        }
        return $propre;
    }

    public static function lireParametreEntier(string $nom, int $defaut, int $min, int $max): int
    {
        $valeur = $_GET[$nom] ?? null;
        if ($valeur === null || $valeur === '') {
            return $defaut;
        }
        $entier = filter_var($valeur, FILTER_VALIDATE_INT);
        if ($entier === false) {
            return $defaut;
        }
        return max($min, min($max, $entier));
    }
}
