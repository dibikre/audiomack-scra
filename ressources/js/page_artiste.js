'use strict';

let _etatPageArtiste = null;

function afficherPageArtiste(donnees) {
  const zone = parId('resultats');
  const artiste = donnees.artist;
  const sections = donnees.artist_sections || {};
  const onglets = construireOngletsArtiste(sections);
  const premierOnglet = (onglets.find((o) => o.compte > 0) || onglets[0] || { cle: 'pistes' }).cle;

  _etatPageArtiste = {
    artiste,
    sections,
    ongletActif: premierOnglet,
    pages: { [premierOnglet]: 1 },
  };

  const boutonRetour = _rechercheActive
    ? `<button type="button" class="bouton bouton-retour" id="bouton-retour">${iconeSvg('gauche', 16)}Back to results</button>`
    : '';

  const epingles = sections.epingles || [];
  const blocEpingles = epingles.length
    ? `<section class="artiste-section-epingles">
         <h3 class="artiste-sous-titre">Pinned Releases</h3>
         <ul class="liste-pistes" data-source="epingles">${epingles.map((item, i) => htmlCartePiste(item, i)).join('')}</ul>
       </section>`
    : '';

  const barreOnglets = onglets.map((o) => {
    const actif = o.cle === premierOnglet ? ' actif' : '';
    const sel = o.cle === premierOnglet ? 'true' : 'false';
    return `<button type="button" role="tab" aria-selected="${sel}" class="onglet-artiste${actif}" data-onglet="${echapperHtml(o.cle)}">${echapperHtml(o.libelle)}<span class="onglet-compte">${o.compte}</span></button>`;
  }).join('');

  zone.innerHTML = `${boutonRetour}
    ${construireEntetePageArtiste(artiste)}
    ${blocEpingles}
    <section class="artiste-explorateur">
      <div class="barre-onglets-artiste" role="tablist" aria-label="Artist catalog">${barreOnglets}</div>
      <div id="contenu-onglet-artiste">${renduContenuOngletArtiste(sections, premierOnglet)}</div>
    </section>`;

  zone.hidden = false;
  parId('page').classList.add('a-des-resultats');
  synchroniserCartes();
}

async function ouvrirPageArtiste(slug) {
  if (!slug) return;
  afficherChargement('Loading artist profile...');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  try {
    const reponse = await fetch(`./api.php?action=artiste&slug=${encodeURIComponent(slug)}`);
    const resultat = await reponse.json();
    if (!resultat.success) throw new Error(resultat.error || 'Unable to load artist page.');
    terminerProgression(true);
    masquerStatut();
    definirLancement(false);
    champRecherche.value = `https://audiomack.com/${slug}`;
    majLibelleLancement();
    afficherPageArtiste(resultat.data);
  } catch (erreur) {
    afficherErreur(erreur.message);
  }
}

async function chargerSuiteOngletArtiste(bouton) {
  if (!_etatPageArtiste) return;
  const onglet = bouton.dataset.onglet;
  const pageSuivante = (_etatPageArtiste.pages[onglet] || 1) + 1;
  bouton.disabled = true;
  bouton.textContent = 'Loading...';
  try {
    const { artiste, sections } = _etatPageArtiste;
    const url = `./api.php?action=contenu_artiste&slug=${encodeURIComponent(artiste.url_slug)}&id=${encodeURIComponent(artiste.id)}&onglet=${encodeURIComponent(onglet)}&page=${pageSuivante}`;
    const reponse = await fetch(url);
    const resultat = await reponse.json();
    if (!resultat.success) throw new Error(resultat.error || 'Failed to load items.');
    const liste = sections[onglet] || [];
    const depart = liste.length;
    liste.push(...(resultat.items || []));
    sections[onglet] = liste;
    sections.suite[onglet] = Boolean(resultat.suivant);
    _etatPageArtiste.pages[onglet] = pageSuivante;

    const ul = document.querySelector(`#contenu-onglet-artiste .liste-pistes[data-source="${onglet}"]`);
    if (ul && resultat.items) {
      ul.insertAdjacentHTML('beforeend', resultat.items.map((item, i) => htmlCartePiste(item, depart + i)).join(''));
      synchroniserCartes();
    }
    if (resultat.suivant) {
      bouton.disabled = false;
      bouton.textContent = 'Load more';
    } else {
      bouton.closest('.recherche-pied').remove();
    }
  } catch (_) {
    bouton.disabled = false;
    bouton.textContent = 'Retry';
  }
}

function obtenirPisteDepuisSourceArtiste(source, indice) {
  if (!_etatPageArtiste) return null;
  const { sections } = _etatPageArtiste;
  if (source === 'soutiens_autres') {
    const soutien = (sections.soutiens_autres || [])[indice];
    return soutien ? soutien.media : null;
  }
  return (sections[source] || [])[indice] || null;
}

function gererClicPageArtiste(e) {
  if (!_etatPageArtiste) return false;
  const ongletBtn = e.target.closest('.onglet-artiste');
  if (ongletBtn) {
    const onglet = ongletBtn.dataset.onglet;
    _etatPageArtiste.ongletActif = onglet;
    if (!_etatPageArtiste.pages[onglet]) _etatPageArtiste.pages[onglet] = 1;
    document.querySelectorAll('.onglet-artiste').forEach((b) => {
      const actif = b.dataset.onglet === onglet;
      b.classList.toggle('actif', actif);
      b.setAttribute('aria-selected', actif ? 'true' : 'false');
    });
    parId('contenu-onglet-artiste').innerHTML = renduContenuOngletArtiste(_etatPageArtiste.sections, onglet);
    synchroniserCartes();
    return true;
  }

  const boutonPlus = e.target.closest('#bouton-plus-artiste');
  if (boutonPlus) { chargerSuiteOngletArtiste(boutonPlus); return true; }

  const listeSource = e.target.closest('.liste-pistes[data-source]');
  const carte = e.target.closest('.carte-piste');
  if (listeSource && carte) {
    const media = obtenirPisteDepuisSourceArtiste(listeSource.dataset.source, Number(carte.dataset.indice));
    if (!media) return false;
    if (e.target.closest('.bouton-ecouter, .carte-pochette') && media.type === 'song') {
      ecouterCarte(media);
      return true;
    }
    if (e.target.closest('.bouton-analyser')) {
      ouvrirAnalyseDepuisCarte(media.url);
      return true;
    }
  }
  return false;
}
