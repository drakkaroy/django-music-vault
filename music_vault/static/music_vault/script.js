'use strict';
/* =========================================================
   VinylVault — music library frontend (django-music-vault)
   Data persists via the music_vault REST API.
========================================================= */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- API layer ---------- */
const API_BASE = (window.MV_BASE || '/') + 'api/';
const getCookie = name => document.cookie.split('; ').find(r => r.startsWith(name + '='))?.split('=')[1];
async function api(path, method = 'GET', body = null){
  const res = await fetch(API_BASE + path, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') || '' },
    body: body ? JSON.stringify(body) : null,
  });
  if (res.status === 401){ location.reload(); throw new Error('Signed out — reloading'); }
  if (!res.ok){
    let msg = `Request failed (${res.status})`;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}
async function refreshState(){ state = await api('state/'); }

/* ---------- Generated covers (SVG data-URI, 640-friendly) ---------- */
function hashStr(s){ let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function genCover(artist, title){
  const h = hashStr(artist + title);
  const h1 = h % 360, h2 = (h1 + 40 + h % 80) % 360;
  const initials = artist.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${h1},55%,32%)"/><stop offset="1" stop-color="hsl(${h2},60%,14%)"/>
    </linearGradient></defs>
    <rect width="640" height="640" fill="url(#g)"/>
    <circle cx="320" cy="320" r="190" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="42"/>
    <circle cx="320" cy="320" r="105" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="52"/>
    <circle cx="320" cy="320" r="28" fill="rgba(0,0,0,.4)"/>
    <text x="320" y="345" font-family="Segoe UI,Arial" font-size="76" font-weight="800"
      fill="rgba(255,255,255,.85)" text-anchor="middle">${initials}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
// prefer the locally stored copy (coverFile), fall back to the remote URL
const coverOf = a => (a.coverFile && a.coverFile.trim()) ? a.coverFile
  : (a.cover && a.cover.trim() ? a.cover : genCover(a.artist, a.title));

/* ---------- State ---------- */
let state = { libraries: [] };

let route = { view: 'home', libId: null };
// per-library UI state (filters), not persisted
const uiState = {};
const ui = libId => uiState[libId] ??= { q: '', genre: '', country: '', decade: '', tags: new Set(), sort: 'artist' };

const allAlbums = () => state.libraries.flatMap(l => l.albums.map(a => ({ ...a, _lib: l })));
const findLib = id => state.libraries.find(l => l.id === id);

/* ---------- Toast ---------- */
function toast(msg, ico = '✓'){
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="ico">${ico}</span>${esc(msg)}`;
  $('#toastWrap').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 2600);
}

/* ---------- Sidebar ---------- */
function renderSidebar(){
  $('#favCount').textContent = allAlbums().filter(a => a.favorite).length;
  $('#libNav').innerHTML = state.libraries.map(l => `
    <button class="nav-item ${route.view === 'library' && route.libId === l.id ? 'active' : ''}" data-nav="library" data-lib="${l.id}">
      <span class="lib-dot" style="background:${esc(l.color)}"></span>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.name)}</span>
      <span class="count">${l.albums.length}</span>
    </button>`).join('');
  document.querySelectorAll('[data-nav]').forEach(b => {
    b.classList.toggle('active',
      (b.dataset.nav === route.view && !b.dataset.lib) ||
      (b.dataset.lib && route.view === 'library' && route.libId === b.dataset.lib));
    b.onclick = () => { go(b.dataset.nav, b.dataset.lib || null); $('#sidebar').classList.remove('open'); };
  });
}

/* ---------- Router ---------- */
function go(view, libId = null){ route = { view, libId }; render(); window.scrollTo({ top: 0 }); }
function render(){
  renderSidebar();
  const v = $('#view');
  if (route.view === 'home') v.innerHTML = homeView();
  else if (route.view === 'favorites') v.innerHTML = favoritesView();
  else if (route.view === 'library') v.innerHTML = libraryView(route.libId);
  bindView();
}

/* ---------- Home ---------- */
function homeView(){
  const total = allAlbums().length;
  return `<div class="view">
    <div class="page-head">
      <div>
        <h1>Your Libraries</h1>
        <p class="page-sub">${state.libraries.length} libraries · ${total} albums · synced to your vault</p>
      </div>
      <div class="head-actions"><button class="btn btn-accent" data-act="new-lib">＋ New library</button></div>
    </div>
    <div class="lib-grid">
      ${state.libraries.map((l, i) => {
        const covers = l.albums.slice(0, 4);
        const tiles = covers.map(a => `<img src="${esc(coverOf(a))}" alt="" loading="lazy">`);
        while (tiles.length < 4 && tiles.length > 1) tiles.push('<div class="empty-tile">♪</div>');
        return `<button class="lib-card" data-act="open-lib" data-lib="${l.id}" style="animation-delay:${i * 60}ms" aria-label="Open library ${esc(l.name)}">
          <div class="mosaic ${covers.length <= 1 ? 'single' : ''}">${tiles.join('') || '<div class="empty-tile">♪</div>'}</div>
          <h3><span class="lib-dot" style="background:${esc(l.color)}"></span>${esc(l.name)}</h3>
          <p>${esc(l.description || '')}</p>
          <p style="margin-top:8px;color:var(--text-faint)">${l.albums.length} albums · ${l.albums.filter(a => a.favorite).length} ♥</p>
        </button>`;
      }).join('')}
      <button class="lib-card-new" data-act="new-lib" style="animation-delay:${state.libraries.length * 60}ms">
        <span><span class="plus">＋</span>Create a library</span>
      </button>
    </div>
  </div>`;
}

/* ---------- Filtering helpers ---------- */
function applyFilters(albums, u){
  const q = u.q.trim().toLowerCase();
  return albums.filter(a =>
    (!q || [a.title, a.artist, a.genre, a.country, String(a.year), ...(a.tags || [])].join(' ').toLowerCase().includes(q)) &&
    (!u.genre || a.genre === u.genre) &&
    (!u.country || a.country === u.country) &&
    (!u.decade || Math.floor(a.year / 10) * 10 === +u.decade) &&
    ([...u.tags].every(t => (a.tags || []).includes(t)))
  );
}
function sortAlbums(albums, sort){
  const by = {
    artist: (a, b) => a.artist.localeCompare(b.artist) || a.year - b.year,
    'year-asc': (a, b) => a.year - b.year,
    'year-desc': (a, b) => b.year - a.year,
    title: (a, b) => a.title.localeCompare(b.title),
    recent: (a, b) => b.addedAt - a.addedAt,
  };
  return [...albums].sort(by[sort] || by.artist);
}

/* ---------- Library view ---------- */
function toolbarHTML(lib, u, albums){
  const uniq = k => [...new Set(albums.map(a => a[k]).filter(Boolean))].sort();
  const decades = [...new Set(albums.map(a => Math.floor(a.year / 10) * 10))].sort((a, b) => a - b);
  const allTags = [...new Set(albums.flatMap(a => a.tags || []))].sort();
  const opt = (list, cur, fmt = x => x) => list.map(v => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(fmt(v))}</option>`).join('');
  const hasFilters = u.q || u.genre || u.country || u.decade || u.tags.size;
  return `
  <div class="toolbar" role="search">
    <div class="search-wrap">
      <span class="ico">🔍</span>
      <input class="search" id="searchBox" type="search" placeholder="Search album, artist, tag…  ( / )" value="${esc(u.q)}" aria-label="Search albums">
    </div>
    <select class="filter-sel ${u.genre ? 'on' : ''}" data-filter="genre" aria-label="Filter by genre">
      <option value="">All genres</option>${opt(uniq('genre'), u.genre)}</select>
    <select class="filter-sel ${u.country ? 'on' : ''}" data-filter="country" aria-label="Filter by country">
      <option value="">All countries</option>${opt(uniq('country'), u.country)}</select>
    <select class="filter-sel ${u.decade ? 'on' : ''}" data-filter="decade" aria-label="Filter by decade">
      <option value="">All decades</option>${opt(decades, u.decade, d => d + 's')}</select>
    <select class="filter-sel" data-filter="sort" aria-label="Sort albums">
      ${opt([['artist','Artist A–Z'],['year-asc','Year ↑'],['year-desc','Year ↓'],['title','Title A–Z'],['recent','Recently added']].map(x => x[0]), u.sort,
        v => ({artist:'Artist A–Z','year-asc':'Year ↑','year-desc':'Year ↓',title:'Title A–Z',recent:'Recently added'}[v]))}
    </select>
  </div>
  ${allTags.length ? `<div class="tag-row" role="group" aria-label="Filter by tags">
    ${allTags.map(t => `<button class="tag-chip ${u.tags.has(t) ? 'on' : ''}" data-tag="${esc(t)}" aria-pressed="${u.tags.has(t)}">${esc(t)}</button>`).join('')}
    ${hasFilters ? '<button class="clear-filters" data-act="clear-filters">✕ Clear all filters</button>' : ''}
  </div>` : ''}`;
}

