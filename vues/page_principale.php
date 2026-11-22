<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="theme-color" content="#ffffff" />
  <meta name="description" content="Audiomack metadata extractor, interactive waveform player, and audio stream downloader." />
  <meta property="og:title" content="AM Scraper - Audiomack Metadata &amp; Audio Extractor" />
  <meta property="og:description" content="Search any Audiomack track, album, or artist URL to inspect stats, publisher metadata, play waveforms, and download audio." />
  <title>AM Scraper - Audiomack Metadata &amp; Audio Extractor</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="./ressources/styles/base.css" />
  <link rel="stylesheet" href="./ressources/styles/cartes_et_details.css" />
  <link rel="stylesheet" href="./ressources/styles/lecteur_onde.css" />
</head>
<body>
  <div class="page" id="page">
    <?php require dirname(__DIR__) . '/composants/entete.php'; ?>

    <main class="hero">
      <div class="intro">
        <div class="intro-contenu">
          <h1 class="titre-principal">Search any Audiomack track, get every detail.</h1>
          <p class="sous-titre">Type a track or artist name, or paste an Audiomack link: waveform playback, streaming stats, publisher metadata, and audio download.</p>
        </div>
      </div>

      <?php require dirname(__DIR__) . '/composants/barre_recherche.php'; ?>

      <div class="ondes" id="ondes" aria-hidden="true"></div>

      <div class="statut" id="zone-statut" hidden>
        <div class="chargement" id="boite-chargement" role="status" hidden>
          <span class="spinner"></span><span id="message-chargement">Fetching data...</span>
        </div>
        <div class="erreur" id="boite-erreur" role="alert" hidden></div>
      </div>

      <section class="resultats" id="resultats-recherche" aria-label="Search results" hidden></section>
      <div class="resultats" id="resultats" hidden></div>
    </main>
  </div>

  <?php require dirname(__DIR__) . '/composants/pied_lecteur.php'; ?>

  <script src="./ressources/js/utilitaires_ui.js"></script>
  <script src="./ressources/js/dessin_onde.js"></script>
  <script src="./ressources/js/lecteur_onde.js"></script>
  <script src="./ressources/js/lecteur_dock.js"></script>
  <script src="./ressources/js/telechargement_audio.js"></script>
  <script src="./ressources/js/rendu_resultats.js"></script>
  <script src="./ressources/js/suggestions_recherche.js"></script>
  <script src="./ressources/js/application.js"></script>
</body>
</html>
