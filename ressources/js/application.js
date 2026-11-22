'use strict';

let _rechercheActive = null;
let _collectionActive = null;
let _minuteurProgression = null;
let _minuteurRetour = null;

const ressembleAUneUrl = (t) => (
  /^https?:\/\//i.test(t)
  || /^((www|m)\.)?audiomack\.com(\/|$)/i.test(t)
  || /^\d{5,12}$/.test(t)
);

const champRecherche = parId('champ-url');
const libelleBoutonPrincipal = () => (ressembleAUneUrl(champRecherche.value.trim()) ? 'Analyze' : 'Search');

function majLibelleLancement() {
  const bouton = parId('bouton-lancer');
  if (!bouton.disabled) bouton.textContent = libelleBoutonPrincipal();
}

function definirLancement(enCours, mode = 'analyse') {
  const bouton = parId('bouton-lancer');
  bouton.disabled = enCours;
  bouton.textContent = enCours ? (mode === 'recherche' ? 'Searching...' : 'Analyzing...') : libelleBoutonPrincipal();
}

function demarrerProgression() {
  clearInterval(_minuteurProgression);
  clearTimeout(_minuteurRetour);
  mettreAJourOndes(0);
  let valeur = 0;
  _minuteurProgression = setInterval(() => {
    valeur = Math.min(valeur + Math.random() * 8, 88);
    mettreAJourOndes(valeur);
  }, 250);
}

function terminerProgression(succes = true) {
  clearInterval(_minuteurProgression);
  mettreAJourOndes(succes ? 100 : 0);
  if (succes) _minuteurRetour = setTimeout(() => mettreAJourOndes(0), 900);
}

function masquerResultats() {
  detruireLecteurPrincipal();
  parId('resultats').hidden = true;
  parId('resultats-recherche').hidden = true;
}

function afficherChargement(msg = 'Fetching data...', mode = 'analyse') {
  controleurSuggestionsUi.fermerSuggestions();
  parId('zone-statut').hidden = false;
  parId('boite-chargement').hidden = false;
  parId('boite-erreur').hidden = true;
  parId('message-chargement').textContent = msg;
  masquerResultats();
  definirLancement(true, mode);
  demarrerProgression();
}

function afficherErreur(msg) {
  parId('zone-statut').hidden = false;
  parId('boite-chargement').hidden = true;
  const boite = parId('boite-erreur');
  boite.hidden = false;
  boite.innerHTML = `${iconeSvg('alerte', 20)}<span>${echapperHtml(msg)}</span>`;
  masquerResultats();
  definirLancement(false);
  terminerProgression(false);
}

function masquerStatut() {
  parId('zone-statut').hidden = true;
  parId('boite-chargement').hidden = true;
  parId('boite-erreur').hidden = true;
}

function afficherResultatsAnalyse(donnees) {
  const zone = parId('resultats');
  detruireLecteurPrincipal();
  _collectionActive = null;

  if (donnees.kind === 'artist' && donnees.artist) {
    afficherPageArtiste(donnees);
    return;
  }

  let html = '';
  if (donnees.track) html += htmlPiste(donnees);
  if (donnees.artist) html += htmlArtiste(donnees.artist);
  if (donnees.track && donnees.track.publisher) html += htmlEditeur(donnees.track.publisher);
  if (donnees.collection && donnees.collection.tracks && donnees.collection.tracks.length) {
    _collectionActive = donnees.collection.tracks.map((t) => ({
      id: t.id,
      titre: t.title,
      artiste: t.artist || donnees.collection.artist_display,
      url: t.url,
      pochette: t.artwork_url || donnees.collection.artwork_url,
    }));
    html += htmlCollection(donnees.collection);
  }
  if (!html) html = '<div class="vide">No structured metadata found for this Audiomack URL.</div>';
  if (_rechercheActive) {
    html = `<button type="button" class="bouton bouton-retour" id="bouton-retour">${iconeSvg('gauche', 16)}Back to results</button>${html}`;
  }

  zone.innerHTML = html;
  zone.hidden = false;
  parId('page').classList.add('a-des-resultats');
  initialiserBasculeTelechargement();
  initialiserLecteurPrincipal(donnees);
  synchroniserCartes();
}

async function lancerAnalyseUrl() {
  const url = champRecherche.value.trim();
  if (!url) { afficherErreur('Please enter an Audiomack URL.'); return; }
  afficherChargement('Fetching Audiomack metadata...');

  try {
    const reponse = await fetch(`./api.php?action=analyser&url=${encodeURIComponent(url)}`);
    const resultat = await reponse.json();
    if (!resultat.success) throw new Error(resultat.error || 'Unknown server error');
    terminerProgression(true);
    masquerStatut();
    definirLancement(false);
    afficherResultatsAnalyse(resultat.data);
  } catch (e) {
    afficherErreur(e.message);
  }
}