function albumCardHTML(a, i, showLib = false){
  return `<div class="album-card" data-album="${a.id}" data-albumlib="${a._lib ? a._lib.id : route.libId}" style="animation-delay:${Math.min(i * 40, 400)}ms" tabindex="0" role="button" aria-label="${esc(a.title)} by ${esc(a.artist)}">
    <div class="cover-wrap">
      <img src="${esc(coverOf(a))}" alt="Cover of ${esc(a.title)}" loading="lazy">
      ${a.favorite ? '<span class="fav-corner" aria-hidden="true">♥</span>' : ''}
      <div class="cover-overlay">
        <button class="play-btn" data-play="${a.id}" aria-label="Play ${esc(a.title)} on Spotify" title="Play on Spotify">▶</button>
        <button class="fav-btn ${a.favorite ? 'on' : ''}" data-fav="${a.id}" aria-label="${a.favorite ? 'Remove from' : 'Add to'} favorites" aria-pressed="${a.favorite}">${a.favorite ? '♥' : '♡'}</button>
      </div>
    </div>
    <div class="album-meta">
      <div class="t">${esc(a.title)}</div>
      <div class="a">${esc(a.artist)}</div>
      <div class="y">${a.year} · ${esc(a.genre)}${showLib && a._lib ? ' · ' + esc(a._lib.name) : ''}</div>
    </div>
  </div>`;
}

