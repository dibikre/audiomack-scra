<?php

declare(strict_types=1);

/**
 * Service de lecture locale du fichier skills-api-audiomack.har en secours hors-ligne.
 */
final class ServiceHar
{
    private string $cheminHar;
    private ?array $entreesCache = null;

    public function __construct(?string $cheminHar = null)
    {
        $this->cheminHar = $cheminHar ?? ConfigurationApi::cheminHar();
    }

    public function rechercherDansHar(string $cheminEndpoint, ?string $motCle = null): ?array
    {
        $entrees = $this->chargerEntrees();
        foreach ($entrees as $entree) {
            $url = (string) ($entree['request']['url'] ?? '');
            if (!str_contains($url, $cheminEndpoint)) {
                continue;
            }
            if ($motCle !== null && $motCle !== '' && !str_contains(strtolower($url), strtolower($motCle))) {
                continue;
            }
            $contenu = $this->extraireContenuJson($entree);
            if ($contenu !== null) {
                return $contenu;
            }
        }
        return null;
    }

    public function extraireAudioIntegre(string $identifiantPiste): ?string
    {
        if ($identifiantPiste !== '24088244') {
            return null;
        }
        $entrees = $this->chargerEntrees();
        foreach ($entrees as $entree) {
            $mime = (string) ($entree['response']['content']['mimeType'] ?? '');
            $texte = (string) ($entree['response']['content']['text'] ?? '');
            $encodage = (string) ($entree['response']['content']['encoding'] ?? '');
            if (str_starts_with($mime, 'audio/') && $texte !== '' && $encodage === 'base64') {
                $binaire = base64_decode($texte, true);
                return $binaire !== false ? $binaire : null;
            }
        }
        return null;
    }

    private function chargerEntrees(): array
    {
        if ($this->entreesCache !== null) {
            return $this->entreesCache;
        }
        if (!is_file($this->cheminHar)) {
            $this->entreesCache = [];
            return [];
        }
        $contenu = @file_get_contents($this->cheminHar);
        if ($contenu === false) {
            $this->entreesCache = [];
            return [];
        }
        $json = json_decode($contenu, true);
        $this->entreesCache = is_array($json['log']['entries'] ?? null) ? $json['log']['entries'] : [];
        return $this->entreesCache;
    }

    private function extraireContenuJson(array $entree): ?array
    {
        $mime = (string) ($entree['response']['content']['mimeType'] ?? '');
        if (!str_contains($mime, 'json')) {
            return null;
        }
        $texte = (string) ($entree['response']['content']['text'] ?? '');
        if ($texte === '') {
            return null;
        }
        if (($entree['response']['content']['encoding'] ?? '') === 'base64') {
            $decode = base64_decode($texte, true);
            $texte = $decode !== false ? $decode : '';
        }
        $json = json_decode($texte, true);
        return is_array($json) ? $json : null;
    }
}
