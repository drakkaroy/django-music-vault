/**
 * Runtime smoke test for the built React bundle: mounts app.js in jsdom
 * against mocked API responses and asserts real component output.
 *
 * Exists because this environment has no real browser available for
 * visual verification during the React migration — `npm run build` and
 * `tsc` only prove the code compiles, not that it actually renders
 * correctly. Run after `npm run build`: `npm run smoke`.
 */
import { JSDOM } from 'jsdom'
import { readFile } from 'node:fs/promises'

const APP_JS = '../music_vault/static/music_vault/react-app/app.js'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://127.0.0.1:8899/react/',
  runScripts: 'dangerously',
  resources: 'usable',
})
const { window } = dom
window.MV_BASE = '/'
window.MV_LOGOUT_URL = '/accounts/logout/'
// jsdom doesn't implement these (used by the Export button's Blob download).
window.URL.createObjectURL = () => 'blob:mock-url'
window.URL.revokeObjectURL = () => {}
Object.defineProperty(window.document, 'cookie', { value: 'csrftoken=fake-csrf-token', writable: true })

const fakeState = {
  username: 'drakksmoke',
  libraries: [
    {
      id: '1',
      name: 'Rock',
      description: 'Guitars',
      color: '#e0654a',
      slug: 'rock',
      isPublic: false,
      createdAt: Date.now(),
      albums: [
        {
          id: '10',
          title: 'OK Computer',
          artist: 'Radiohead',
          year: 1997,
          genre: 'Alt Rock',
          country: 'UK',
          label: '',
          cover: '',
          coverFile: '',
          spotifyUri: '',
          tags: ['90s'],
          tracks: [{ trackNumber: 1, title: 'Airbag', durationMs: 284000, spotifyUri: '' }],
          favorite: true,
          rating: 5,
          addedAt: Date.now(),
        },
      ],
    },
  ],
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

let nextLibraryId = 2
let nextAlbumId = 100
let lastAlbumCreatePayload = null
let lastLibraryCreatePayload = null
const slugifyMock = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
window.fetch = async (url, options = {}) => {
  const path = String(url)
  const method = options.method || 'GET'
  if (path.includes('/api/state/')) return json(fakeState)
  if (path.includes('/api/spotify/status/')) return json({ connected: false })
  if (path.includes('/api/spotify/now-playing/')) {
    // Should never actually be hit — spotifyConnected is false in this
    // fixture, and NowPlayingCard doesn't poll while disconnected.
    return json({ playing: true, track: 'Should not render', artist: 'Nobody', deviceName: 'Nowhere' })
  }
  if (path.includes('/api/spotify/search/')) {
    return json({
      results: [
        {
          spotify_id: 'abc123',
          spotify_uri: 'spotify:album:abc123',
          name: 'Discovery',
          artists: ['Daft Punk'],
          release_date: '2001-03-12',
          total_tracks: 2,
          cover_url: null,
          external_url: 'https://open.spotify.com/album/abc123',
          album_type: 'album',
          label: '',
          genres: [],
          tracks: [],
        },
      ],
    })
  }
  if (path.includes('/api/spotify/albums/abc123/')) {
    return json({
      spotify_id: 'abc123',
      spotify_uri: 'spotify:album:abc123',
      name: 'Discovery',
      artists: ['Daft Punk'],
      release_date: '2001-03-12',
      total_tracks: 2,
      cover_url: null,
      external_url: 'https://open.spotify.com/album/abc123',
      album_type: 'album',
      label: 'Daft Life',
      genres: ['Electronic'],
      tracks: [
        { track_number: 1, title: 'One More Time', duration_ms: 320000, spotify_uri: 'spotify:track:1' },
        { track_number: 2, title: 'Aerodynamic', duration_ms: 212000, spotify_uri: 'spotify:track:2' },
      ],
    })
  }
  if (path.endsWith('/api/libraries/') && method === 'POST') {
    const body = JSON.parse(options.body)
    lastLibraryCreatePayload = body
    const created = {
      id: String(nextLibraryId++),
      name: body.name,
      description: body.description || '',
      color: body.color || '#e0654a',
      slug: slugifyMock(body.name) || 'library',
      isPublic: Boolean(body.isPublic),
      createdAt: Date.now(),
      albums: [],
    }
    fakeState.libraries.push(created)
    return json(created, 201)
  }
  const albumsMatch = path.match(/\/api\/libraries\/(\w+)\/albums\/$/)
  if (albumsMatch && method === 'POST') {
    const body = JSON.parse(options.body)
    lastAlbumCreatePayload = body
    const library = fakeState.libraries.find((l) => l.id === albumsMatch[1])
    const created = {
      id: String(nextAlbumId++),
      title: body.title,
      artist: body.artist,
      year: body.year,
      genre: body.genre,
      country: body.country,
      label: body.label || '',
      cover: body.cover || '',
      coverFile: '',
      spotifyUri: body.spotifyUri || '',
      tags: body.tags || [],
      tracks: (body.tracks || []).map((t) => ({
        trackNumber: t.trackNumber,
        title: t.title,
        durationMs: t.durationMs,
        spotifyUri: t.spotifyUri || '',
      })),
      favorite: false,
      rating: body.rating || 0,
      addedAt: Date.now(),
    }
    library.albums.push(created)
    return json(created, 201)
  }
  if (path.endsWith('/api/import/') && method === 'POST') {
    const body = JSON.parse(options.body)
    fakeState.libraries = body.libraries.map((lib, i) => ({
      id: `imported-${i}`,
      name: lib.name,
      description: lib.description || '',
      color: lib.color || '#e0654a',
      createdAt: Date.now(),
      albums: (lib.albums || []).map((a, j) => ({
        id: `imported-album-${i}-${j}`,
        title: a.title,
        artist: a.artist,
        year: a.year,
        genre: a.genre,
        country: a.country,
        label: a.label || '',
        cover: a.cover || '',
        coverFile: '',
        spotifyUri: a.spotifyUri || '',
        tags: a.tags || [],
        tracks: a.tracks || [],
        favorite: Boolean(a.favorite),
        rating: a.rating || 0,
        addedAt: Date.now(),
      })),
    }))
    return json(fakeState)
  }
  throw new Error(`Unmocked fetch in smoke test: ${method} ${path}`)
}

// Make jsdom's globals available to the bundle the way a real browser page would.
for (const key of ['window', 'document', 'navigator', 'location', 'history', 'fetch', 'HTMLElement', 'customElements', 'MutationObserver']) {
  if (!(key in window)) continue
  try {
    globalThis[key] = window[key]
  } catch {
    /* Node already defines some of these (e.g. navigator) as read-only globals */
  }
}

let code
try {
  code = await readFile(APP_JS, 'utf8')
} catch {
  console.error(`Could not read ${APP_JS} — run "npm run build" first.`)
  process.exit(1)
}
// Vite emits an ES module; a data: URI lets Node import it dynamically.
await import(`data:text/javascript;base64,${Buffer.from(code, 'utf8').toString('base64')}`)

// Let the async boot effect (fetch + setState + re-render) settle.
await new Promise((r) => setTimeout(r, 200))

const html = window.document.getElementById('root').innerHTML

const checks = [
  ['renders something into #root', html.length > 0],
  ['shows the Music Vault brand', html.includes('Music Vault')],
  ['shows the Home view heading', html.includes('Your Libraries')],
  ['renders the mocked library name', html.includes('Rock')],
  ['renders the correct library/album counts', html.includes('1 libraries') && html.includes('1 albums')],
  ['shows the Spotify connect button', html.includes('Connect Spotify')],
  ['now-playing card stays hidden while Spotify is disconnected', !html.includes('now-playing')],
]

function clickButtonContaining(text) {
  const button = [...window.document.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
  if (!button) throw new Error(`No <button> found containing "${text}"`)
  button.click()
}

// Navigate into the "Rock" library (real click, not just initial render) and
// check the toolbar + album card actually mounted.
clickButtonContaining('Rock')
await new Promise((r) => setTimeout(r, 50))
const libraryHtml = window.document.getElementById('root').innerHTML
checks.push(
  ['library view: shows the library description (unique to this page)', libraryHtml.includes('Guitars')],
  ['library view: shows the toolbar search box', libraryHtml.includes('Search album, artist, tag')],
  ['library view: renders the album card', libraryHtml.includes('OK Computer') && libraryHtml.includes('Radiohead')],
  ['library view: shows the result count', libraryHtml.includes('1 of 1 albums')],
)

// Covers view: toggle from the library's view-toggle control — meta text
// (title/artist/year/genre) disappears, but the cover image and the
// aria-labelled play/favorite hover controls stay in the DOM.
const coversToggleBtn = window.document.querySelector('[aria-label="Covers only view"]')
if (!coversToggleBtn) throw new Error('Covers view toggle button not found')
coversToggleBtn.click()
await new Promise((r) => setTimeout(r, 30))
const coversHtml = window.document.getElementById('root').innerHTML
checks.push(
  // "Alt Rock" alone also appears in the toolbar's genre filter <option>,
  // so check the meta line's distinctive "year · genre" combo instead.
  ['covers view: hides album meta text', !coversHtml.includes('1997 · Alt Rock')],
  ['covers view: keeps the cover image', coversHtml.includes('Cover of OK Computer')],
  [
    'covers view: keeps play/favorite hover controls',
    coversHtml.includes('Play OK Computer on Spotify') && coversHtml.includes('Remove from favorites'),
  ],
)
// Switch back to detailed for the rest of the scenarios below, which check
// title/artist text rendered on the cards.
window.document.querySelector('[aria-label="Detailed view"]').click()
await new Promise((r) => setTimeout(r, 30))

// Open the album's detail modal (real click on the card) and its tracklist.
const albumCard = window.document.querySelector('[aria-label="OK Computer by Radiohead"]')
if (!albumCard) throw new Error('Album card not found (aria-label mismatch?)')
albumCard.click()
await new Promise((r) => setTimeout(r, 50))
const detailHtml = window.document.getElementById('root').innerHTML
checks.push(
  ['album detail: shows the album title as a heading', detailHtml.includes('<h2>OK Computer</h2>')],
  [
    'album detail: shows Play/Tracklist/Favorite/Edit/Delete actions',
    ['Play on Spotify', 'Tracklist', 'Unfavorite', 'Edit', 'Delete'].every((s) => detailHtml.includes(s)),
  ],
  ['album detail: shows its 5-star rating', detailHtml.includes('5 out of 5 stars')],
)

clickButtonContaining('Tracklist')
await new Promise((r) => setTimeout(r, 50))
const tracklistHtml = window.document.getElementById('root').innerHTML
checks.push([
  'tracklist modal: shows the track title and formatted duration (284000ms -> 4:44)',
  tracklistHtml.includes('Airbag') && tracklistHtml.includes('4:44'),
])

// Escape closes the topmost (and only) modal — back to the library view.
window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
await new Promise((r) => setTimeout(r, 30))
checks.push(['tracklist modal: Escape closes it', !window.document.querySelector('.modal-backdrop')])

// Navigate to Favorites and check the (favorited, in the fake state) album shows up there too.
clickButtonContaining('Favorites')
await new Promise((r) => setTimeout(r, 50))
const favoritesHtml = window.document.getElementById('root').innerHTML
checks.push(
  ['favorites view: shows the favorites heading', favoritesHtml.includes('♥ Favorites')],
  ['favorites view: renders the favorited album with its library name', favoritesHtml.includes('OK Computer') && favoritesHtml.includes('Rock')],
)

// Statistics: one library, one 5-star album ("OK Computer", genre "Alt
// Rock", tag "90s") — check the summary tiles and the top-rated list.
clickButtonContaining('Statistics')
await new Promise((r) => setTimeout(r, 50))
const statsHtml = window.document.getElementById('root').innerHTML
checks.push(
  ['stats view: shows the statistics heading', statsHtml.includes('📊 Statistics')],
  ['stats view: total album count', /<div class="stat-tile-value">1<\/div>/.test(statsHtml)],
  ['stats view: shows the genre breakdown', statsHtml.includes('Alt Rock')],
  ['stats view: shows the top tag with its count', statsHtml.includes('#90s · 1')],
  ['stats view: shows the top-rated album', statsHtml.includes('OK Computer') && statsHtml.includes('Radiohead')],
  [
    'stats view: prompts to connect Spotify for "most listened" when disconnected',
    statsHtml.includes('Most listened on Spotify') && statsHtml.includes('Connect your Spotify account'),
  ],
)
const topRatedItem = window.document.querySelector('[aria-label="Open OK Computer by Radiohead"]')
if (!topRatedItem) throw new Error('Top-rated album item not found in the statistics view')
topRatedItem.click()
await new Promise((r) => setTimeout(r, 50))
checks.push([
  'stats view: clicking a top-rated album opens its detail modal',
  Boolean(window.document.querySelector('.modal-backdrop')),
])
window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
await new Promise((r) => setTimeout(r, 30))

// React instruments HTMLInputElement's `value` setter to track changes for
// controlled inputs; a plain `input.value = x` goes through that same
// instrumented setter, so React's tracker sees "no change" and never fires
// onChange. Using the *native* prototype setter first (same trick React
// Testing Library's fireEvent.change uses) avoids that.
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
function setInputValue(input, value) {
  nativeInputValueSetter.call(input, value)
  input.dispatchEvent(new window.Event('input', { bubbles: true }))
}

// Create a library through the real modal: open it, fill the name, submit,
// and confirm the app navigates into the newly created library.
clickButtonContaining('New library')
await new Promise((r) => setTimeout(r, 50))
const nameInput = window.document.querySelector('#l-name')
if (!nameInput) throw new Error('Library form modal did not open (no #l-name input found)')
setInputValue(nameInput, 'Jazz Nights')

// Public-sharing toggle: check it, confirm the share-link row only appears
// once checked (there's no library yet in create mode, so no link to show
// — that only appears when editing an existing, already-created library).
const publicCheckbox = window.document.querySelector('.checkbox-label input[type="checkbox"]')
if (!publicCheckbox) throw new Error('Library form modal: "Make this library public" checkbox not found')
checks.push(['library form: no share link shown yet in create mode', !window.document.querySelector('.share-row')])
publicCheckbox.click()
await new Promise((r) => setTimeout(r, 20))

const createBtn = [...window.document.querySelectorAll('button')].find((b) => b.textContent === 'Create library')
if (!createBtn) throw new Error('Could not find the "Create library" submit button')
createBtn.click()
await new Promise((r) => setTimeout(r, 100))
const afterCreateHtml = window.document.getElementById('root').innerHTML
checks.push(
  ['library form: modal closes after creating', !window.document.querySelector('.modal-backdrop')],
  ['library form: navigates into the new library', afterCreateHtml.includes('0 of 0 albums')],
  ['library form: new library appears in the sidebar', afterCreateHtml.includes('Jazz Nights')],
  ['library form: isPublic was included in the actual POST payload', lastLibraryCreatePayload?.isPublic === true],
  ['library form: toast announces the public share link', afterCreateHtml.includes('public at') && afterCreateHtml.includes('/drakksmoke/jazz-nights/')],
)

// Reopen the same (now public) library's edit modal and check the share
// link row renders this time, with the right URL.
const editLibraryBtn = window.document.querySelector('[aria-label="Edit library"]')
if (!editLibraryBtn) throw new Error('"Edit library" icon button not found')
editLibraryBtn.click()
await new Promise((r) => setTimeout(r, 50))
const shareInput = window.document.querySelector('.share-row input')
checks.push([
  'library form (edit, public library): share link input shows the right URL',
  shareInput?.value?.includes('/drakksmoke/jazz-nights/'),
])
clickButtonContaining('Cancel')
await new Promise((r) => setTimeout(r, 30))

// Add an album to the (now current) "Jazz Nights" library through the real
// form: required fields, one tag, one track — then check both the DOM and
// the actual POST payload (tags/tracks aren't shown on the card, so the DOM
// alone can't confirm they made it through correctly). "Add album" now opens
// the Spotify search modal first — use its manual-entry escape hatch.
clickButtonContaining('Add album')
await new Promise((r) => setTimeout(r, 50))
clickButtonContaining('Enter album manually instead')
await new Promise((r) => setTimeout(r, 50))
setInputValue(window.document.querySelector('#f-title'), 'Discovery')
setInputValue(window.document.querySelector('#f-artist'), 'Daft Punk')
setInputValue(window.document.querySelector('#f-genre'), 'Electronic')
setInputValue(window.document.querySelector('#f-country'), 'France')

// Tag suggestions come from tags across the whole collection, not just
// this library — "90s" only exists on "Rock"'s "OK Computer" album, and
// we're adding to the just-created "Jazz Nights" library.
const tagInput = window.document.querySelector('[aria-label="Add tag"]')
checks.push([
  'tag editor: suggests an existing tag from another library',
  Boolean(window.document.querySelector('#tag-suggestions option[value="90s"]')),
])
setInputValue(tagInput, 'dance')
tagInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
await new Promise((r) => setTimeout(r, 20))

clickButtonContaining('+ Add track')
await new Promise((r) => setTimeout(r, 20))
setInputValue(window.document.querySelector('.tr-title'), 'One More Time')

const fourthStar = window.document.querySelector('[aria-label="Rate 4 stars"]')
if (!fourthStar) throw new Error('Rating star button not found in the album form')
fourthStar.click()
await new Promise((r) => setTimeout(r, 20))

const addAlbumSubmit = [...window.document.querySelectorAll('button')].find((b) => b.textContent === 'Add album')
if (!addAlbumSubmit) throw new Error('Could not find the "Add album" submit button')
addAlbumSubmit.click()
await new Promise((r) => setTimeout(r, 100))
const afterAlbumHtml = window.document.getElementById('root').innerHTML

checks.push(
  ['album form: modal closes after adding', !window.document.querySelector('.modal-backdrop')],
  ['album form: new album card renders in the library', afterAlbumHtml.includes('Discovery') && afterAlbumHtml.includes('Daft Punk')],
  ['album form: result count updates', afterAlbumHtml.includes('1 of 1 albums')],
  ['album form: tag was included in the actual POST payload', lastAlbumCreatePayload?.tags?.includes('dance')],
  ['album form: track was included in the actual POST payload', lastAlbumCreatePayload?.tracks?.[0]?.title === 'One More Time'],
  ['album form: rating was included in the actual POST payload', lastAlbumCreatePayload?.rating === 4],
)

// Import an album from Spotify search into "Rock" (not "Jazz Nights", which
// already has a manually-created "Discovery" from the previous scenario —
// using the same library would make these checks pass even if the import
// path were broken, since the manual one is already there).
clickButtonContaining('Rock')
await new Promise((r) => setTimeout(r, 50))
clickButtonContaining('Add album')
await new Promise((r) => setTimeout(r, 50))
const spotifySearchInput = window.document.querySelector('[aria-label="Search Spotify"]')
if (!spotifySearchInput) throw new Error('Spotify search modal did not open (no [aria-label="Search Spotify"] input found)')
setInputValue(spotifySearchInput, 'discovery')
const searchSubmitBtn = [...window.document.querySelectorAll('button')].find((b) => b.textContent === 'Search')
if (!searchSubmitBtn) throw new Error('Could not find the Spotify search submit button')
searchSubmitBtn.click()
await new Promise((r) => setTimeout(r, 50))
const spCard = window.document.querySelector('.sp-card')
if (!spCard) throw new Error('No Spotify search result card rendered')
spCard.click()
await new Promise((r) => setTimeout(r, 50))
const previewHtml = window.document.getElementById('root').innerHTML
checks.push([
  'spotify search: preview shows album details from the detail endpoint',
  previewHtml.includes('Discovery') && previewHtml.includes('Daft Punk') && previewHtml.includes('Daft Life'),
])

const saveBtn = [...window.document.querySelectorAll('button')].find((b) => b.textContent?.includes('Save to library'))
if (!saveBtn) throw new Error('Could not find the "Save to library" button')
saveBtn.click()
await new Promise((r) => setTimeout(r, 50))
checks.push(
  ['spotify import: album form prefills title', window.document.querySelector('#f-title')?.value === 'Discovery'],
  ['spotify import: album form prefills artist', window.document.querySelector('#f-artist')?.value === 'Daft Punk'],
  ['spotify import: album form prefills genre', window.document.querySelector('#f-genre')?.value === 'Electronic'],
)

// Country isn't part of Spotify's data, so the (required) field is still
// blank after prefill — fill it in like a real user would before saving.
setInputValue(window.document.querySelector('#f-country'), 'France')
const addAlbumSubmit2 = [...window.document.querySelectorAll('button')].find((b) => b.textContent === 'Add album')
if (!addAlbumSubmit2) throw new Error('Could not find the "Add album" submit button (import flow)')
addAlbumSubmit2.click()
await new Promise((r) => setTimeout(r, 100))
checks.push(
  ['spotify import: downloadCover flag set on the actual POST payload', lastAlbumCreatePayload?.downloadCover === true],
  [
    'spotify import: tracks imported from the Spotify detail response',
    lastAlbumCreatePayload?.tracks?.length === 2 && lastAlbumCreatePayload.tracks[0].title === 'One More Time',
  ],
  ['spotify import: spotifyUri prefilled from the search result', lastAlbumCreatePayload?.spotifyUri === 'spotify:album:abc123'],
)

// Export: just confirm clicking it doesn't throw (jsdom lacks
// URL.createObjectURL, stubbed above) and shows the expected toast.
clickButtonContaining('Export')
await new Promise((r) => setTimeout(r, 30))
checks.push(['export: shows the "Backup downloaded" toast', window.document.getElementById('root').innerHTML.includes('Backup downloaded')])

// Import: simulate picking a file (jsdom has no DataTransfer, so the file
// input's `files` property is overridden directly for this one node).
const backupData = {
  libraries: [
    {
      name: 'Restored Library',
      description: 'From backup',
      color: '#4ad4c9',
      albums: [
        { title: 'Imported Album', artist: 'Some Artist', year: 2020, genre: 'Pop', country: 'US', tags: [], tracks: [] },
      ],
    },
  ],
}
const importFile = new window.File([JSON.stringify(backupData)], 'backup.json', { type: 'application/json' })
const fileInput = window.document.querySelector('input[type="file"]')
if (!fileInput) throw new Error('Import file input not found')
Object.defineProperty(fileInput, 'files', { value: [importFile], configurable: true })
fileInput.dispatchEvent(new window.Event('change', { bubbles: true }))
await new Promise((r) => setTimeout(r, 100))
const afterImportHtml = window.document.getElementById('root').innerHTML
checks.push(
  ['import: navigates home after restoring', afterImportHtml.includes('Your Libraries')],
  ['import: restored library appears', afterImportHtml.includes('Restored Library')],
)

// --- public.js: the read-only public share page (PublicApp.tsx) ---
// Separate bundle, separate jsdom window/global-swap — mounts fresh rather
// than reusing the app.js session above.
const PUBLIC_JS = '../music_vault/static/music_vault/react-app/public.js'

const publicDom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://127.0.0.1:8899/drakk/rock/',
  runScripts: 'dangerously',
  resources: 'usable',
})
const publicWindow = publicDom.window
publicWindow.MV_BASE = '/'
publicWindow.MV_PUBLIC_USERNAME = 'drakk'
publicWindow.MV_PUBLIC_SLUG = 'rock'
const openedUrls = []
publicWindow.open = (url) => {
  openedUrls.push(url)
  return null
}