function albumsGridHTML(albums, u){
  if (!albums.length) return `<div class="empty-state"><div class="big">🎧</div>
    <h3>No albums match</h3><p>Try adjusting your search or filters — or add a new album to this collection.</p></div>`;
  if (u.sort === 'artist'){
    const groups = new Map();
    for (const a of albums){ if (!groups.has(a.artist)) groups.set(a.artist, []); groups.get(a.artist).push(a); }
    let i = 0;
    return [...groups.entries()].map(([artist, list]) => `
      <section class="artist-section" aria-label="${esc(artist)}">
        <div class="artist-head"><h2>${esc(artist)}</h2><span>${list.length} album${list.length > 1 ? 's' : ''}</span></div>
        <div class="album-grid">${list.map(a => albumCardHTML(a, i++)).join('')}</div>
      </section>`).join('');
  }
  return `<div class="album-grid">${albums.map((a, i) => albumCardHTML(a, i)).join('')}</div>`;
}

function libraryView(libId){
  const lib = findLib(libId);
  if (!lib) return homeView();
  const u = ui(libId);
  const filtered = sortAlbums(applyFilters(lib.albums, u), u.sort);
  return `<div class="view">
    <button class="back-link" data-act="go-home">← All libraries</button>
    <div class="page-head">
      <div>
        <h1><span class="lib-dot" style="background:${esc(lib.color)};display:inline-block;width:14px;height:14px;margin-right:6px"></span>${esc(lib.name)}</h1>
        <p class="page-sub">${esc(lib.description || '')}</p>
      </div>
      <div class="head-actions">
        <button class="btn btn-accent" data-act="add-album">＋ Add album</button>
        <button class="icon-btn" data-act="edit-lib" aria-label="Edit library" title="Edit library">✎</button>
        <button class="icon-btn" data-act="del-lib" aria-label="Delete library" title="Delete library">🗑</button>
      </div>
    </div>
    ${toolbarHTML(lib, u, lib.albums)}
    <p class="result-count">${filtered.length} of ${lib.albums.length} albums</p>
    <div id="results">${albumsGridHTML(filtered, u)}</div>
  </div>`;
}

