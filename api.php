<?php

declare(strict_types=1);

require_once __DIR__ . '/configuration/configuration_api.php';
require_once __DIR__ . '/utilitaires/journalisation.php';
require_once __DIR__ . '/utilitaires/reponse_http.php';
require_once __DIR__ . '/utilitaires/formatage.php';
require_once __DIR__ . '/modeles/modele_artiste.php';
require_once __DIR__ . '/modeles/modele_piste.php';
require_once __DIR__ . '/modeles/modele_collection.php';
require_once __DIR__ . '/modeles/modele_donnees_artiste.php';
require_once __DIR__ . '/services/service_oauth.php';
require_once __DIR__ . '/services/service_har.php';
require_once __DIR__ . '/services/service_client_audiomack.php';
require_once __DIR__ . '/services/service_donnees_artiste.php';
require_once __DIR__ . '/services/service_analyse_url.php';
require_once __DIR__ . '/services/service_flux_audio.php';
require_once __DIR__ . '/controleurs/controleur_audiomack.php';

ConfigurationApi::chargerEnvironnement(__DIR__);

$journal = new Journalisation();
$serviceOAuth = new ServiceOAuth();
$serviceHar = new ServiceHar();
$clientAudiomack = new ServiceClientAudiomack($serviceOAuth, $serviceHar, $journal);
$serviceDonneesArtiste = new ServiceDonneesArtiste($clientAudiomack, $journal);
$serviceAnalyse = new ServiceAnalyseUrl($clientAudiomack, $serviceDonneesArtiste);
$serviceFlux = new ServiceFluxAudio($clientAudiomack, $serviceHar, $journal);

$controleur = new ControleurAudiomack($clientAudiomack, $serviceAnalyse, $serviceFlux, $serviceDonneesArtiste, $journal);
$controleur->traiterRequete();
