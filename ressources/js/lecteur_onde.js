'use strict';

class LecteurOnde {
  constructor(racine, { piste, artiste }) {
    this.racine = racine;
    this.piste = piste;
    this.artiste = artiste;
    this.dureePiste = Number(piste.duration_s) || 0;
    const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const el = (nom) => racine.querySelector(`[data-role="${nom}"]`);
    this.boutonLecture = el('lecture');
    this.tempsCourant = el('temps-courant');
    this.tempsTotal = el('temps-total');
    this.boutonReculer = el('reculer');
    this.boutonAvancer = el('avancer');
    this.boutonVitesse = el('vitesse');
    this.boutonMuet = el('muet');
    this.zoneVolume = el('zone-volume');
    this.curseurVolume = el('volume');
    this.zoneOnde = el('onde');
    this.infobulle = el('infobulle');
    this.zoneMessage = el('message');

    const ondeReelle = Array.isArray(piste.waveform) && piste.waveform.length >= 10 ? piste.waveform : null;
    const echantillons = ondeReelle || genererOndeSubstitution(Number(piste.id) % 100000 || 2718);
    this.dessin = new DessinOnde(this.zoneOnde.querySelector('canvas'), echantillons, mouvementReduit);

    this.audio = new Audio();
    this.audio.preload = 'metadata';
    try {
      const vol = parseFloat(localStorage.getItem(CLE_VOLUME));
      if (Number.isFinite(vol)) this.audio.volume = bornerValeur(vol, 0, 1);
    } catch (_) {}

    this.sourcePrete = false;
    this.promesseSource = null;
    this.lectureDemandee = false;
    this.enAttente = false;
    this.termine = false;
    this.positionEnAttente = null;
    this.detruit = false;
    this.glisse = false;
    this.positionGlisse = 0;
    this.survol = false;
    this.xSurvol = 0;
    this.ratioMemoire = 0;
    this.secondeAffichee = -1;
    this.imageDemandee = 0;

    this.lierEvenements();
    this.configurerSessionMedia();
    this.observateur = new ResizeObserver(() => this.redimensionner());
    this.observateur.observe(this.zoneOnde);

    this.majTempsTotal();
    this.majVolume();
    this.majVitesse();
    this.majEtat();
  }

  get enLecture() { return !this.audio.paused && !this.audio.ended; }
  get duree() {
    const flux = this.audio.duration;
    return Number.isFinite(flux) && flux > 0 ? flux : (this.dureePiste || 0);
  }
  positionCourante() { return this.sourcePrete ? this.audio.currentTime : (this.positionEnAttente || 0); }
  ratioAffiche() {
    if (this.glisse) return this.positionGlisse;
    const duree = this.duree;
    if (!duree) return 0;
    return this.termine ? 1 : bornerValeur(this.positionCourante() / duree, 0, 1);
  }

  preparerSource() {
    if (this.sourcePrete) return Promise.resolve();
    if (!this.promesseSource) {
      this.promesseSource = new Promise((resoudre, rejeter) => {
        if (!this.piste.stream_proxy_url) { rejeter(new Error('Stream unavailable')); return; }
        const ok = () => {
          nettoyer();
          this.sourcePrete = true;
          if (this.positionEnAttente !== null) {
            this.audio.currentTime = this.positionEnAttente;
            this.positionEnAttente = null;
          }
          this.majTempsTotal();
          resoudre();
        };
        const ko = () => { nettoyer(); rejeter(new Error('Audio stream could not be loaded.')); };
        const nettoyer = () => {
          this.audio.removeEventListener('loadedmetadata', ok);
          this.audio.removeEventListener('error', ko);
        };
        this.audio.addEventListener('loadedmetadata', ok);
        this.audio.addEventListener('error', ko);
        this.audio.src = this.piste.stream_proxy_url;
        this.audio.load();
      }).catch((err) => {
        this.promesseSource = null;
        if (!this.detruit) this.afficherMessage(err.message);
        throw err;
      });
    }
    return this.promesseSource;
  }

  basculerLecture() { if (this.enLecture || this.lectureDemandee) this.mettrePause(); else this.lire(); }

  async lire() {
    if (this.detruit) return;
    this.lectureDemandee = true;
    this.afficherMessage('');
    this.majEtat();
    try { await this.preparerSource(); } catch (_) { this.lectureDemandee = false; this.majEtat(); return; }
    if (!this.lectureDemandee || this.detruit) return;
    try { await this.audio.play(); } catch (e) {
      this.lectureDemandee = false;
      if (e && e.name !== 'AbortError') this.afficherMessage('Playback was blocked by the browser. Click Play again.');
    }
    this.majEtat();
  }

