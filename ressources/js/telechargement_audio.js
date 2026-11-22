'use strict';

let _pisteTelechargement = null;

function definirPisteTelechargement(piste) {
  _pisteTelechargement = piste;
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
  barre.style.width = '0%';
  etiquette.textContent = 'Preparing...';

  try {
    const url = `${qualite.proxy_url}&titre=${encodeURIComponent(titrePiste || 'audiomack_track')}`;
    const reponse = await fetch(url);
    if (!reponse.ok) throw new Error('Unable to download audio stream');

    const total = Number(reponse.headers.get('Content-Length') || qualite.size_bytes || 0);
    const lecteur = reponse.body ? reponse.body.getReader() : null;
    const morceaux = [];
    let recu = 0;

    if (lecteur) {
      while (true) {
        const { done, value } = await lecteur.read();
        if (done) break;
        morceaux.push(value);
        recu += value.byteLength;
        if (total > 0) {
          const pct = Math.min(100, Math.round((recu / total) * 100));
          barre.style.width = `${pct}%`;
          etiquette.textContent = `${pct}% · ${formaterOctets(recu) || ''}`;
        } else {
          barre.style.width = '60%';
          etiquette.textContent = formaterOctets(recu) || 'Downloading...';
        }
      }
    } else {
      morceaux.push(await reponse.arrayBuffer());
    }

    const blob = new Blob(morceaux, { type: qualite.mime || 'audio/mp4' });
    const urlBlob = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = urlBlob;
    lien.download = `${(titrePiste || 'audiomack_track').replace(/[^a-z0-9 \-_]/gi, '_')}.${qualite.extension || 'm4a'}`;
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    setTimeout(() => URL.revokeObjectURL(urlBlob), 5000);

    barre.style.width = '100%';
    etiquette.textContent = 'Saved';
    enveloppe.classList.add('termine');
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
  ligne.className = 'ligne-qualite';
  ligne.innerHTML = `
    <div class="format-pastille">${echapperHtml(qualite.extension.toUpperCase())}</div>
    <div>
      <div class="qualite-titre">${echapperHtml(qualite.format)}${tailleTexte ? ` · ${tailleTexte}` : ''}</div>
      <div class="qualite-detail">${echapperHtml(qualite.mime)} · Direct Audiomack CDN stream</div>
      <div class="puces">
        <span class="puce puce-verte">Available</span>
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
    const reponse = await fetch(`./api.php?action=verifier_flux&id=${encodeURIComponent(_pisteTelechargement.id)}`);
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
