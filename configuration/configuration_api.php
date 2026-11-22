<?php

declare(strict_types=1);

/**
 * Configuration centralisée de l'application Audiomack Scraper.
 */
final class ConfigurationApi
{
    public const URL_BASE_API = 'https://api.audiomack.com/v1';
    public const AGENT_UTILISATEUR = 'Mozilla/5.0 (Linux; Android 14) AudiomackWebClient/1.0';
    public const DELAI_REQUETE_SECONDES = 15;
    public const TAILLE_PAGE_DEFAUT = 12;

    /**
     * Charge les variables depuis un éventuel fichier .env local.
     */
    public static function chargerEnvironnement(string $cheminRacine): void
    {
        $fichierEnv = $cheminRacine . '/.env';
        if (!is_file($fichierEnv)) {
            return;
        }
        $lignes = file($fichierEnv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        foreach ($lignes as $ligne) {
            $lignePropre = trim($ligne);
            if ($lignePropre === '' || str_starts_with($lignePropre, '#') || !str_contains($lignePropre, '=')) {
                continue;
            }
            [$cle, $valeur] = explode('=', $lignePropre, 2);
            $cle = trim($cle);
            $valeur = trim($valeur, " \t\n\r\0\x0B\"'");
            if ($cle !== '' && getenv($cle) === false) {
                putenv($cle . '=' . $valeur);
            }
        }
    }

    public static function urlBase(): string
    {
        return getenv('AUDIOMACK_API_URL') ?: self::URL_BASE_API;
    }

    public static function cleConsommateur(): string
    {
        return getenv('AUDIOMACK_CONSUMER_KEY') ?: 'audiomack-web';
    }

    public static function secretConsommateur(): string
    {
        return getenv('AUDIOMACK_CONSUMER_SECRET') ?: 'bd8a07e9f23fbe9d808646b730f89b8e';
    }

    public static function cheminHar(): string
    {
        return dirname(__DIR__) . '/skills-api-audiomack.har';
    }

    /**
     * @return list<string>
     */
    public static function cheminsHar(): array
    {
        return [
            dirname(__DIR__) . '/skills-api-audiomack.har',
            dirname(__DIR__) . '/skill-artiste-data.har',
            dirname(__DIR__) . '/skill-pagination-recherche.har',
        ];
    }

    public static function cheminJournaux(): string
    {
        return dirname(__DIR__) . '/donnees/journaux.log';
    }

    public static function dossierMusiques(): string
    {
        return dirname(__DIR__) . '/musiques';
    }
}