  mettrePause() { this.lectureDemandee = false; if (!this.audio.paused) this.audio.pause(); this.majEtat(); }
  aller(secondes) {
    const cible = bornerValeur(secondes, 0, Math.max(0, this.duree - 0.1));
    this.termine = false;
    if (this.sourcePrete) this.audio.currentTime = cible;
    else this.positionEnAttente = cible;
    this.majTemps();
    this.demanderImage();
  }
  decaler(delta) { this.aller(this.positionCourante() + delta); }
  changerVitesse() {
    const i = VITESSES_LECTURE.indexOf(this.audio.playbackRate);
    this.audio.playbackRate = VITESSES_LECTURE[(i + 1) % VITESSES_LECTURE.length];
  }
  changerVolume(valeur) {
    this.audio.muted = false;
    this.audio.volume = bornerValeur(valeur, 0, 1);
    try { localStorage.setItem(CLE_VOLUME, String(this.audio.volume)); } catch (_) {}
  }
  basculerMuet() {
    if (this.audio.muted || this.audio.volume === 0) { this.audio.muted = false; if (this.audio.volume === 0) this.audio.volume = 0.6; }
    else this.audio.muted = true;
  }

  majEtat() {
    const enLecture = this.enLecture;
    const attente = (this.lectureDemandee && !enLecture) || (enLecture && this.enAttente);
    this.racine.classList.toggle('en-lecture', enLecture);
    this.racine.classList.toggle('attente', attente);
    this.boutonLecture.setAttribute('aria-label', (enLecture || this.lectureDemandee) ? 'Pause' : 'Play');
  }
  majTemps() {
    const duree = this.duree;
    const temps = this.glisse ? this.positionGlisse * duree : this.positionCourante();
    const seconde = Math.floor(temps);
    if (seconde === this.secondeAffichee) return;
    this.secondeAffichee = seconde;
    this.tempsCourant.textContent = formaterTemps(temps);
    this.zoneOnde.setAttribute('aria-valuenow', String(seconde));
    this.zoneOnde.setAttribute('aria-valuetext', `${formaterTemps(temps)} of ${formaterTemps(duree)}`);
  }
  majTempsTotal() {
    const duree = this.duree;
    this.tempsTotal.textContent = formaterTemps(duree);
    this.zoneOnde.setAttribute('aria-valuemax', String(Math.floor(duree)));
    this.secondeAffichee = -1;
    this.majTemps();
  }
  majMemoire() {
    const plages = this.audio.buffered;
    const duree = this.duree;
    if (!duree || !plages.length) return;
    this.ratioMemoire = bornerValeur(plages.end(plages.length - 1) / duree, 0, 1);
  }
  majVolume() {
    const pct = this.audio.muted ? 0 : Math.round(this.audio.volume * 100);
    const niveau = (this.audio.muted || this.audio.volume === 0) ? 'muet' : this.audio.volume < 0.5 ? 'bas' : 'haut';
    this.zoneVolume.dataset.niveau = niveau;
    this.curseurVolume.value = String(pct);
    this.curseurVolume.style.setProperty('--p', `${pct}%`);
    this.boutonMuet.setAttribute('aria-label', niveau === 'muet' ? 'Unmute' : 'Mute');
  }
  majVitesse() {
    this.boutonVitesse.textContent = `${this.audio.playbackRate}x`;
    this.boutonVitesse.setAttribute('aria-label', `Playback speed: ${this.audio.playbackRate}x`);
  }
  afficherMessage(texte) {
    this.zoneMessage.textContent = texte;
    this.zoneMessage.classList.toggle('erreur-lecture', Boolean(texte));
    this.zoneMessage.hidden = !texte;
  }

  etatDessin() {
    return { ratio: this.ratioAffiche(), survol: this.survol, xSurvol: this.xSurvol, ratioMemoire: this.ratioMemoire, enLecture: this.enLecture, glisse: this.glisse };
  }
  redimensionner() {
    if (!this.detruit && this.dessin.redimensionner(this.zoneOnde.getBoundingClientRect())) {
      this.dessin.dessiner(performance.now(), this.etatDessin());
    }
  }
  demanderImage() {
    if (this.detruit || this.imageDemandee) return;
    this.imageDemandee = requestAnimationFrame((t) => {
      this.imageDemandee = 0;
      const continuer = this.dessin.mettreAJourAnimation(t, this.etatDessin());
      if (this.enLecture) this.majTemps();
      this.dessin.dessiner(t, this.etatDessin());
      if (continuer) this.demanderImage();
    });
  }