/* ---------- Favorites ---------- */
function favoritesView(){
  const favs = sortAlbums(allAlbums().filter(a => a.favorite), 'artist');
  return `<div class="view">
    <div class="page-head">
      <div><h1>♥ Favorites</h1><p class="page-sub">${favs.length} favorite albums across all libraries</p></div>
    </div>
    ${favs.length
      ? `<div class="album-grid">${favs.map((a, i) => albumCardHTML(a, i, true)).join('')}</div>`
      : `<div class="empty-state"><div class="big">♡</div><h3>No favorites yet</h3>
         <p>Hover an album and tap the heart to keep your best records here.</p></div>`}
  </div>`;
}

/* ---------- View events ---------- */
function bindView(){
  const v = $('#view');

  v.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    const act = el.dataset.act;
    if (act === 'open-lib') go('library', el.dataset.lib);
    if (act === 'new-lib') openLibForm();
    if (act === 'go-home') go('home');
    if (act === 'add-album') openSpotifySearch(route.libId);
    if (act === 'edit-lib') openLibForm(findLib(route.libId));
    if (act === 'del-lib') confirmDeleteLib(route.libId);
    if (act === 'clear-filters'){ Object.assign(ui(route.libId), { q: '', genre: '', country: '', decade: '', sort: ui(route.libId).sort }); ui(route.libId).tags.clear(); render(); }
  }));

  const search = v.querySelector('#searchBox');
  if (search){
    search.addEventListener('input', () => {
      ui(route.libId).q = search.value;
      // live-update only the results, keep focus in the box
      const lib = findLib(route.libId); const u = ui(route.libId);
      const filtered = sortAlbums(applyFilters(lib.albums, u), u.sort);
      v.querySelector('.result-count').textContent = `${filtered.length} of ${lib.albums.length} albums`;
      const results = v.querySelector('#results');
      results.innerHTML = albumsGridHTML(filtered, u);
      bindAlbumCards(results);
    });
  }
  v.querySelectorAll('[data-filter]').forEach(sel => sel.addEventListener('change', () => {
    ui(route.libId)[sel.dataset.filter] = sel.value; render();
  }));
  v.querySelectorAll('[data-tag]').forEach(chip => chip.addEventListener('click', () => {
    const tags = ui(route.libId).tags; const t = chip.dataset.tag;
    tags.has(t) ? tags.delete(t) : tags.add(t); render();
  }));

  bindAlbumCards(v);
}

function bindAlbumCards(scope){
  scope.querySelectorAll('.album-card').forEach(card => {
    const libId = card.dataset.albumlib, albumId = card.dataset.album;
    const open = () => openAlbumDetail(libId, albumId);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
  scope.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); playAlbum();
  }));
  scope.querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const card = b.closest('.album-card');
    toggleFav(card.dataset.albumlib, card.dataset.album);
  }));
}

function playAlbum(){
  toast('Spotify playback coming soon — this button will play on your device 🎵', '▶');
}
async function toggleFav(libId, albumId){
  const a = findLib(libId)?.albums.find(x => x.id === albumId);
  if (!a) return;
  try {
    const updated = await api(`albums/${albumId}/favorite/`, 'POST');
    a.favorite = updated.favorite;
    render();
    toast(a.favorite ? `Added “${a.title}” to favorites` : `Removed “${a.title}” from favorites`, a.favorite ? '♥' : '♡');
  } catch (err){ toast(err.message, '⚠'); }
}

