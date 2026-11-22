'use strict';

function construireNumerosPages(pageActuelle, aSuivant) {
  const pages = [];
  const debut = Math.max(1, pageActuelle - 2);
  const fin = aSuivant ? Math.max(pageActuelle + 2, 3) : pageActuelle;

  if (debut > 1) {
    pages.push(1);
    if (debut > 2) pages.push('...');
  }
  for (let p = debut; p <= fin; p += 1) {
    pages.push(p);
  }
  return pages;
}

function htmlArtisteVerifieRecherche(artiste) {
  if (!artiste || !artiste.url_slug) return '';
  const avatar = artiste.avatar_url
    ? `<img class="avatar" src="${echapperHtml(artiste.avatar_url)}" alt="" />`
    : '<span class="avatar"></span>';
  return `<div class="recherche-artiste-vedette">
    ${avatar}
    <div class="artiste-identite">
      <div class="artiste-nom">${echapperHtml(artiste.name)}${artiste.verified ? ICONE_VERIFIE : ''}</div>
      <div class="artiste-pseudo">@${echapperHtml(artiste.url_slug)} · ${formaterNombre(artiste.followers_count)} followers</div>
    </div>
    <button type="button" class="bouton bouton-secondaire bouton-profil-artiste" data-artiste-slug="${echapperHtml(artiste.url_slug)}">${iconeSvg('utilisateur', 16)}View artist page</button>
  </div>`;
}

function htmlFiltresRecherche(show, sort) {
  const filtres = [
    ['music', 'All Music'],
    ['songs', 'Songs'],
    ['albums', 'Albums'],
  ];
  const tris = [
    ['popular', 'Most Popular'],
    ['recent', 'Most Recent'],
  ];

  const htmlTypes = filtres.map(([cle, libelle]) => (
    `<button type="button" class="filtre-pilule${show === cle ? ' actif' : ''}" data-show="${cle}">${libelle}</button>`
  )).join('');

  const htmlTris = tris.map(([cle, libelle]) => (
    `<button type="button" class="filtre-pilule${sort === cle ? ' actif' : ''}" data-sort="${cle}">${libelle}</button>`
  )).join('');

  return `<div class="recherche-filtres">
    <div class="recherche-groupe-filtres" role="group" aria-label="Result type">${htmlTypes}</div>
    <div class="recherche-groupe-filtres" role="group" aria-label="Sort order">${htmlTris}</div>
  </div>`;
}

function htmlBarrePagination(page, precedent, suivant) {
  if (page <= 1 && !suivant) return '';
  const numeros = construireNumerosPages(page, suivant);

  const htmlNumeros = numeros.map((item) => {
    if (item === '...') return '<span class="pagination-points" aria-hidden="true">...</span>';
    const actif = item === page;
    return `<button type="button" class="pagination-page${actif ? ' actif' : ''}" data-page="${item}"${actif ? ' aria-current="page"' : ''}>${item}</button>`;
  }).join('');

  return `<nav class="pagination-recherche" aria-label="Search results pagination">
    <button type="button" class="bouton bouton-secondaire pagination-nav" data-page="${page - 1}" ${precedent ? '' : 'disabled'}>
      ${iconeSvg('gauche', 16)}<span>Previous</span>
    </button>
    <div class="pagination-numeros">${htmlNumeros}</div>
    <button type="button" class="bouton bouton-secondaire pagination-nav" data-page="${page + 1}" ${suivant ? '' : 'disabled'}>
      <span>Next</span>${iconeSvg('droite', 16)}
    </button>
  </nav>`;
}

function htmlResultatsRecherche(etat) {
  const { requete, pistes, page, precedent, suivant, show, sort, artiste_verifie: artisteVerifie } = etat;
  const entete = `<div class="recherche-entete">
    <div class="recherche-titre-bloc">
      <h2 class="rubrique-titre">Results for "${echapperHtml(requete)}"</h2>
      <span class="puce">Page ${page}</span>
    </div>
    ${htmlFiltresRecherche(show, sort)}
  </div>`;

  const blocArtiste = page === 1 ? htmlArtisteVerifieRecherche(artisteVerifie) : '';
  const contenu = pistes.length
    ? `<ul class="liste-pistes" id="liste-pistes">${pistes.map(htmlCartePiste).join('')}</ul>
       ${htmlBarrePagination(page, precedent, suivant)}`
    : `<div class="vide">No results found on page ${page} for "${echapperHtml(requete)}".</div>
       ${page > 1 ? htmlBarrePagination(page, precedent, false) : ''}`;

  return `<div>${entete}${blocArtiste}${contenu}</div>`;
}

function gererClicPaginationRecherche(e) {
  if (!_rechercheActive) return false;

  const btnPage = e.target.closest('[data-page]');
  if (btnPage && !btnPage.disabled) {
    const cible = Number(btnPage.dataset.page);
    if (Number.isInteger(cible) && cible >= 1 && cible !== _rechercheActive.page) {
      rechercherTitres(_rechercheActive.requete, cible, _rechercheActive.show, _rechercheActive.sort);
    }
    return true;
  }

  const btnShow = e.target.closest('[data-show]');
  if (btnShow) {
    const nouveauShow = btnShow.dataset.show;
    if (nouveauShow !== _rechercheActive.show) {
      rechercherTitres(_rechercheActive.requete, 1, nouveauShow, _rechercheActive.sort);
    }
    return true;
  }

  const btnSort = e.target.closest('[data-sort]');
  if (btnSort) {
    const nouveauSort = btnSort.dataset.sort;
    if (nouveauSort !== _rechercheActive.sort) {
      rechercherTitres(_rechercheActive.requete, 1, _rechercheActive.show, nouveauSort);
    }
    return true;
  }

  return false;
}
