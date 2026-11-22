'use strict';

let _lecteurActif = null;
let _lecteurDock = null;
let _pisteDock = null;
let _chargementDock = null;
let _compteurDock = 0;
let _minuteurNotification = null;

function detruireLecteurPrincipal() {
  if (!_lecteurActif) return;
  _lecteurActif.detruire();
  _lecteurActif = null;
}

function initialiserLecteurPrincipal(donnees) {
  detruireLecteurPrincipal();
  const racine = document.querySelector('#resultats .lecteur');
  if (!racine || !donnees.track) return;
  fermerDock();
  _lecteurActif = new LecteurOnde(racine, {
    piste: donnees.track,
    artiste: donnees.artist,
  });
}

function afficherNotification(texte) {
  const zone = parId('notification');
  zone.innerHTML = `${iconeSvg('alerte', 18)}<span>${echapperHtml(texte)}</span>`;
  zone.hidden = false;
  clearTimeout(_minuteurNotification);
  _minuteurNotification = setTimeout(() => { zone.hidden = true; }, 4500);
}

function htmlDock({ titre, artiste, pochette }) {
  const image = pochette
    ? `<img class="dock-pochette" src="${echapperHtml(pochette)}" alt="" />`
    : `<span class="dock-pochette dock-pochette-vide">${iconeSvg('note', 22)}</span>`;
  return `
    <div class="dock-info">
      ${image}
      <div class="dock-texte">
        <p class="dock-titre" title="${echapperHtml(titre)}">${echapperHtml(titre)}</p>
        <p class="dock-artiste">${echapperHtml(artiste)}</p>
      </div>
    </div>
    <div class="dock-transport">
      <button type="button" class="lecteur-outil" data-role="reculer" aria-label="Rewind ${SAUT_SECONDES} seconds">${ICONES_LECTEUR.reculer}</button>
      <button type="button" class="lecteur-bouton" data-role="lecture" aria-label="Play">
        <span class="lecteur-bouton-halo" aria-hidden="true"></span>
        ${ICONES_LECTEUR.lecture}${ICONES_LECTEUR.pause}
        <span class="spinner spinner-blanc" aria-hidden="true"></span>
      </button>
      <button type="button" class="lecteur-outil" data-role="avancer" aria-label="Forward ${SAUT_SECONDES} seconds">${ICONES_LECTEUR.avancer}</button>
    </div>
    <div class="lecteur-temps">
      <span class="lecteur-temps-courant" data-role="temps-courant">0:00</span>
      <span class="lecteur-temps-total">/ <span data-role="temps-total">0:00</span></span>
      <span class="egaliseur" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    </div>
    <div class="lecteur-outils">
      <button type="button" class="lecteur-outil lecteur-vitesse" data-role="vitesse" aria-label="Playback speed: 1x">1x</button>
      <div class="lecteur-volume" data-role="zone-volume" data-niveau="haut">
        <button type="button" class="lecteur-outil" data-role="muet" aria-label="Mute">${ICONES_LECTEUR.volHaut}${ICONES_LECTEUR.volBas}${ICONES_LECTEUR.volMuet}</button>
        <input type="range" class="lecteur-curseur" data-role="volume" min="0" max="100" step="1" value="100" aria-label="Volume" />
      </div>
      <button type="button" class="lecteur-outil dock-telecharger" data-role="telecharger" aria-label="Download audio" title="Download audio">
        <span class="spinner" aria-hidden="true"></span>
        <span class="dock-telecharger-icone">${iconeSvg('telecharger', 17)}</span>
      </button>
    </div>
    <button type="button" class="lecteur-outil dock-fermer" data-role="fermer" aria-label="Close player">${iconeSvg('fermer', 18)}</button>
    <div class="lecteur-bas">
      <div class="lecteur-onde" data-role="onde" tabindex="0" role="slider" aria-label="Seek position" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" aria-valuetext="0:00">
        <canvas></canvas>
        <div class="lecteur-infobulle" data-role="infobulle" hidden>0:00</div>
      </div>
      <p class="lecteur-message" data-role="message" role="status" hidden></p>
    </div>`;
}

