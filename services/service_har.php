<?php

declare(strict_types=1);

/**
 * Service de lecture locale du fichier skills-api-audiomack.har en secours hors-ligne.
 */
final class ServiceHar
{
    /** @var list<string> */
    private array $cheminsHar;
    /** @var array<string, list<array>> */
    private array $entreesParFichier = [];

    /**
     * @param string|list<string>|null $cheminsHar
     */
    public function __construct(string|array|null $cheminsHar = null)
    {
        if (is_string($cheminsHar)) {
            $this->cheminsHar = [$cheminsHar];
        } elseif (is_array($cheminsHar)) {
            $this->cheminsHar = array_values($cheminsHar);
        } else {
            $this->cheminsHar = ConfigurationApi::cheminsHar();
        }
    }

    public function rechercherDansHar(
        string $cheminEndpoint,
        ?string $motCle = null,
        ?string $filtreSecondaire = null
    ): ?array {
        foreach ($this->cheminsHar as $chemin) {
            $entrees = $this->chargerEntrees($chemin);
            foreach ($entrees as $entree) {
                $url = (string) ($entree['request']['url'] ?? '');
                if (!str_contains($url, $cheminEndpoint)) {
                    continue;
                }
                if ($motCle !== null && $motCle !== '' && !str_contains(strtolower($url), strtolower($motCle))) {
                    continue;
                }
                if ($filtreSecondaire !== null && $filtreSecondaire !== '') {
                    $correspond = str_contains($filtreSecondaire, '=')
                        ? (preg_match('/(?:[?&]|^)' . preg_quote($filtreSecondaire, '/') . '(?:[&#]|$)/', $url) === 1)
                        : str_contains($url, $filtreSecondaire);
                    if (!$correspond) {
                        continue;
                    }
                }
                $contenu = $this->extraireContenuJson($entree);
                if ($contenu !== null) {
                    return $contenu;
                }
            }
        }
        return null;
    }

    public function extraireAudioIntegre(string $identifiantPiste): ?string
    {
        if ($identifiantPiste !== '24088244') {
            return null;
        }
        foreach ($this->cheminsHar as $chemin) {
            $entrees = $this->chargerEntrees($chemin);
            foreach ($entrees as $entree) {
                $mime = (string) ($entree['response']['content']['mimeType'] ?? '');
                $texte = (string) ($entree['response']['content']['text'] ?? '');
                $encodage = (string) ($entree['response']['content']['encoding'] ?? '');
                if (str_starts_with($mime, 'audio/') && $texte !== '' && $encodage === 'base64') {
                    $binaire = base64_decode($texte, true);
                    return $binaire !== false ? $binaire : null;
                }
            }
        }
        return null;
    }

    /**
     * @return list<array>
     */
    private function chargerEntrees(string $chemin): array
    {
        if (isset($this->entreesParFichier[$chemin])) {
            return $this->entreesParFichier[$chemin];
        }
        if (!is_file($chemin)) {
            $this->entreesParFichier[$chemin] = [];
            return [];
        }
        $contenu = @file_get_contents($chemin);
        if ($contenu === false) {
            $this->entreesParFichier[$chemin] = [];
            return [];
        }
        $json = json_decode($contenu, true);
        $this->entreesParFichier[$chemin] = is_array($json['log']['entries'] ?? null) ? $json['log']['entries'] : [];
        return $this->entreesParFichier[$chemin];
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
