'use strict';

const VITESSES_LECTURE = [1, 1.25, 1.5, 2, 0.75];
const SAUT_SECONDES = 10;
const PAS_CLAVIER = 5;
const CLE_VOLUME = 'am_scraper_volume';
const RVB_ROUGE = '225, 29, 46';

const CHEMIN_REPLAY = 'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z';
const TEXTE_SAUT = '<text x="12" y="16" text-anchor="middle" font-size="7.5" font-weight="700" font-family="system-ui, sans-serif">10</text>';
const CORPS_HP = '<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/>';

const ICONES_LECTEUR = {
  lecture: '<svg class="icone-lecture" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause: '<svg class="icone-pause" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.2" y="4.8" width="4.2" height="14.4" rx="1.6"/><rect x="13.6" y="4.8" width="4.2" height="14.4" rx="1.6"/></svg>',
  reculer: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${CHEMIN_REPLAY}"/>${TEXTE_SAUT}</svg>`,
  avancer: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><g transform="translate(24 0) scale(-1 1)"><path d="${CHEMIN_REPLAY}"/></g>${TEXTE_SAUT}</svg>`,
  volHaut: `<svg class="vol-haut" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">${CORPS_HP}<path d="M15.5 9.2a4.2 4.2 0 0 1 0 5.6M18.2 6.6a8 8 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  volBas: `<svg class="vol-bas" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">${CORPS_HP}<path d="M15.5 9.2a4.2 4.2 0 0 1 0 5.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  volMuet: `<svg class="vol-muet" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">${CORPS_HP}<path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
};

function htmlLecteur() {
  return `<section class="lecteur" aria-label="Audio player">
    <div class="lecteur-lecture">
      <button type="button" class="lecteur-bouton" data-role="lecture" aria-label="Play">
        <span class="lecteur-bouton-halo" aria-hidden="true"></span>
        ${ICONES_LECTEUR.lecture}${ICONES_LECTEUR.pause}
        <span class="spinner spinner-blanc" aria-hidden="true"></span>
      </button>
    </div>
    <div class="lecteur-temps">
      <span class="lecteur-temps-courant" data-role="temps-courant">0:00</span>
      <span class="lecteur-temps-total">/ <span data-role="temps-total">0:00</span></span>
      <span class="egaliseur" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    </div>
    <div class="lecteur-outils">
      <button type="button" class="lecteur-outil" data-role="reculer" aria-label="Rewind ${SAUT_SECONDES} seconds">${ICONES_LECTEUR.reculer}</button>
      <button type="button" class="lecteur-outil" data-role="avancer" aria-label="Forward ${SAUT_SECONDES} seconds">${ICONES_LECTEUR.avancer}</button>
      <button type="button" class="lecteur-outil lecteur-vitesse" data-role="vitesse" aria-label="Playback speed: 1x">1x</button>
      <div class="lecteur-volume" data-role="zone-volume" data-niveau="haut">
        <button type="button" class="lecteur-outil" data-role="muet" aria-label="Mute">${ICONES_LECTEUR.volHaut}${ICONES_LECTEUR.volBas}${ICONES_LECTEUR.volMuet}</button>
        <input type="range" class="lecteur-curseur" data-role="volume" min="0" max="100" step="1" value="100" aria-label="Volume" />
      </div>
    </div>
    <div class="lecteur-bas">
      <div class="lecteur-onde" data-role="onde" tabindex="0" role="slider" aria-label="Seek position" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" aria-valuetext="0:00">
        <canvas></canvas>
        <div class="lecteur-infobulle" data-role="infobulle" hidden>0:00</div>
      </div>
      <p class="lecteur-message" data-role="message" role="status" hidden></p>
    </div>
  </section>`;
}

function genererOndeSubstitution(graine, nombre = 160) {
  const aleatoire = generateurAleatoire(graine);
  const phases = [aleatoire() * 6.28, aleatoire() * 6.28];
  const echantillons = [];
  for (let i = 0; i < nombre; i += 1) {
    const t = i / nombre;
    const env = 0.45 + 0.35 * Math.abs(Math.sin(t * 5.1 + phases[0])) + 0.2 * Math.abs(Math.sin(t * 13 + phases[1]));
    echantillons.push(bornerValeur(env * (0.55 + 0.45 * aleatoire()), 0.08, 1));
  }
  return echantillons;
}

