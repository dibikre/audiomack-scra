'use strict';

function htmlPiste(donnees) {
  const piste = donnees.track;
  const artiste = donnees.artist;
  definirPisteTelechargement(piste);

  const pochette = piste.artwork_url
    ? `<img class="pochette" src="${echapperHtml(piste.artwork_url)}" alt="Artwork for ${echapperHtml(piste.title)}" />`
    : `<div class="pochette pochette-vide">${iconeSvg('note', 56)}</div>`;

  const nomArtiste = (artiste && artiste.name) || piste.artist_display;
  const slugArtiste = (artiste && artiste.url_slug) || piste.uploader_slug || '';
  const avatarMini = artiste && artiste.avatar_url
    ? `<img class="avatar avatar-mini" src="${echapperHtml(artiste.avatar_url)}" alt="" />`
    : '';
  const contenuSignature = slugArtiste
    ? `<button type="button" class="lien-artiste lien-artiste-signature" data-artiste-slug="${echapperHtml(slugArtiste)}">${avatarMini}<span>${echapperHtml(nomArtiste)}</span></button>`
    : `${avatarMini}<span>${echapperHtml(nomArtiste)}</span>`;
  const signature = nomArtiste ? `<p class="piste-artiste">${contenuSignature}</p>` : '';

  const puces = [piste.genre, piste.duration_human, piste.explicit ? 'Explicit' : null]
    .filter(Boolean)
    .map((t) => `<span class="puce">${echapperHtml(t)}</span>`)
    .join('');

  const boutonTelecharger = piste.stream_proxy_url
    ? `<button type="button" class="bouton bouton-primaire" id="bouton-bascule" aria-expanded="false" aria-controls="panneau-qualites">${iconeSvg('telecharger')}Download audio</button>`
    : '';

  const lienAudiomack = estUrlHttp(piste.permalink_url)
    ? `<a class="bouton bouton-secondaire" href="${echapperHtml(piste.permalink_url)}" target="_blank" rel="noopener">Open on Audiomack ${iconeSvg('externe', 16)}</a>`
    : '';

  const panneau = piste.stream_proxy_url
    ? `<div class="qualites" id="panneau-qualites"><div class="qualites-interieur"><div class="liste-qualites" id="liste-qualites">
         <div class="qualite-chargement" id="chargement-qualites"><span class="spinner"></span>Resolving signed audio stream...</div>
       </div></div></div>`
    : '';

  return `<section class="piste">
    <div>${pochette}</div>
    <div>
      ${signature}
      <h2 class="piste-titre">${echapperHtml(piste.title)}</h2>
      <div class="puces">${puces}</div>
      <dl class="stats-piste">
        ${htmlStatistique('Plays', formaterNombre(piste.playback_count))}
        ${htmlStatistique('Favorites', formaterNombre(piste.likes_count))}
        ${htmlStatistique('Reposts', formaterNombre(piste.reposts_count))}
        ${htmlStatistique('Playlists', formaterNombre(piste.playlists_count))}
        ${htmlStatistique('Comments', formaterNombre(piste.comment_count))}
      </dl>
      ${piste.description ? `<p class="piste-description">${echapperHtml(couperTexte(piste.description, 400))}</p>` : ''}
      <div class="piste-actions">${boutonTelecharger}${lienAudiomack}</div>
      ${panneau}
    </div>
    ${piste.stream_proxy_url ? htmlLecteur() : ''}
    <dl class="details piste-details">
      ${ligneDetail('Permalink', piste.permalink_url, true, true)}
      ${ligneDetail('Track ID', piste.id, false, true)}
      ${ligneDetail('Release date', piste.released_at && formaterDateAnglaise(piste.released_at))}
      ${ligneDetail('Uploaded on', piste.uploaded_at && formaterDateAnglaise(piste.uploaded_at))}
      ${ligneDetail('Duration (ms)', piste.duration_ms)}
    </dl>
  </section>`;
}

function htmlArtiste(artiste) {
  const banniere = artiste.banner_url ? `<img class="banniere" src="${echapperHtml(artiste.banner_url)}" alt="" />` : '';
  const avatar = artiste.avatar_url
    ? `<img class="avatar" src="${echapperHtml(artiste.avatar_url)}" alt="" />`
    : '<span class="avatar"></span>';

  const etiquettes = [];
  if (artiste.verified) etiquettes.push('Verified');
  if (artiste.verified_pro) etiquettes.push('Verified Pro');
  if (artiste.genre) etiquettes.push(artiste.genre);
  const htmlEtiquettes = etiquettes.length
    ? `<div class="puces">${etiquettes.map((b) => `<span class="puce">${echapperHtml(b)}</span>`).join('')}</div>`
    : '';

  const boutonProfil = artiste.url_slug
    ? `<button type="button" class="bouton bouton-secondaire bouton-profil-artiste" data-artiste-slug="${echapperHtml(artiste.url_slug)}">${iconeSvg('utilisateur', 16)}Open artist page</button>`
    : '';

  return `<section class="rubrique">
    <h2 class="rubrique-titre">Artist</h2>
    <div>
      ${banniere}
      <div class="artiste-entete">
        ${avatar}
        <div class="artiste-identite">
          <div class="artiste-nom">${echapperHtml(artiste.name)}${artiste.verified ? ICONE_VERIFIE : ''}</div>
          <div class="artiste-pseudo">@${echapperHtml(artiste.url_slug)}</div>
        </div>
        ${boutonProfil}
        ${htmlEtiquettes}
      </div>
      <dl class="stats-artiste">
        ${htmlStatistique('Followers', formaterNombre(artiste.followers_count))}
        ${htmlStatistique('Following', formaterNombre(artiste.following_count))}
        ${htmlStatistique('Uploads', formaterNombre(artiste.upload_count))}
        ${htmlStatistique('Playlists', formaterNombre(artiste.playlists_count))}
        ${htmlStatistique('Favorites', formaterNombre(artiste.favorites_count))}
        ${htmlStatistique('Reposts', formaterNombre(artiste.reup_count))}
        ${artiste.plays_count != null ? htmlStatistique('Total plays', formaterNombre(artiste.plays_count)) : ''}
      </dl>
      <dl class="details">
        ${ligneDetail('Profile', artiste.permalink_url, true, true)}
        ${ligneDetail('Location', artiste.location)}
        ${ligneDetail('Label', artiste.label)}
        ${ligneDetail('Website', artiste.website, true)}
        ${ligneDetail('YouTube', artiste.youtube, true)}
        ${ligneDetail('Twitter / X', artiste.twitter, true)}
        ${ligneDetail('Instagram', artiste.instagram, true)}
        ${ligneDetail('Bio', artiste.bio)}
      </dl>
    </div>
  </section>`;
}

