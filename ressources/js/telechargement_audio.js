'use strict';

let _pisteTelechargement = null;

function definirPisteTelechargement(piste) {
  _pisteTelechargement = piste;
}

function declencherTelechargementNavigateur(url, nomFichier) {
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
}

async function sauvegarderEtTelechargerPiste(idPiste, titrePiste) {
  const url = `./api.php?action=sauvegarder&id=${encodeURIComponent(idPiste)}&titre=${encodeURIComponent(titrePiste || 'audiomack_track')}`;
  const reponse = await fetch(url);
  const resultat = await reponse.json();
  if (!reponse.ok || !resultat.success || !resultat.fichier) {
    throw new Error((resultat && resultat.error) || 'Unable to save audio file.');
  }
  const fichier = resultat.fichier;
  declencherTelechargementNavigateur(fichier.url_telechargement, fichier.nom_fichier);
  return fichier;
}

async function demarrerTelechargement(bouton, qualite, titrePiste) {
  bouton.classList.add('charge');
  bouton.disabled = true;

  const ligne = bouton.closest('.ligne-qualite');
  const enveloppe = ligne.querySelector('.progression-telechargement');
  const barre = enveloppe.querySelector('.progression-barre');
  const etiquette = enveloppe.querySelector('.progression-etiquette');
  const boiteErreur = ligne.querySelector('.qualite-erreur');

  enveloppe.hidden = false;
  enveloppe.classList.remove('termine', 'echec');
  boiteErreur.hidden = true;
  barre.style.width = '45%';
  etiquette.textContent = 'Saving to musiques/...';

  try {
    const fichier = await sauvegarderEtTelechargerPiste(qualite.id, titrePiste);
    barre.style.width = '100%';
    etiquette.textContent = `Saved: ${fichier.chemin_relatif}`;
    enveloppe.classList.add('termine');
    const detail = ligne.querySelector('.qualite-detail');
    if (detail) {
      detail.textContent = `${fichier.mime} · Saved in ${fichier.chemin_relatif}`;
    }
  } catch (e) {
    enveloppe.classList.add('echec');
    etiquette.textContent = 'Failed';
    boiteErreur.textContent = `Download error: ${e.message}`;
    boiteErreur.hidden = false;
  } finally {
    bouton.classList.remove('charge');
    bouton.disabled = false;
  }
}

function construireLigneQualite(qualite, titre) {
  const tailleTexte = formaterOctets(qualite.size_bytes);
  const ligne = document.createElement('div');
  const infoDestination = qualite.chemin_relatif
    ? `${qualite.mime} · ${qualite.deja_sauvegarde ? 'Saved in' : 'Saves to'} ${qualite.chemin_relatif}`
    : `${qualite.mime} · Direct Audiomack CDN stream`;

  ligne.className = 'ligne-qualite';
  ligne.innerHTML = `
    <div class="format-pastille">${echapperHtml(qualite.extension.toUpperCase())}</div>
    <div>
      <div class="qualite-titre">${echapperHtml(qualite.format)}${tailleTexte ? ` · ${tailleTexte}` : ''}</div>
      <div class="qualite-detail">${echapperHtml(infoDestination)}</div>
      <div class="puces">
        <span class="puce puce-verte">${qualite.deja_sauvegarde ? 'Saved locally' : 'Available'}</span>
        <span class="puce">Signed stream</span>
      </div>
    </div>
    <button type="button" class="bouton bouton-contour bouton-telecharger">
      <span class="spinner" aria-hidden="true"></span>
      <span class="bouton-libelle">${iconeSvg('telecharger', 16)}Download</span>
    </button>
    <div class="progression-telechargement" hidden>
      <div class="progression-fond"><div class="progression-barre"></div></div>
      <span class="progression-etiquette">0%</span>
    </div>
    <p class="qualite-erreur" hidden></p>`;

  ligne.querySelector('.bouton-telecharger').addEventListener('click', function () {
    demarrerTelechargement(this, qualite, titre);
  });
  return ligne;
}

async function chargerQualitesPiste() {
  const liste = parId('liste-qualites');
  if (!_pisteTelechargement) return;
  try {
    const url = `./api.php?action=verifier_flux&id=${encodeURIComponent(_pisteTelechargement.id)}&titre=${encodeURIComponent(_pisteTelechargement.title || '')}`;
    const reponse = await fetch(url);
    const resultat = await reponse.json();
    parId('chargement-qualites')?.remove();
    if (!resultat.success || !Array.isArray(resultat.qualites) || !resultat.qualites.length) {
      liste.innerHTML = '<p class="qualite-erreur">No downloadable audio stream found for this track.</p>';
      return;
    }
    resultat.qualites.forEach((q) => liste.appendChild(construireLigneQualite(q, _pisteTelechargement.title)));
  } catch (e) {
    parId('chargement-qualites')?.remove();
    liste.innerHTML = `<p class="qualite-erreur">Error: ${echapperHtml(e.message)}</p>`;
  }
}

function initialiserBasculeTelechargement() {
  const bouton = parId('bouton-bascule');
  const panneau = parId('panneau-qualites');
  if (!bouton || !panneau) return;
  let charge = false;

  bouton.addEventListener('click', async () => {
    const ouvert = panneau.classList.toggle('ouvert');
    bouton.setAttribute('aria-expanded', String(ouvert));
    bouton.innerHTML = ouvert
      ? `${iconeSvg('haut')}Hide download options`
      : `${iconeSvg('telecharger')}Download audio`;
    if (ouvert && !charge) {
      charge = true;
      await chargerQualitesPiste();
    }
  });
}