const publicLibrary = {
  id: '1',
  name: 'Rock',
  description: 'Guitars',
  color: '#e0654a',
  slug: 'rock',
  isPublic: true,
  createdAt: Date.now(),
  albums: [
    {
      id: '10',
      title: 'OK Computer',
      artist: 'Radiohead',
      year: 1997,
      genre: 'Alt Rock',
      country: 'UK',
      label: '',
      cover: '',
      coverFile: '',
      spotifyUri: 'spotify:album:xyz789',
      tags: ['90s'],
      tracks: [{ trackNumber: 1, title: 'Airbag', durationMs: 284000, spotifyUri: 'spotify:track:abc111' }],
      favorite: true,
      rating: 5,
      addedAt: Date.now(),
    },
  ],
}
publicWindow.fetch = async (url) => {
  const path = String(url)
  if (path.includes('/api/public/drakk/rock/')) return json({ library: publicLibrary })
  if (path.includes('/api/public/')) return json({ error: 'Library not found' }, 404)
  throw new Error(`Unmocked fetch in public smoke test: ${path}`)
}

for (const key of ['window', 'document', 'navigator', 'location', 'history', 'fetch', 'HTMLElement', 'customElements', 'MutationObserver']) {
  if (!(key in publicWindow)) continue
  try {
    globalThis[key] = publicWindow[key]
  } catch {
    /* Node already defines some of these (e.g. navigator) as read-only globals */
  }
}