async function recupererPistes(requete, page = 1, show = 'music', sort = 'popular') {
  const params = new URLSearchParams({
    action: 'rechercher',
    q: requete,
    page: String(page),
    show,
    sort,
  });
  const reponse = await fetch(`./api.php?${params.toString()}`);
  const resultat = await reponse.json();
  if (!resultat.success) throw new Error(resultat.error || 'Unknown server error');
  return resultat;
}

function afficherResultatsRecherche() {
  const zone = parId('resultats-recherche');
  zone.innerHTML = htmlResultatsRecherche(_rechercheActive);
  zone.hidden = false;
  parId('page').classList.add('a-des-resultats');
  synchroniserCartes();
}

async function rechercherTitres(requete, page = 1, show = 'music', sort = 'popular') {
  afficherChargement(page > 1 ? `Loading page ${page}...` : 'Searching Audiomack...', 'recherche');
  if (page > 1) window.scrollTo({ top: 0, behavior: 'smooth' });
  try {
    const resultat = await recupererPistes(requete, page, show, sort);
    _rechercheActive = {
      requete,
      page: resultat.page || page,
      precedent: Boolean(resultat.precedent),
      suivant: Boolean(resultat.suivant),
      show: resultat.show || show,
      sort: resultat.sort || sort,
      pistes: resultat.pistes || [],
      artiste_verifie: resultat.artiste_verifie || null,
    };
    terminerProgression(true);
    masquerStatut();
    definirLancement(false);
    afficherResultatsRecherche();
  } catch (e) {
    afficherErreur(e.message);
  }
}

const controleurSuggestionsUi = initialiserSuggestions(champRecherche, rechercherTitres, ressembleAUneUrl);

parId('formulaire').addEventListener('submit', (e) => {
  e.preventDefault();
  const texte = champRecherche.value.trim();
  if (!texte) { afficherErreur('Enter a track name, artist, or Audiomack URL.'); return; }
  if (ressembleAUneUrl(texte)) { _rechercheActive = null; lancerAnalyseUrl(); }
  else rechercherTitres(texte);
});

champRecherche.addEventListener('input', majLibelleLancement);

function ouvrirAnalyseDepuisCarte(url) {
  champRecherche.value = url;
  majLibelleLancement();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  lancerAnalyseUrl();
}

parId('resultats-recherche').addEventListener('click', (e) => {
  const lienArtiste = e.target.closest('[data-artiste-slug]');
  if (lienArtiste) { ouvrirPageArtiste(lienArtiste.dataset.artisteSlug); return; }
  if (gererClicPaginationRecherche(e)) return;

  const carte = e.target.closest('.carte-piste');
  if (carte && _rechercheActive) {
    const piste = _rechercheActive.pistes[Number(carte.dataset.indice)];
    if (e.target.closest('.bouton-ecouter, .carte-pochette') && piste.type === 'song') { ecouterCarte(piste); return; }
    if (e.target.closest('.bouton-analyser')) { ouvrirAnalyseDepuisCarte(piste.url); }
  }
});

parId('resultats').addEventListener('click', async (e) => {
  if (e.target.closest('#bouton-retour') && _rechercheActive) {
    detruireLecteurPrincipal();
    parId('resultats').hidden = true;
    parId('resultats-recherche').hidden = false;
    champRecherche.value = _rechercheActive.requete;
    majLibelleLancement();
    return;
  }
  const lienArtiste = e.target.closest('[data-artiste-slug]');
  if (lienArtiste) { ouvrirPageArtiste(lienArtiste.dataset.artisteSlug); return; }
  if (gererClicPageArtiste(e)) return;

  const carte = e.target.closest('#liste-collection .carte-piste');
  if (carte && _collectionActive) {
    const piste = _collectionActive[Number(carte.dataset.indice)];
    if (e.target.closest('.bouton-ecouter, .carte-pochette')) { ecouterCarte(piste); return; }
    if (e.target.closest('.bouton-analyser')) { ouvrirAnalyseDepuisCarte(piste.url); return; }
  }
  gererCopiePressePapier(e.target.closest('.bouton-copier'));
});

let minuteurResize = null;
window.addEventListener('resize', () => { clearTimeout(minuteurResize); minuteurResize = setTimeout(genererOndesHero, 150); });
genererOndesHero();
