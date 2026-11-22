<?php

declare(strict_types=1);

/**
 * Couche de journalisation centralisée vers fichier et sortie d'erreur.
 */
final class Journalisation
{
    private string $cheminFichier;

    public function __construct(?string $cheminFichier = null)
    {
        $this->cheminFichier = $cheminFichier ?? ConfigurationApi::cheminJournaux();
    }

    public function info(string $message, array $contexte = []): void
    {
        $this->ecrire('INFO', $message, $contexte);
    }

    public function avertissement(string $message, array $contexte = []): void
    {
        $this->ecrire('WARNING', $message, $contexte);
    }

    public function erreur(string $message, array $contexte = []): void
    {
        $this->ecrire('ERROR', $message, $contexte);
    }

    private function ecrire(string $niveau, string $message, array $contexte): void
    {
        $dossier = dirname($this->cheminFichier);
        if (!is_dir($dossier)) {
            @mkdir($dossier, 0775, true);
        }
        $horodatage = date('Y-m-d H:i:s');
        $donneesJson = $contexte !== [] ? ' ' . json_encode($contexte, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '';
        $ligne = sprintf("[%s] [%s] %s%s\n", $horodatage, $niveau, $message, $donneesJson);
        @file_put_contents($this->cheminFichier, $ligne, FILE_APPEND | LOCK_EX);
    }
}
