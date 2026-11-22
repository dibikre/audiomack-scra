<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/configuration/configuration_api.php';
require_once dirname(__DIR__) . '/utilitaires/formatage.php';
require_once dirname(__DIR__) . '/modeles/modele_artiste.php';
require_once dirname(__DIR__) . '/modeles/modele_piste.php';
require_once dirname(__DIR__) . '/modeles/modele_collection.php';
require_once dirname(__DIR__) . '/modeles/modele_donnees_artiste.php';
require_once dirname(__DIR__) . '/services/service_oauth.php';
require_once dirname(__DIR__) . '/services/service_har.php';

function affirmer(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "ECHEC TEST : $message\n");
        exit(1);
    }
}

// 1. Test signature OAuth 1.0a
$oauth = new ServiceOAuth('audiomack-web', 'bd8a07e9f23fbe9d808646b730f89b8e');
$entete = $oauth->genererEntete('GET', 'https://api.audiomack.com/v1/music/24088244');
affirmer(str_starts_with($entete, 'OAuth '), 'L en-tete OAuth doit commencer par OAuth');
affirmer(str_contains($entete, 'oauth_consumer_key="audiomack-web"'), 'Cle consommateur attendue');
affirmer(str_contains($entete, 'oauth_signature="'), 'Signature HMAC attendue');

// 2. Test formatage durée & waveform
affirmer(Formatage::formaterDureeHumaine(166) === '2:46', '166s doit donner 2:46');
affirmer(Formatage::formaterDureeHumaine(3661) === '1:01:01', '3661s doit donner 1:01:01');
$onde = Formatage::extraireFormeOnde('[28, 50, 100]');
affirmer(count($onde) === 3 && abs($onde[2] - 1.0) < 0.001, 'Normalisation volume_data');

// 3. Test lecture HAR & normalisation Modèle Piste + artiste_slug sur carte recherche
$har = new ServiceHar();
$pisteHar = $har->rechercherDansHar('/v1/music/24088244');
affirmer(is_array($pisteHar) && !empty($pisteHar['results']['id']), 'HAR doit contenir la piste 24088244');
$normalisee = ModelePiste::normaliser($pisteHar['results']);
affirmer($normalisee['title'] === 'Amapiano', 'Titre piste attendu : Amapiano');
affirmer($normalisee['publisher']['isrc'] === 'USUYG1489119', 'ISRC attendu : USUYG1489119');
affirmer(count($normalisee['waveform']) > 100, 'Waveform reel extrait du HAR');
$carteRecherche = ModelePiste::normaliserCarteRecherche($pisteHar['results']);
affirmer($carteRecherche !== null && $carteRecherche['artiste_slug'] !== '', 'Carte recherche doit inclure artiste_slug');

// 4. Test audio intégré dans le HAR
$audioHar = $har->extraireAudioIntegre('24088244');
affirmer($audioHar !== null && strlen($audioHar) > 1000000, 'Audio M4A integre dans le HAR');

// 5. Test lecture HAR artiste (skill-artiste-data.har) & ModeleDonneesArtiste
$profilHar = $har->rechercherDansHar('/v1/artist/amapianotypebeat');
affirmer(is_array($profilHar['results'] ?? null), 'HAR artiste doit contenir le profil amapianotypebeat');
$artisteNorm = ModeleArtiste::normaliser($profilHar['results']);
affirmer($artisteNorm !== null && $artisteNorm['url_slug'] === 'amapianotypebeat', 'Slug artiste attendu');

$playlistsHar = $har->rechercherDansHar('/v1/artist/amapianotypebeat/playlists');
$playlistsNorm = ModeleDonneesArtiste::normaliserListePlaylists($playlistsHar['results'] ?? []);
affirmer(count($playlistsNorm) > 0 && $playlistsNorm[0]['type'] === 'playlist', 'Playlists artiste normalisees');

$donsHar = $har->rechercherDansHar('/v1/artist/169665851/donation?type=top-supporters');
$donsNorm = ModeleDonneesArtiste::normaliserDonateurs($donsHar['results'] ?? []);
affirmer(count($donsNorm) > 0 && $donsNorm[0]['rang'] === 1, 'Top supporters normalises');

echo "Tous les tests unitaires ont reussi (5/5).\n";