/* ---------- Modals ---------- */
function openModal(html, wide = false){
  closeModal();
  const bd = document.createElement('div');
  bd.className = 'modal-backdrop';
  bd.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  bd.addEventListener('click', e => { if (e.target === bd) closeModal(); });
  $('#modalRoot').appendChild(bd);
  const first = bd.querySelector('input,select,button');
  if (first) first.focus();
  return bd;
}
function closeModal(){ $('#modalRoot').innerHTML = ''; }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === '/' && !e.target.matches('input,select,textarea')){ e.preventDefault(); $('#searchBox')?.focus(); }
});

/* ---------- Album detail modal ---------- */
function openAlbumDetail(libId, albumId){
  const lib = findLib(libId); const a = lib?.albums.find(x => x.id === albumId);
  if (!a) return;
  const bd = openModal(`
    <button class="icon-btn modal-close" data-x aria-label="Close">✕</button>
    <div class="detail">
      <img class="cover" src="${esc(coverOf(a))}" alt="Cover of ${esc(a.title)}">
      <div>
        <h2>${esc(a.title)}</h2>
        <div class="artist">${esc(a.artist)}</div>
        <dl class="spec">
          <dt>Year</dt><dd>${a.year}</dd>
          <dt>Genre</dt><dd>${esc(a.genre)}</dd>
          <dt>Country</dt><dd>${esc(a.country)}</dd>
          ${a.label ? `<dt>Label</dt><dd>${esc(a.label)}</dd>` : ''}
          <dt>Library</dt><dd>${esc(lib.name)}</dd>
        </dl>
        ${(a.tags || []).length ? `<div class="detail-tags">${a.tags.map(t => `<span class="tg">#${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="detail-actions">
          <button class="btn btn-accent" data-d="play">▶ Play on Spotify</button>
          <button class="btn btn-ghost" data-d="fav">${a.favorite ? '♥ Unfavorite' : '♡ Favorite'}</button>
          <button class="btn btn-ghost" data-d="edit">✎ Edit</button>
          <button class="btn btn-danger" data-d="del">Delete</button>
        </div>
      </div>
    </div>`, true);
  bd.querySelector('[data-x]').onclick = closeModal;
  bd.querySelector('[data-d="play"]').onclick = playAlbum;
  bd.querySelector('[data-d="fav"]').onclick = () => { toggleFav(libId, albumId); closeModal(); };
  bd.querySelector('[data-d="edit"]').onclick = () => openAlbumForm(libId, a);
  bd.querySelector('[data-d="del"]').onclick = async () => {
    if (confirm(`Delete “${a.title}” by ${a.artist}?`)){
      try {
        await api(`albums/${albumId}/`, 'DELETE');
        await refreshState();
        closeModal(); render(); toast('Album deleted', '🗑');
      } catch (err){ toast(err.message, '⚠'); }
    }
  };
}

/* ---------- Spotify search (add-album flow) ---------- */
function openSpotifySearch(libId){
  const lib = findLib(libId);
  if (!lib) return;
  let lastResults = null;
  const bd = openModal(`
    <button class="icon-btn modal-close" data-x aria-label="Close">✕</button>
    <h2>Add album to ${esc(lib.name)}</h2>
    <div class="sp-search-bar">
      <input id="spQuery" type="search" placeholder="Search Spotify — artist or album name…" aria-label="Search Spotify">
      <button class="btn btn-accent" id="spGo">Search</button>
    </div>
    <div id="spBody"><p class="sp-hint">Type an artist to browse their albums, or search an album straight away.</p></div>
    <div class="modal-actions sp-manual-row">
      <button class="btn btn-ghost" id="spManual">✎ Enter album manually instead</button>
    </div>`, true);
  const input = bd.querySelector('#spQuery');
  const body = bd.querySelector('#spBody');

  const renderResults = () => {
    if (!lastResults.length){
      body.innerHTML = '<p class="sp-hint">No albums found — try a different search.</p>';
      return;
    }
    body.innerHTML = `<div class="sp-grid">${lastResults.map(r => `
      <button class="sp-card" data-sp="${esc(r.spotify_id)}">
        <img src="${esc(r.cover_url || genCover(r.artists.join(', '), r.name))}" alt="" loading="lazy">
        <span class="sp-t">${esc(r.name)}</span>
        <span class="sp-a">${esc(r.artists.join(', '))}</span>
        <span class="sp-y">${esc((r.release_date || '').slice(0, 4))}${r.album_type && r.album_type !== 'album' ? ' · ' + esc(r.album_type) : ''}</span>
      </button>`).join('')}</div>`;
    body.querySelectorAll('[data-sp]').forEach(c => c.onclick = () => showPreview(c.dataset.sp));
  };

  async function runSearch(){
    const q = input.value.trim();
    if (!q) return;
    body.innerHTML = '<p class="sp-hint">Searching Spotify…</p>';
    try {
      const data = await api(`spotify/search/?q=${encodeURIComponent(q)}&limit=20`);
      lastResults = data.results;
      renderResults();
    } catch (err){ body.innerHTML = `<p class="sp-hint">⚠ ${esc(err.message)}</p>`; }
  }

  async function showPreview(spotifyId){
    body.innerHTML = '<p class="sp-hint">Loading album…</p>';
    try {
      const a = await api(`spotify/albums/${encodeURIComponent(spotifyId)}/`);
      const artists = (a.artists || []).join(', ');
      body.innerHTML = `
        <div class="sp-preview">
          <img src="${esc(a.cover_url || genCover(artists, a.name))}" alt="Cover of ${esc(a.name)}">
          <div>
            <h3>${esc(a.name)}</h3>
            <div class="sp-a">${esc(artists)}</div>
            <dl class="spec">
              <dt>Released</dt><dd>${esc(a.release_date || '—')}</dd>
              <dt>Tracks</dt><dd>${a.total_tracks ?? '—'}</dd>
              ${a.label ? `<dt>Label</dt><dd>${esc(a.label)}</dd>` : ''}
              ${a.album_type ? `<dt>Type</dt><dd>${esc(a.album_type)}</dd>` : ''}
            </dl>
            ${a.external_url ? `<a class="sp-link" href="${esc(a.external_url)}" target="_blank" rel="noopener">Open in Spotify ↗</a>` : ''}
            <div class="detail-actions">
              <button class="btn btn-ghost" id="spBack">← Results</button>
              <button class="btn btn-accent" id="spUse">💾 Save to library</button>
            </div>
          </div>
        </div>`;
      bd.querySelector('#spBack').onclick = () => lastResults ? renderResults() : runSearch();
      bd.querySelector('#spUse').onclick = () => openAlbumForm(libId, null, a);
    } catch (err){ body.innerHTML = `<p class="sp-hint">⚠ ${esc(err.message)}</p>`; }
  }

  let debounce;
  input.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(runSearch, 450); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); clearTimeout(debounce); runSearch(); } });
  bd.querySelector('#spGo').onclick = () => { clearTimeout(debounce); runSearch(); };
  bd.querySelector('#spManual').onclick = () => openAlbumForm(libId);
  bd.querySelector('[data-x]').onclick = closeModal;
  input.focus();
}

