<?php

declare(strict_types=1);

/**
 * Contrôleur principal orchestrant les actions de l'API Audiomack Scraper.
 */
final class ControleurAudiomack
{
    private ServiceClientAudiomack $client;
    private ServiceAnalyseUrl $analyseUrl;
    private ServiceFluxAudio $fluxAudio;
    private ServiceDonneesArtiste $donneesArtiste;
    private Journalisation $journal;

    public function __construct(
        ServiceClientAudiomack $client,
        ServiceAnalyseUrl $analyseUrl,
        ServiceFluxAudio $fluxAudio,
        ServiceDonneesArtiste $donneesArtiste,
        Journalisation $journal
    ) {
        $this->client = $client;
        $this->analyseUrl = $analyseUrl;
        $this->fluxAudio = $fluxAudio;
        $this->donneesArtiste = $donneesArtiste;
        $this->journal = $journal;
    }

    public function traiterRequete(): never
    {
        $action = ReponseHttp::lireParametreTexte('action', 'analyser', 40);

        try {
            match ($action) {
                'analyser' => $this->analyser(),
                'artiste' => $this->artiste(),
                'contenu_artiste' => $this->contenuArtiste(),
                'rechercher' => $this->rechercher(),
                'suggestions' => $this->suggestions(),
                'verifier_flux' => $this->verifierFlux(),
                'sauvegarder' => $this->sauvegarder(),
                'flux' => $this->flux(false),
                'telecharger' => $this->flux(true),
                default => ReponseHttp::envoyerErreur('Unknown action requested.', 400),
            };
        } catch (InvalidArgumentException $erreur) {
            ReponseHttp::envoyerErreur($erreur->getMessage(), 400);
        } catch (Throwable $erreur) {
            $this->journal->erreur('Erreur controleur Audiomack', [
                'action' => $action,
                'message' => $erreur->getMessage(),
            ]);
            ReponseHttp::envoyerErreur($erreur->getMessage(), 502);
        }
    }

    private function analyser(): never
    {
        $url = ReponseHttp::lireParametreTexte('url', '', 600);
        if ($url === '') {
            ReponseHttp::envoyerErreur('Please enter an Audiomack URL.', 400);
        }

        $donnees = $this->analyseUrl->analyserUrl($url);
        ReponseHttp::envoyerSucces(['data' => $donnees]);
    }

    private function artiste(): never
    {
        $slug = ReponseHttp::lireParametreTexte('slug', '', 120);
        if ($slug === '') {
            ReponseHttp::envoyerErreur('Please specify an artist slug.', 400);
        }

        $donnees = $this->donneesArtiste->obtenirPageArtisteComplete($slug);
        ReponseHttp::envoyerSucces(['data' => $donnees]);
    }

    private function contenuArtiste(): never
    {
        $slug = ReponseHttp::lireParametreTexte('slug', '', 120);
        $id = ReponseHttp::lireParametreTexte('id', '', 32);
        $onglet = ReponseHttp::lireParametreTexte('onglet', 'pistes', 40);
        $page = ReponseHttp::lireParametreEntier('page', 1, 1, 50);

        $donnees = $this->donneesArtiste->obtenirOngletArtiste($slug, $id, $onglet, $page);
        ReponseHttp::envoyerSucces($donnees);
    }

    private function rechercher(): never
    {
        $requete = ReponseHttp::lireParametreTexte('q', '', 200);
        if ($requete === '') {
            ReponseHttp::envoyerErreur('Please enter a search query.', 400);
        }

        $filtre = ReponseHttp::lireParametreTexte('show', 'music', 20);
        if (!in_array($filtre, ['music', 'songs', 'albums'], true)) {
            $filtre = 'music';
        }
        $tri = ReponseHttp::lireParametreTexte('sort', 'popular', 20);
        if (!in_array($tri, ['popular', 'recent'], true)) {
            $tri = 'popular';
        }

        $pageParam = $_GET['page'] ?? null;
        if ($pageParam !== null && $pageParam !== '') {
            $page = ReponseHttp::lireParametreEntier('page', 1, 1, 100);
        } else {
            $limite = ReponseHttp::lireParametreEntier('limit', 20, 1, 24);
            $decalage = ReponseHttp::lireParametreEntier('offset', 0, 0, 2000);
            $page = intdiv($decalage, $limite) + 1;
        }

        $reponse = $this->client->rechercher($requete, $page, $filtre, $tri);
        $bruts = is_array($reponse['results'] ?? null) ? $reponse['results'] : [];

        $pistes = [];
        foreach ($bruts as $item) {
            if (!is_array($item)) {
                continue;
            }
            $carte = ModelePiste::normaliserCarteRecherche($item);
            if ($carte !== null) {
                $pistes[] = $carte;
            }
        }

        $seuilPagePleine = ($filtre === 'songs' && $tri === 'popular') ? 12 : 20;

        ReponseHttp::envoyerSucces([
            'pistes' => $pistes,
            'page' => $page,
            'precedent' => $page > 1,
            'suivant' => count($bruts) >= $seuilPagePleine,
            'show' => $filtre,
            'sort' => $tri,
            'artiste_verifie' => ModeleArtiste::normaliser(
                is_array($reponse['verified_artist'] ?? null) ? $reponse['verified_artist'] : null
            ),
        ]);
    }

    private function suggestions(): never
    {
        $requete = ReponseHttp::lireParametreTexte('q', '', 120);
        if (mb_strlen($requete) < 2) {
            ReponseHttp::envoyerSucces(['suggestions' => []]);
        }

        $reponse = $this->client->rechercher($requete, 1, 'songs', 'popular', 8);
        $suggestions = [];
        $vus = [];

        if (!empty($reponse['verified_artist']['name'])) {
            $nom = (string) $reponse['verified_artist']['name'];
            $vus[strtolower($nom)] = true;
            $suggestions[] = $nom;
        }

        foreach (($reponse['results'] ?? []) as $item) {
            if (!is_array($item)) {
                continue;
            }
            $titre = trim((string) ($item['title'] ?? ''));
            $artiste = trim((string) ($item['artist'] ?? ''));
            $libelle = $artiste !== '' && $titre !== '' ? ($artiste . ' - ' . $titre) : $titre;
            $cle = strtolower($libelle);
            if ($libelle !== '' && !isset($vus[$cle])) {
                $vus[$cle] = true;
                $suggestions[] = $libelle;
            }
            if (count($suggestions) >= 6) {
                break;
            }
        }

        ReponseHttp::envoyerSucces(['suggestions' => $suggestions]);
    }

    private function verifierFlux(): never
    {
        $id = ReponseHttp::lireParametreTexte('id', '', 32);
        $titre = ReponseHttp::lireParametreTexte('titre', '', 150);
        $qualite = $this->fluxAudio->verifierFlux($id, $titre);
        ReponseHttp::envoyerSucces(['qualites' => [$qualite]]);
    }

    private function sauvegarder(): never
    {
        $id = ReponseHttp::lireParametreTexte('id', '', 32);
        $titre = ReponseHttp::lireParametreTexte('titre', 'audiomack_track', 150);
        $resultat = $this->fluxAudio->sauvegarderAudio($id, $titre);
        unset($resultat['chemin_absolu']);
        ReponseHttp::envoyerSucces(['fichier' => $resultat]);
    }

    private function flux(bool $telechargement): never
    {
        $id = ReponseHttp::lireParametreTexte('id', '', 32);
        $titre = ReponseHttp::lireParametreTexte('titre', 'audiomack_track', 150);
        $this->fluxAudio->diffuserFlux($id, $telechargement, $titre);
    }
}
