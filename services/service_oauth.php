<?php

declare(strict_types=1);

/**
 * Service de signature OAuth 1.0a (HMAC-SHA1) pour l'API Audiomack.
 */
final class ServiceOAuth
{
    private string $cleConsommateur;
    private string $secretConsommateur;

    public function __construct(?string $cleConsommateur = null, ?string $secretConsommateur = null)
    {
        $this->cleConsommateur = $cleConsommateur ?? ConfigurationApi::cleConsommateur();
        $this->secretConsommateur = $secretConsommateur ?? ConfigurationApi::secretConsommateur();
    }

    /**
     * Génère l'en-tête Authorization OAuth 1.0a pour une requête GET ou POST.
     */
    public function genererEntete(string $methode, string $urlSansQuery, array $parametresQuery = []): string
    {
        $parametresOAuth = [
            'oauth_consumer_key' => $this->cleConsommateur,
            'oauth_nonce' => bin2hex(random_bytes(8)),
            'oauth_signature_method' => 'HMAC-SHA1',
            'oauth_timestamp' => (string) time(),
            'oauth_version' => '1.0',
        ];

        $tousParametres = array_merge($parametresOAuth, $parametresQuery);
        ksort($tousParametres, SORT_STRING);

        $paires = [];
        foreach ($tousParametres as $cle => $valeur) {
            $paires[] = rawurlencode((string) $cle) . '=' . rawurlencode((string) $valeur);
        }

        $chaineBase = strtoupper($methode)
            . '&' . rawurlencode($urlSansQuery)
            . '&' . rawurlencode(implode('&', $paires));

        $cleSignature = rawurlencode($this->secretConsommateur) . '&';
        $parametresOAuth['oauth_signature'] = base64_encode(
            hash_hmac('sha1', $chaineBase, $cleSignature, true)
        );

        $elementsEntete = [];
        foreach ($parametresOAuth as $cle => $valeur) {
            $elementsEntete[] = $cle . '="' . rawurlencode($valeur) . '"';
        }

        return 'OAuth ' . implode(', ', $elementsEntete);
    }
}