let publicCode
try {
  publicCode = await readFile(PUBLIC_JS, 'utf8')
} catch {
  console.error(`Could not read ${PUBLIC_JS} — run "npm run build" first.`)
  process.exit(1)
}
// data: URI module imports are cached by content, and public.js is
// imported twice below (once per jsdom window) — a cache-busting comment
// keeps the second import from silently reusing the first's cached module
// (and skipping its top-level createRoot().render() call as a result).
function importBundle(code, tag) {
  return import(`data:text/javascript;base64,${Buffer.from(`${code}\n// ${tag}`, 'utf8').toString('base64')}`)
}

await importBundle(publicCode, 'mount:drakk/rock')
await new Promise((r) => setTimeout(r, 200))

const publicHtml = publicWindow.document.getElementById('root').innerHTML
checks.push(
  ['public page: shows the byline with the owner username', publicHtml.includes('Shared by @drakk')],
  ['public page: shows the library name and description', publicHtml.includes('Rock') && publicHtml.includes('Guitars')],
  ['public page: renders the album card', publicHtml.includes('OK Computer') && publicHtml.includes('Radiohead')],
  ['public page: has no "Add album" / edit / delete controls', !publicHtml.includes('＋ Add album') && !publicHtml.includes('aria-label="Edit library"') && !publicHtml.includes('aria-label="Delete library"')],
  ['public page: has no interactive favorite button (read-only)', !publicHtml.includes('Add to favorites') && !publicHtml.includes('Remove from favorites')],
  ['public page: Play button is relabeled "Open ... on Spotify"', publicHtml.includes('Open OK Computer on Spotify')],
)

const publicPlayBtn = publicWindow.document.querySelector('[aria-label="Open OK Computer on Spotify"]')
if (!publicPlayBtn) throw new Error('Public page: card Play/Open button not found')
publicPlayBtn.click()
checks.push(['public page: clicking the card Play button opens the album on open.spotify.com', openedUrls.includes('https://open.spotify.com/album/xyz789')])

const publicCard = publicWindow.document.querySelector('[aria-label="OK Computer by Radiohead"]')
if (!publicCard) throw new Error('Public page: album card not found')
publicCard.click()
await new Promise((r) => setTimeout(r, 50))
const publicDetailHtml = publicWindow.document.getElementById('root').innerHTML
checks.push(
  ['public page detail modal: shows the album title as a heading', publicDetailHtml.includes('<h2>OK Computer</h2>')],
  ['public page detail modal: shows Open-on-Spotify and Tracklist, not Edit/Delete/Favorite', ['▶ Open on Spotify', '☰ Tracklist'].every((s) => publicDetailHtml.includes(s)) && !['Edit', 'Delete', 'Favorite'].some((s) => publicDetailHtml.includes(s))],
)

const tracklistBtn = [...publicWindow.document.querySelectorAll('button')].find((b) => b.textContent?.includes('Tracklist'))
if (!tracklistBtn) throw new Error('Public page: Tracklist button not found')
tracklistBtn.click()
await new Promise((r) => setTimeout(r, 50))
const publicTracklistHtml = publicWindow.document.getElementById('root').innerHTML
checks.push(['public page: tracklist modal shows the track', publicTracklistHtml.includes('Airbag') && publicTracklistHtml.includes('4:44')])

const trackPlayBtn = publicWindow.document.querySelector('.tr-play')
if (!trackPlayBtn) throw new Error('Public page: track play button not found')
trackPlayBtn.click()
checks.push(['public page: clicking a track opens it on open.spotify.com', openedUrls.includes('https://open.spotify.com/track/abc111')])

// A second mount, for a library that doesn't exist (or isn't public) —
// the API 404s and the page should show a "not found" state, not crash.
const notFoundDom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://127.0.0.1:8899/nobody/ghost/',
  runScripts: 'dangerously',
  resources: 'usable',
})
const notFoundWindow = notFoundDom.window
notFoundWindow.MV_BASE = '/'
notFoundWindow.MV_PUBLIC_USERNAME = 'nobody'
notFoundWindow.MV_PUBLIC_SLUG = 'ghost'
notFoundWindow.fetch = async () => json({ error: 'Library not found' }, 404)
for (const key of ['window', 'document', 'navigator', 'location', 'history', 'fetch', 'HTMLElement', 'customElements', 'MutationObserver']) {
  if (!(key in notFoundWindow)) continue
  try {
    globalThis[key] = notFoundWindow[key]
  } catch {
    /* Node already defines some of these (e.g. navigator) as read-only globals */
  }
}
await importBundle(publicCode, 'mount:nobody/ghost')
await new Promise((r) => setTimeout(r, 200))
const notFoundHtml = notFoundWindow.document.getElementById('root').innerHTML
checks.push(['public page: missing/private library shows a not-found state', notFoundHtml.includes('not found')])

let failed = false
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed = true
}
if (failed) {
  console.log('\n--- #root HTML (first 1200 chars) ---')
  console.log(window.document.getElementById('root').innerHTML.slice(0, 1200))
  process.exit(1)
}
