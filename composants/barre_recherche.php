<div class="recherche-zone">
  <form class="recherche" id="formulaire" novalidate role="search">
    <svg class="recherche-icone" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.5 13.5L17 17" />
    </svg>
    <label class="visuellement-cache" for="champ-url">Track, artist, or Audiomack URL</label>
    <input
      id="champ-url"
      class="champ-url"
      type="text"
      placeholder="Track, artist, or Audiomack URL"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      enterkeyhint="search"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded="false"
      aria-controls="liste-suggestions"
    />
    <button id="bouton-lancer" class="bouton bouton-primaire" type="submit">Search</button>
  </form>
  <ul class="suggestions" id="liste-suggestions" role="listbox" aria-label="Search suggestions" hidden></ul>
</div>