class DessinOnde {
  constructor(canvas, echantillons, mouvementReduit) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.echantillons = echantillons;
    this.mouvementReduit = mouvementReduit;
    this.largeur = 0;
    this.hauteur = 0;
    this.dpr = 1;
    this.nbBarres = 0;
    this.pas = 5;
    this.largeurBarre = 3;
    this.barres = new Float32Array(0);
    this.affichage = new Float32Array(0);
    this.bosse = new Float32Array(0);
    this.debutIntro = performance.now();
    this.degradeLu = '#e11d2e';
    this.couleurs = { reste: '#e1e1e9', memoire: '#cdcdd8', rouge: '#e11d2e', rougeClair: '#f4606c' };
  }

  recalculerBarres() {
    const nb = this.nbBarres;
    if (!nb) return;
    const source = this.echantillons;
    const total = source.length;
    const barres = new Float32Array(nb);
    let plafond = 0;
    for (let i = 0; i < nb; i += 1) {
      const debut = Math.floor((i * total) / nb);
      const fin = Math.max(debut + 1, Math.floor(((i + 1) * total) / nb));
      let max = 0;
      let somme = 0;
      for (let j = debut; j < fin; j += 1) {
        if (source[j] > max) max = source[j];
        somme += source[j];
      }
      barres[i] = 0.55 * max + (0.45 * somme) / (fin - debut);
      if (barres[i] > plafond) plafond = barres[i];
    }
    for (let i = 0; i < nb; i += 1) {
      barres[i] = Math.max(0.06, Math.pow(barres[i] / (plafond || 1), 0.85));
    }
    this.barres = barres;
    if (this.affichage.length !== nb) {
      this.affichage = Float32Array.from(barres);
      this.bosse = new Float32Array(nb);
    }
  }

  redimensionner(rect) {
    const largeur = Math.floor(rect.width);
    const hauteur = Math.floor(rect.height);
    if (!largeur || !hauteur) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (largeur === this.largeur && hauteur === this.hauteur && dpr === this.dpr) return false;
    this.largeur = largeur;
    this.hauteur = hauteur;
    this.dpr = dpr;
    this.canvas.width = Math.round(largeur * dpr);
    this.canvas.height = Math.round(hauteur * dpr);
    const nb = Math.max(20, Math.floor(largeur / (largeur < 480 ? 4 : 5)));
    this.nbBarres = nb;
    this.pas = largeur / nb;
    this.largeurBarre = this.pas * 0.6;
    const degrade = this.ctx.createLinearGradient(0, 0, 0, hauteur);
    degrade.addColorStop(0, this.couleurs.rougeClair);
    degrade.addColorStop(0.5, this.couleurs.rouge);
    degrade.addColorStop(1, this.couleurs.rougeClair);
    this.degradeLu = degrade;
    this.recalculerBarres();
    return true;
  }

  mettreAJourAnimation(maintenant, etat) {
    let stable = true;
    const xLecture = etat.ratio * this.largeur;
    for (let i = 0; i < this.nbBarres; i += 1) {
      const centre = (i + 0.5) * this.pas;
      let cible = 0;
      if (etat.survol) {
        const d = (centre - etat.xSurvol) / 70;
        cible += 0.34 * Math.exp(-d * d);
      }
      if (etat.enLecture) {
        const d = (centre - xLecture) / 38;
        cible += 0.14 * Math.exp(-d * d);
      }
      const ecart = cible - this.bosse[i];
      this.bosse[i] = this.mouvementReduit ? cible : this.bosse[i] + ecart * 0.22;
      this.affichage[i] = this.barres[i];
      if (Math.abs(ecart) > 0.004) stable = false;
    }
    const introEnCours = !this.mouvementReduit && (maintenant - this.debutIntro) < (this.nbBarres * 5 + 550);
    return !stable || etat.enLecture || etat.glisse || introEnCours;
  }

  dessiner(maintenant, etat) {
    const { ctx, largeur, hauteur, nbBarres: nb } = this;
    if (!largeur || !nb) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, largeur, hauteur);

    const xLecture = etat.ratio * largeur;
    const xSurvol = etat.survol ? etat.xSurvol : -1;
    const xMemoire = etat.ratioMemoire * largeur;
    const centreY = hauteur / 2;
    const chemins = { lu: new Path2D(), apercu: new Path2D(), memoire: new Path2D(), reste: new Path2D() };
    const hMax = hauteur * 0.94;

    for (let i = 0; i < nb; i += 1) {
      const xIntro = this.mouvementReduit ? 1 : bornerValeur((maintenant - this.debutIntro - i * 5) / 550, 0, 1);
      const app = 1 - Math.pow(1 - xIntro, 3);
      const hh = Math.max(4 * app, Math.min(hMax, this.affichage[i] * (1 + this.bosse[i]) * hMax) * app);
      const x = i * this.pas + (this.pas - this.largeurBarre) / 2;
      const centre = x + this.largeurBarre / 2;
      const c = centre <= xLecture ? chemins.lu : centre <= xSurvol ? chemins.apercu : centre <= xMemoire ? chemins.memoire : chemins.reste;
      if (c.roundRect) c.roundRect(x, centreY - hh / 2, this.largeurBarre, hh, this.largeurBarre / 2);
      else c.rect(x, centreY - hh / 2, this.largeurBarre, hh);
    }
    ctx.fillStyle = this.couleurs.reste; ctx.fill(chemins.reste);
    ctx.fillStyle = this.couleurs.memoire; ctx.fill(chemins.memoire);
    ctx.fillStyle = `rgba(${RVB_ROUGE}, .34)`; ctx.fill(chemins.apercu);
    ctx.fillStyle = this.degradeLu; ctx.fill(chemins.lu);

    if ((etat.ratio > 0.001 && etat.ratio < 0.999) || etat.glisse) {
      ctx.fillStyle = this.couleurs.rouge;
      ctx.fillRect(xLecture - 1, hauteur * 0.04, 2, hauteur * 0.92);
    }
  }
}