/* ---------- Album form ---------- */
function openAlbumForm(libId, album = null, spotify = null){
  const lib = findLib(libId);
  // `spotify` is a normalized album from the Spotify picker: prefill the
  // form with its metadata and download the cover server-side on save.
  const a = album || (spotify ? {
    title: spotify.name || '', artist: (spotify.artists || []).join(', '),
    year: +String(spotify.release_date || '').slice(0, 4) || new Date().getFullYear(),
    genre: (spotify.genres || [])[0] || '', country: '', label: spotify.label || '',
    cover: spotify.cover_url || '', spotifyUri: spotify.spotify_uri || '', tags: [], favorite: false,
  } : { title: '', artist: '', year: new Date().getFullYear(), genre: '', country: '', label: '', cover: '', spotifyUri: '', tags: [], favorite: false });
  let tags = [...(a.tags || [])];
  const bd = openModal(`
    <h2>${album ? 'Edit album' : 'Add album to ' + esc(lib.name)}</h2>
    <form id="albumForm">
      <div class="field"><label for="f-title">Album title *</label><input id="f-title" required value="${esc(a.title)}" placeholder="e.g. Random Access Memories"></div>
      <div class="field"><label for="f-artist">Artist / group *</label><input id="f-artist" required value="${esc(a.artist)}" placeholder="e.g. Daft Punk"></div>
      <div class="field-row">
        <div class="field"><label for="f-year">Release year *</label><input id="f-year" type="number" min="1900" max="2100" required value="${a.year}"></div>
        <div class="field"><label for="f-genre">Genre *</label><input id="f-genre" required value="${esc(a.genre)}" placeholder="e.g. Electronic" list="genreList">
          <datalist id="genreList">${[...new Set(allAlbums().map(x => x.genre))].map(g => `<option value="${esc(g)}">`).join('')}</datalist></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="f-country">Country *</label><input id="f-country" required value="${esc(a.country)}" placeholder="e.g. France" list="countryList">
          <datalist id="countryList">${[...new Set(allAlbums().map(x => x.country))].map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
        <div class="field"><label for="f-label">Record label</label><input id="f-label" value="${esc(a.label || '')}" placeholder="optional"></div>
      </div>
      <div class="field"><label for="f-tags-in">Tags <span style="text-transform:none;font-weight:400">(unlimited — press Enter to add)</span></label>
        <div class="tag-editor" id="tagEditor"><input id="f-tags-in" placeholder="add a tag…" aria-label="Add tag"></div>
      </div>
      <div class="field"><label for="f-cover">Cover image URL</label>
        <input id="f-cover" type="url" value="${esc(a.cover || '')}" placeholder="https://i.scdn.co/image/… (640×640 works great)">
        <p class="hint">${spotify
          ? 'This cover comes from Spotify — it will be downloaded and stored in your vault.'
          : "Leave empty and I'll generate a nice vinyl-style cover automatically."}</p></div>
      <div class="field"><label for="f-uri">Spotify URI / link</label>
        <input id="f-uri" value="${esc(a.spotifyUri || '')}" placeholder="spotify:album:… (used later for the Play button)"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-x>Cancel</button>
        <button type="submit" class="btn btn-accent">${album ? 'Save changes' : 'Add album'}</button>
      </div>
    </form>`);
  const editor = bd.querySelector('#tagEditor');
  const tagInput = bd.querySelector('#f-tags-in');
  const renderTags = () => {
    editor.querySelectorAll('.tg').forEach(t => t.remove());
    tags.forEach((t, i) => {
      const s = document.createElement('span');
      s.className = 'tg';
      s.innerHTML = `${esc(t)}<button type="button" aria-label="Remove tag ${esc(t)}">✕</button>`;
      s.querySelector('button').onclick = () => { tags.splice(i, 1); renderTags(); };
      editor.insertBefore(s, tagInput);
    });
  };
  renderTags();
  editor.addEventListener('click', () => tagInput.focus());
  tagInput.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.value.trim()){
      e.preventDefault();
      const t = tagInput.value.trim().toLowerCase();
      if (!tags.includes(t)) tags.push(t);
      tagInput.value = ''; renderTags();
    } else if (e.key === 'Backspace' && !tagInput.value && tags.length){
      tags.pop(); renderTags();
    }
  });
  bd.querySelector('[data-x]').onclick = closeModal;
  bd.querySelector('#albumForm').addEventListener('submit', async e => {
    e.preventDefault();
    const g = id => bd.querySelector(id).value.trim();
    const data = { title: g('#f-title'), artist: g('#f-artist'), year: +g('#f-year'),
      genre: g('#f-genre'), country: g('#f-country'), label: g('#f-label'),
      cover: g('#f-cover'), spotifyUri: g('#f-uri'), tags,
      downloadCover: !!spotify };
    try {
      if (album){ await api(`albums/${album.id}/`, 'PUT', data); toast('Album updated'); }
      else { await api(`libraries/${libId}/albums/`, 'POST', data); toast(`Added “${data.title}” to ${lib.name}`); }
      await refreshState();
      closeModal(); render();
    } catch (err){ toast(err.message, '⚠'); }
  });
}