  ratioDepuis(e) { const r = this.zoneOnde.getBoundingClientRect(); return bornerValeur((e.clientX - r.left) / r.width, 0, 1); }
  survoler(e) {
    const ratio = this.ratioDepuis(e);
    this.survol = true;
    this.xSurvol = ratio * this.dessin.largeur;
    this.infobulle.textContent = formaterTemps(ratio * this.duree);
    this.infobulle.hidden = false;
    const m = this.infobulle.offsetWidth / 2;
    this.infobulle.style.left = `${bornerValeur(this.xSurvol, m, this.dessin.largeur - m)}px`;
    this.demanderImage();
  }
  quitterSurvol() { this.survol = false; this.infobulle.hidden = true; this.demanderImage(); }

  lierEvenements() {
    const { audio, zoneOnde: onde } = this;
    this.boutonLecture.addEventListener('click', () => this.basculerLecture());
    this.boutonReculer.addEventListener('click', () => this.decaler(-SAUT_SECONDES));
    this.boutonAvancer.addEventListener('click', () => this.decaler(SAUT_SECONDES));
    this.boutonVitesse.addEventListener('click', () => this.changerVitesse());
    this.boutonMuet.addEventListener('click', () => this.basculerMuet());
    this.curseurVolume.addEventListener('input', () => this.changerVolume(Number(this.curseurVolume.value) / 100));
    onde.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') this.survoler(e); });
    onde.addEventListener('pointermove', (e) => {
      if (this.glisse) { this.positionGlisse = this.ratioDepuis(e); this.survoler(e); this.majTemps(); }
      else if (e.pointerType === 'mouse') this.survoler(e);
    });
    onde.addEventListener('pointerleave', () => { if (!this.glisse) this.quitterSurvol(); });
    onde.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      try { onde.setPointerCapture(e.pointerId); } catch (_) {}
      this.glisse = true; this.positionGlisse = this.ratioDepuis(e); this.survoler(e); this.majTemps();
    });
    const relacher = (e) => {
      if (!this.glisse) return;
      this.glisse = false;
      if (e.type === 'pointerup' && this.duree > 0) this.aller(this.positionGlisse * this.duree);
      if (e.pointerType !== 'mouse' || !onde.matches(':hover')) this.quitterSurvol();
      this.secondeAffichee = -1; this.majTemps(); this.demanderImage();
    };
    onde.addEventListener('pointerup', relacher);
    onde.addEventListener('pointercancel', relacher);
    onde.addEventListener('keydown', (e) => {
      const pas = e.shiftKey ? PAS_CLAVIER * 3 : PAS_CLAVIER;
      if (e.key === 'ArrowLeft') this.decaler(-pas);
      else if (e.key === 'ArrowRight') this.decaler(pas);
      else if (e.key === ' ' || e.key === 'k' || e.key === 'K') this.basculerLecture();
      else if (e.key === 'm' || e.key === 'M') this.basculerMuet();
      else return;
      e.preventDefault();
    });
    ['play', 'playing', 'pause', 'ended', 'waiting', 'canplay', 'seeked', 'timeupdate', 'progress', 'durationchange', 'volumechange', 'ratechange'].forEach((evt) => {
      audio.addEventListener(evt, () => {
        if (evt === 'ended') { this.termine = true; this.lectureDemandee = false; }
        if (evt === 'play') this.termine = false;
        if (evt === 'waiting') this.enAttente = true;
        if (evt === 'playing' || evt === 'canplay') this.enAttente = false;
        if (evt === 'pause') this.lectureDemandee = false;
        if (evt === 'durationchange') this.majTempsTotal();
        if (evt === 'volumechange') this.majVolume();
        if (evt === 'ratechange') this.majVitesse();
        this.majEtat(); this.majTemps(); this.majMemoire(); this.demanderImage();
      });
    });
  }

  configurerSessionMedia() {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.piste.title || '',
        artist: (this.artiste && this.artiste.name) || this.piste.artist_display || '',
        artwork: this.piste.artwork_url ? [{ src: this.piste.artwork_url, sizes: '500x500' }] : [],
      });
    } catch (_) {}
  }

  detruire() {
    this.detruit = true;
    cancelAnimationFrame(this.imageDemandee);
    this.observateur.disconnect();
    try { this.audio.pause(); } catch (_) {}
    this.audio.removeAttribute('src');
    this.audio.load();
  }
}