function synchroniserCartes() {
  const enLecture = Boolean(_lecteurDock && _lecteurDock.enLecture);
  document.querySelectorAll('.carte-piste').forEach((carte) => {
    if (carte.dataset.type === 'album' || carte.dataset.type === 'playlist') return;
    const courante = Boolean(_pisteDock && _pisteDock.url === carte.dataset.url);
    const charge = _chargementDock === carte.dataset.url;
    const joue = courante && enLecture;
    const bouton = carte.querySelector('.bouton-ecouter');
    if (!bouton) return;
    const texte = joue ? 'Pause' : courante ? 'Resume' : 'Listen';
    carte.classList.toggle('en-ecoute', courante);
    carte.classList.toggle('en-lecture', joue);
    bouton.classList.toggle('charge', charge);
    bouton.disabled = charge;
    bouton.setAttribute('aria-pressed', String(joue));
    bouton.setAttribute('aria-label', `${texte}: ${carte.querySelector('.carte-titre').textContent}`);
    bouton.querySelector('.bouton-libelle').innerHTML = `${iconeSvg(joue ? 'pause' : 'lire', 16)}${texte}`;
  });
}

function detruireLecteurDock() {
  const lecteur = _lecteurDock;
  _lecteurDock = null;
  _pisteDock = null;
  if (lecteur) lecteur.detruire();
}

function fermerDock() {
  detruireLecteurDock();
  const dock = parId('dock-lecteur');
  dock.hidden = true;
  dock.innerHTML = '';
  dock.classList.remove('en-lecture', 'attente');
  document.body.classList.remove('avec-dock');
  synchroniserCartes();
}

function ouvrirDock(donnees, pisteCarte) {
  detruireLecteurDock();
  detruireLecteurPrincipal();

  const dock = parId('dock-lecteur');
  const pochette = donnees.track.artwork_thumb || pisteCarte.pochette;
  dock.innerHTML = htmlDock({
    titre: donnees.track.title || pisteCarte.titre,
    artiste: (donnees.artist && donnees.artist.name) || donnees.track.artist_display || pisteCarte.artiste || '',
    pochette,
  });
  dock.classList.remove('en-lecture', 'attente');
  dock.hidden = false;
  document.body.classList.add('avec-dock');

  _pisteDock = { url: pisteCarte.url };
  _lecteurDock = new LecteurOnde(dock, { piste: donnees.track, artiste: donnees.artist });
  ['play', 'pause', 'ended', 'emptied'].forEach((evt) => {
    _lecteurDock.audio.addEventListener(evt, synchroniserCartes);
  });
  dock.querySelector('[data-role="fermer"]').addEventListener('click', fermerDock);
  const boutonTelecharger = dock.querySelector('[data-role="telecharger"]');
  const zoneMessage = dock.querySelector('[data-role="message"]');
  boutonTelecharger.addEventListener('click', async () => {
    boutonTelecharger.classList.add('charge');
    boutonTelecharger.disabled = true;
    zoneMessage.textContent = 'Saving audio to musiques/...';
    zoneMessage.classList.remove('erreur-lecture');
    zoneMessage.hidden = false;
    try {
      const fichier = await sauvegarderEtTelechargerPiste(donnees.track.id, donnees.track.title);
      zoneMessage.textContent = `Saved to ${fichier.chemin_relatif}`;
    } catch (e) {
      zoneMessage.textContent = `Download error: ${e.message}`;
      zoneMessage.classList.add('erreur-lecture');
      afficherNotification(e.message);
    } finally {
      boutonTelecharger.classList.remove('charge');
      boutonTelecharger.disabled = false;
    }
  });
  synchroniserCartes();
  _lecteurDock.lire();
}

async function ecouterCarte(piste) {
  if (!piste || !piste.url) return;
  if (_lecteurDock && _pisteDock && _pisteDock.url === piste.url) {
    _lecteurDock.basculerLecture();
    return;
  }
  if (_chargementDock === piste.url) return;

  const jeton = ++_compteurDock;
  _chargementDock = piste.url;
  synchroniserCartes();

  try {
    const reponse = await fetch(`./api.php?action=analyser&url=${encodeURIComponent(piste.url)}`);
    const resultat = await reponse.json();
    if (jeton !== _compteurDock) return;
    if (!resultat.success) throw new Error(resultat.error || 'Server error');
    const donnees = resultat.data;
    if (!donnees.track || !donnees.track.stream_proxy_url) {
      throw new Error('This item cannot be played directly. Click Analyze for details.');
    }
    ouvrirDock(donnees, piste);
  } catch (e) {
    if (jeton === _compteurDock) afficherNotification(e.message);
  } finally {
    if (jeton === _compteurDock) {
      _chargementDock = null;
      synchroniserCartes();
    }
  }
}
