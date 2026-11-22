'use strict';

const parId = (id) => document.getElementById(id);
const formaterNombre = (n) => (n == null ? '-' : Number(n).toLocaleString('en-US'));
const echapperHtml = (s) => (
  s == null ? '' : String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
);
const couperTexte = (texte, max) => (texte.length > max ? texte.slice(0, max).trimEnd() + '...' : texte);
const estUrlHttp = (u) => /^https?:\/\//i.test(u || '');
const bornerValeur = (valeur, min, max) => Math.min(max, Math.max(min, valeur));

function formaterDateAnglaise(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? String(iso)
    : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formaterTemps(secondes) {
  if (!Number.isFinite(secondes) || secondes < 0) secondes = 0;
  const total = Math.floor(secondes);
  const heures = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const reste = String(total % 60).padStart(2, '0');
  return heures > 0 ? `${heures}:${String(minutes).padStart(2, '0')}:${reste}` : `${minutes}:${reste}`;
}

function formaterOctets(octets) {
  if (!Number.isFinite(octets) || octets <= 0) return null;
  const mb = octets / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

const CHEMINS_ICONES = {
  telecharger: '<path d="M10 3v9.5M6 9l4 4 4-4M4 16h12"/>',
  haut: '<path d="M5 12l5-5 5 5"/>',
  externe: '<path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3M11 4h5v5M16 4l-7 7"/>',
  copier: '<rect x="7" y="7" width="9" height="9" rx="2"/><path d="M13 7V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2"/>',
  alerte: '<circle cx="10" cy="10" r="8"/><path d="M10 6v5M10 13.8v.2"/>',
  note: '<path d="M8 15V5l8-2v10"/><circle cx="6" cy="15" r="2.2"/><circle cx="14" cy="13" r="2.2"/>',
  loupe: '<circle cx="9" cy="9" r="5.5"/><path d="M13.5 13.5L17 17"/>',
  gauche: '<path d="M12 5l-5 5 5 5"/>',
  lire: '<path d="M6.5 4.5v11l9-5.5z" fill="currentColor"/>',
  pause: '<path d="M7 4.5v11M13 4.5v11" stroke-width="2.6"/>',
  fermer: '<path d="M5 5l10 10M15 5L5 15"/>',
  utilisateur: '<circle cx="10" cy="6.5" r="3"/><path d="M4.5 16.5a5.5 5.5 0 0 1 11 0"/>',
};

const iconeSvg = (nom, taille = 18) => (
  `<svg width="${taille}" height="${taille}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CHEMINS_ICONES[nom]}</svg>`
);

const ICONE_VERIFIE = '<svg width="20" height="20" viewBox="0 0 20 20" role="img"><title>Verified account</title><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M5.8 10.4l2.8 2.8 5.6-6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function ligneDetail(cle, valeur, estLien = false, copiable = false) {
  if (valeur == null || valeur === '') return '';
  const texte = String(valeur);
  const affichage = estLien && estUrlHttp(texte)
    ? `<a href="${echapperHtml(texte)}" target="_blank" rel="noopener">${echapperHtml(texte)}</a>`
    : echapperHtml(texte);
  const boutonCopie = copiable
    ? `<button type="button" class="bouton-copier" data-copie="${echapperHtml(texte)}">${iconeSvg('copier', 14)}<span>Copy</span></button>`
    : '';
  return `<div class="detail"><dt class="detail-cle">${echapperHtml(cle)}</dt><dd class="detail-valeur">${affichage}</dd>${boutonCopie}</div>`;
}

const htmlStatistique = (libelle, valeur) => `<div class="stat"><dt>${libelle}</dt><dd>${valeur}</dd></div>`;

function generateurAleatoire(graine) {
  return function () {
    graine |= 0;
    graine = (graine + 0x6D2B79F5) | 0;
    let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let pourcentageOndes = 0;
let ondesAnimees = false;

function mettreAJourOndes(pourcentage) {
  pourcentageOndes = pourcentage;
  const barres = parId('ondes').children;
  const limite = Math.round((barres.length * pourcentage) / 100);
  for (let i = 0; i < barres.length; i += 1) {
    barres[i].classList.toggle('active', i < limite);
  }
}

function genererOndesHero() {
  const conteneur = parId('ondes');
  const nombre = Math.max(24, Math.floor(conteneur.clientWidth / 9));
  if (nombre === conteneur.children.length) return;
  const aleatoire = generateurAleatoire(2718);
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < nombre; i += 1) {
    const hauteur = Math.min(
      100,
      16 + 84 * Math.abs(0.55 * Math.sin(i * 0.23) + 0.32 * Math.sin(i * 0.071 + 1.3)) * (0.4 + 0.6 * aleatoire())
    );
    const barre = document.createElement('span');
    barre.className = 'onde';
    barre.style.setProperty('--h', `${hauteur.toFixed(1)}%`);
    if (ondesAnimees) barre.style.animation = 'none';
    else barre.style.animationDelay = `${Math.round((i / nombre) * 900)}ms`;
    fragment.appendChild(barre);
  }
  conteneur.replaceChildren(fragment);
  ondesAnimees = true;
  mettreAJourOndes(pourcentageOndes);
}

async function gererCopiePressePapier(bouton) {
  if (!bouton) return;
  try { await navigator.clipboard.writeText(bouton.dataset.copie || ''); } catch (_) { return; }
  const libelle = bouton.querySelector('span');
  const original = libelle.textContent;
  bouton.classList.add('copie');
  libelle.textContent = 'Copied';
  setTimeout(() => { bouton.classList.remove('copie'); libelle.textContent = original; }, 1500);
}