function htmlEditeur(editeur) {
  const contenu = [
    ligneDetail('Artist', editeur.artist),
    ligneDetail('Album', editeur.album_title),
    ligneDetail('Producer', editeur.producer),
    ligneDetail('Featuring', editeur.featuring),
    ligneDetail('ISRC', editeur.isrc, false, true),
    ligneDetail('UPC / EAN', editeur.upc_or_ean, false, true),
    ligneDetail('P-Line', editeur.p_line),
    ligneDetail('C-Line', editeur.c_line),
  ].join('');
  if (!contenu) return '';
  return `<section class="rubrique">
    <h2 class="rubrique-titre">Publisher</h2>
    <dl class="details">${contenu}</dl>
  </section>`;
}

function htmlCartePiste(piste, indice) {
  const pochette = piste.pochette
    ? `<img src="${echapperHtml(piste.pochette)}" alt="" loading="lazy" />`
    : `<span class="carte-pochette-vide">${iconeSvg('note', 40)}</span>`;
  const rondLecture = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="margin-left:2px"><path d="M8 5.5v13l11-6.5z"/></svg>';
  const ecoutes = piste.ecoutes != null && piste.ecoutes > 0
    ? `<p class="carte-meta">${formaterNombre(piste.ecoutes)} plays</p>`
    : (piste.mis_a_jour ? `<p class="carte-meta">Updated ${echapperHtml(piste.mis_a_jour)}</p>` : '');
  const estCollection = piste.type === 'album' || piste.type === 'playlist';
  const libelleSecondaire = piste.type === 'playlist' ? 'Playlist' : (piste.type === 'album' ? 'Album' : 'Listen');
  const artisteHtml = piste.artiste_slug
    ? `<button type="button" class="lien-artiste" data-artiste-slug="${echapperHtml(piste.artiste_slug)}">${echapperHtml(piste.artiste || piste.artiste_slug)}</button>`
    : echapperHtml(piste.artiste || '');

  return `<li class="carte-piste" data-indice="${indice}" data-type="${echapperHtml(piste.type || 'song')}" data-url="${echapperHtml(piste.url)}">
    <div class="carte-pochette">
      ${pochette}
      ${!estCollection ? `<span class="carte-lecture" aria-hidden="true"><span class="carte-lecture-rond">${rondLecture}<span class="carte-egaliseur"><i></i><i></i><i></i><i></i></span></span></span>` : ''}
      ${piste.duree ? `<span class="carte-duree">${echapperHtml(piste.duree)}</span>` : ''}
    </div>
    <div class="carte-texte">
      <h3 class="carte-titre">${echapperHtml(piste.titre)}</h3>
      <p class="carte-artiste">${artisteHtml}</p>
      ${ecoutes}
    </div>
    <div class="carte-actions">
      <button type="button" class="bouton bouton-primaire bouton-analyser" aria-label="Analyze ${echapperHtml(piste.titre)}">Analyze</button>
      <button type="button" class="bouton bouton-contour bouton-ecouter" aria-pressed="false" ${estCollection ? 'disabled' : ''}>
        <span class="spinner" aria-hidden="true"></span>
        <span class="bouton-libelle">${estCollection ? '' : iconeSvg('lire', 16)}${libelleSecondaire}</span>
      </button>
    </div>
  </li>`;
}

function htmlCollection(collection) {
  const cartes = (collection.tracks || []).map((t) => ({
    id: t.id,
    type: 'song',
    titre: `${t.index}. ${t.title}`,
    artiste: t.artist || collection.artist_display,
    artiste_slug: t.uploader_slug || '',
    url: t.url,
    pochette: t.artwork_url || collection.artwork_url,
    duree: t.duration_human,
    ecoutes: null,
  }));

  return `<section class="rubrique">
    <h2 class="rubrique-titre">${echapperHtml(collection.title)}</h2>
    <div>
      <div class="puces">
        <span class="puce">${echapperHtml(String(collection.track_count))} tracks</span>
        ${collection.genre ? `<span class="puce">${echapperHtml(collection.genre)}</span>` : ''}
        ${collection.released_at ? `<span class="puce">${echapperHtml(formaterDateAnglaise(collection.released_at))}</span>` : ''}
      </div>
      <ul class="liste-pistes" id="liste-collection">${cartes.map((c, i) => htmlCartePiste(c, i)).join('')}</ul>
    </div>
  </section>`;
}
