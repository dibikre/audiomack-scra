'use strict';

function construireLiensSociauxArtiste(artiste) {
  const liens = [
    ['Website', artiste.website],
    ['YouTube', artiste.youtube],
    ['Instagram', artiste.instagram],
    ['Twitter / X', artiste.twitter],
    ['TikTok', artiste.tiktok],
    ['Facebook', artiste.facebook],
  ].filter(([, url]) => estUrlHttp(url));

  if (!liens.length) return '';
  return `<div class="artiste-liens-sociaux">${liens.map(([nom, url]) => (
    `<a class="puce lien-social-artiste" href="${echapperHtml(url)}" target="_blank" rel="noopener">${echapperHtml(nom)} ${iconeSvg('externe', 13)}</a>`
  )).join('')}</div>`;
}

function construireEntetePageArtiste(artiste) {
  const banniere = artiste.banner_url
    ? `<div class="artiste-banniere-cadre"><img class="artiste-banniere-img" src="${echapperHtml(artiste.banner_url)}" alt="" /></div>`
    : '<div class="artiste-banniere-cadre artiste-banniere-vide"></div>';

  const avatar = artiste.avatar_url
    ? `<img class="artiste-avatar-grand" src="${echapperHtml(artiste.avatar_url)}" alt="${echapperHtml(artiste.name)}" />`
    : `<span class="artiste-avatar-grand artiste-avatar-vide">${iconeSvg('utilisateur', 38)}</span>`;

  const badges = [
    artiste.verified ? 'Verified' : null,
    artiste.verified_pro ? 'Pro' : null,
    artiste.genre || null,
    artiste.label || null,
    artiste.location || null,
  ].filter(Boolean);

  const htmlBadges = badges.length
    ? `<div class="puces">${badges.map((b) => `<span class="puce">${echapperHtml(b)}</span>`).join('')}</div>`
    : '';

  const boutonExterne = estUrlHttp(artiste.permalink_url)
    ? `<a class="bouton bouton-secondaire" href="${echapperHtml(artiste.permalink_url)}" target="_blank" rel="noopener">Open on Audiomack ${iconeSvg('externe', 16)}</a>`
    : '';

  return `<section class="artiste-hero">
    ${banniere}
    <div class="artiste-hero-corps">
      <div class="artiste-hero-sommet">
        ${avatar}
        <div class="artiste-hero-identite">
          <h2 class="artiste-hero-nom">${echapperHtml(artiste.name)}${artiste.verified ? ICONE_VERIFIE : ''}</h2>
          <p class="artiste-hero-pseudo">@${echapperHtml(artiste.url_slug)}</p>
          ${htmlBadges}
        </div>
        <div class="artiste-hero-actions">${boutonExterne}</div>
      </div>
      <dl class="stats-artiste-grille">
        ${artiste.monthly_listeners != null ? htmlStatistique('Monthly listeners', formaterNombre(artiste.monthly_listeners)) : ''}
        ${artiste.plays_count != null ? htmlStatistique('Total plays', formaterNombre(artiste.plays_count)) : ''}
        ${htmlStatistique('Followers', formaterNombre(artiste.followers_count))}
        ${htmlStatistique('Following', formaterNombre(artiste.following_count))}
        ${htmlStatistique('Uploads', formaterNombre(artiste.upload_count))}
        ${htmlStatistique('Playlists', formaterNombre(artiste.playlists_count))}
        ${htmlStatistique('Favorites', formaterNombre(artiste.favorites_count))}
        ${htmlStatistique('Reposts', formaterNombre(artiste.reup_count))}
      </dl>
      ${artiste.bio ? `<p class="artiste-bio">${echapperHtml(couperTexte(artiste.bio, 500))}</p>` : ''}
      ${construireLiensSociauxArtiste(artiste)}
    </div>
  </section>`;
}

function construireOngletsArtiste(sections) {
  const candidats = [
    ['pistes', 'Top Songs', (sections.pistes || []).length],
    ['albums', 'Albums', (sections.albums || []).length],
    ['playlists', 'Playlists', (sections.playlists || []).length],
    ['favoris', 'Favorites', (sections.favoris || []).length],
    ['reups', 'Reups', (sections.reups || []).length],
    ['acces_anticipe', 'Early Access', (sections.acces_anticipe || []).length, true],
    ['apparitions_playlists', 'Appears On', (sections.apparitions_playlists || []).length, true],
    ['soutiens', 'Supporters', (sections.donateurs || []).length + (sections.soutiens_autres || []).length, true],
  ];
  return candidats
    .filter(([, , compte, optionnel]) => !optionnel || compte > 0)
    .map(([cle, libelle, compte]) => ({ cle, libelle, compte }));
}

function htmlSectionSoutiens(sections) {
  const donateurs = sections.donateurs || [];
  const soutiensAutres = sections.soutiens_autres || [];
  if (!donateurs.length && !soutiensAutres.length) {
    return '<div class="vide">No supporter activity found for this artist.</div>';
  }

  const listeDonateurs = donateurs.length
    ? `<div>
         <h3 class="artiste-sous-titre">Top Supporters</h3>
         <ul class="liste-donateurs">${donateurs.map((d) => {
           const a = d.artiste;
           const avatar = a.avatar_url
             ? `<img class="avatar avatar-donateur" src="${echapperHtml(a.avatar_url)}" alt="" />`
             : '<span class="avatar avatar-donateur"></span>';
           return `<li class="carte-donateur">
             <span class="donateur-rang">#${echapperHtml(String(d.rang))}</span>
             ${avatar}
             <div class="donateur-info">
               <button type="button" class="lien-artiste donateur-nom" data-artiste-slug="${echapperHtml(a.url_slug)}">${echapperHtml(a.name)}${a.verified ? ICONE_VERIFIE : ''}</button>
               <span class="donateur-meta">@${echapperHtml(a.url_slug)} · ${formaterNombre(d.nombre_soutiens)} gifts · ${formaterNombre(d.montant_total)} pts</span>
             </div>
           </li>`;
         }).join('')}</ul>
       </div>`
    : '';

  const listeSoutiens = soutiensAutres.length
    ? `<div>
         <h3 class="artiste-sous-titre">Recently Supported Music</h3>
         <ul class="liste-pistes" data-source="soutiens_autres">${soutiensAutres.map((s, i) => htmlCartePiste(s.media, i)).join('')}</ul>
       </div>`
    : '';

  return `<div class="artiste-bloc-soutiens">${listeDonateurs}${listeSoutiens}</div>`;
}

function renduContenuOngletArtiste(sections, onglet) {
  if (onglet === 'soutiens') return htmlSectionSoutiens(sections);
  const items = sections[onglet] || [];
  if (!items.length) return '<div class="vide">No items available in this section yet.</div>';
  const aSuite = Boolean(sections.suite && sections.suite[onglet]);
  const boutonPlus = aSuite
    ? `<div class="recherche-pied"><button type="button" class="bouton bouton-secondaire" id="bouton-plus-artiste" data-onglet="${echapperHtml(onglet)}">Load more</button></div>`
    : '';
  return `<ul class="liste-pistes" data-source="${echapperHtml(onglet)}">${items.map((item, i) => htmlCartePiste(item, i)).join('')}</ul>${boutonPlus}`;
}