/* ---------- Library form ---------- */
const LIB_COLORS = ['#e0654a','#4a90e0','#1ed760','#b678e8','#ffcf5c','#ff5c8a','#4ad4c9','#8a93a5'];
function openLibForm(lib = null){
  const cur = lib || { name: '', description: '', color: LIB_COLORS[state.libraries.length % LIB_COLORS.length] };
  let color = cur.color;
  const bd = openModal(`
    <h2>${lib ? 'Edit library' : 'New library'}</h2>
    <form id="libForm">
      <div class="field"><label for="l-name">Name *</label><input id="l-name" required value="${esc(cur.name)}" placeholder="e.g. Jazz Nights"></div>
      <div class="field"><label for="l-desc">Description</label><input id="l-desc" value="${esc(cur.description || '')}" placeholder="What lives in this library?"></div>
      <div class="field"><label>Color</label><div class="color-row">
        ${LIB_COLORS.map(c => `<button type="button" class="color-sw ${c === color ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('')}
      </div></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-x>Cancel</button>
        <button type="submit" class="btn btn-accent">${lib ? 'Save' : 'Create library'}</button>
      </div>
    </form>`);
  bd.querySelectorAll('.color-sw').forEach(b => b.onclick = () => {
    color = b.dataset.c;
    bd.querySelectorAll('.color-sw').forEach(x => x.classList.toggle('on', x === b));
  });
  bd.querySelector('[data-x]').onclick = closeModal;
  bd.querySelector('#libForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = bd.querySelector('#l-name').value.trim();
    const description = bd.querySelector('#l-desc').value.trim();
    try {
      if (lib){
        await api(`libraries/${lib.id}/`, 'PUT', { name, description, color });
        await refreshState();
        toast('Library updated');
        closeModal(); render();
      } else {
        const nl = await api('libraries/', 'POST', { name, description, color });
        await refreshState();
        closeModal(); go('library', nl.id);
        toast(`Library “${name}” created — add your first album!`);
      }
    } catch (err){ toast(err.message, '⚠'); }
  });
}

async function confirmDeleteLib(libId){
  const lib = findLib(libId);
  if (!lib) return;
  if (confirm(`Delete library “${lib.name}” and its ${lib.albums.length} albums? This cannot be undone.\n(Tip: Export a backup first from the sidebar.)`)){
    try {
      await api(`libraries/${libId}/`, 'DELETE');
      await refreshState();
      go('home'); toast('Library deleted', '🗑');
    } catch (err){ toast(err.message, '⚠'); }
  }
}

/* ---------- Export / Import ---------- */
$('#exportBtn').onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vinylvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('Backup downloaded', '⭳');
};
$('#importBtn').onclick = () => $('#importFile').click();
$('#importFile').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = async () => {
    try {
      const data = JSON.parse(r.result);
      if (!Array.isArray(data.libraries)) throw new Error('Invalid backup file');
      state = await api('import/', 'POST', data);
      go('home'); toast('Backup restored ✓');
    } catch (err){ toast(err.message || 'Invalid backup file', '⚠'); }
  };
  r.readAsText(f); e.target.value = '';
});

$('#newLibBtn').onclick = () => openLibForm();
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');

/* ---------- Boot ---------- */
(async () => {
  try { await refreshState(); }
  catch (err){ toast(err.message, '⚠'); }
  render();
})();
