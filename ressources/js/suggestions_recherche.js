'use strict';

function initialiserSuggestions(champRecherche, surChoix, surSaisieUrl) {
  const listeSuggestions = parId('liste-suggestions');
  const cacheSuggestions = new Map();
  let suggestionsCourantes = [];
  let indiceSuggestion = -1;
  let minuteurSuggestions = null;
  let controleurSuggestions = null;

  function fermerSuggestions() {
    clearTimeout(minuteurSuggestions);
    if (controleurSuggestions) controleurSuggestions.abort();
    suggestionsCourantes = [];
    indiceSuggestion = -1;
    listeSuggestions.hidden = true;
    listeSuggestions.innerHTML = '';
    champRecherche.setAttribute('aria-expanded', 'false');
  }

  function activerSuggestion(indice) {
    indiceSuggestion = indice;
    listeSuggestions.querySelectorAll('.suggestion').forEach((el, i) => {
      el.classList.toggle('actif', i === indice);
      el.setAttribute('aria-selected', String(i === indice));
    });
  }

  function afficherSuggestions(liste, saisie) {
    if (!liste.length) { fermerSuggestions(); return; }
    suggestionsCourantes = liste;
    indiceSuggestion = -1;
    const debut = saisie.toLowerCase();
    listeSuggestions.innerHTML = liste.map((texte, i) => {
      const corps = texte.toLowerCase().startsWith(debut)
        ? `<span class="suggestion-saisie">${echapperHtml(texte.slice(0, saisie.length))}</span><strong>${echapperHtml(texte.slice(saisie.length))}</strong>`
        : `<strong>${echapperHtml(texte)}</strong>`;
      return `<li class="suggestion" id="suggestion-${i}" role="option" aria-selected="false" data-indice="${i}">${iconeSvg('loupe')}<span>${corps}</span></li>`;
    }).join('');
    listeSuggestions.hidden = false;
    champRecherche.setAttribute('aria-expanded', 'true');
  }

  async function chargerSuggestions(saisie) {
    const cle = saisie.toLowerCase();
    if (cacheSuggestions.has(cle)) {
      afficherSuggestions(cacheSuggestions.get(cle), saisie);
      return;
    }
    controleurSuggestions = new AbortController();
    try {
      const reponse = await fetch(`./api.php?action=suggestions&q=${encodeURIComponent(saisie)}`, {
        signal: controleurSuggestions.signal,
      });
      const resultat = await reponse.json();
      if (!resultat.success) return;
      cacheSuggestions.set(cle, resultat.suggestions || []);
      if (champRecherche.value.trim() === saisie) {
        afficherSuggestions(resultat.suggestions || [], saisie);
      }
    } catch (_) {}
  }

  function choisir(texte) {
    champRecherche.value = texte;
    fermerSuggestions();
    surChoix(texte);
  }

  champRecherche.addEventListener('input', () => {
    clearTimeout(minuteurSuggestions);
    if (controleurSuggestions) controleurSuggestions.abort();
    const saisie = champRecherche.value.trim();
    if (saisie.length < 2 || surSaisieUrl(saisie)) {
      fermerSuggestions();
      return;
    }
    minuteurSuggestions = setTimeout(() => chargerSuggestions(saisie), 220);
  });

  champRecherche.addEventListener('keydown', (e) => {
    const n = suggestionsCourantes.length;
    const ouvert = !listeSuggestions.hidden && n > 0;
    if (e.key === 'ArrowDown' && ouvert) { e.preventDefault(); activerSuggestion((indiceSuggestion + 1) % n); }
    else if (e.key === 'ArrowUp' && ouvert) { e.preventDefault(); activerSuggestion((indiceSuggestion - 1 + n) % n); }
    else if (e.key === 'Escape') fermerSuggestions();
    else if (e.key === 'Enter' && ouvert && indiceSuggestion >= 0) {
      e.preventDefault();
      choisir(suggestionsCourantes[indiceSuggestion]);
    }
  });

  listeSuggestions.addEventListener('mousedown', (e) => e.preventDefault());
  listeSuggestions.addEventListener('click', (e) => {
    const el = e.target.closest('.suggestion');
    if (el) choisir(suggestionsCourantes[Number(el.dataset.indice)]);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.recherche-zone')) fermerSuggestions();
  });

  return { fermerSuggestions };
}
