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
Object.defineProperty(window.document, 'cookie', { value: 'csrftoken=fake-csrf-token', writable: true })

const fakeState = {
  libraries: [
    {
      id: '1',
      name: 'Rock',
      description: 'Guitars',
      color: '#e0654a',
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
window.fetch = async (url, options = {}) => {
  const path = String(url)
  const method = options.method || 'GET'
  if (path.includes('/api/state/')) return json(fakeState)
  if (path.includes('/api/spotify/status/')) return json({ connected: false })
  if (path.endsWith('/api/libraries/') && method === 'POST') {
    const body = JSON.parse(options.body)
    const created = {
      id: String(nextLibraryId++),
      name: body.name,
      description: body.description || '',
      color: body.color || '#e0654a',
      createdAt: Date.now(),
      albums: [],
    }
    fakeState.libraries.push(created)
    return json(created, 201)
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
  ['shows the VinylVault brand', html.includes('VinylVault')],
  ['shows the Home view heading', html.includes('Your Libraries')],
  ['renders the mocked library name', html.includes('Rock')],
  ['renders the correct library/album counts', html.includes('1 libraries') && html.includes('1 albums')],
  ['shows the Spotify connect button', html.includes('Connect Spotify')],
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

// Navigate to Favorites and check the (favorited, in the fake state) album shows up there too.
clickButtonContaining('Favorites')
await new Promise((r) => setTimeout(r, 50))
const favoritesHtml = window.document.getElementById('root').innerHTML
checks.push(
  ['favorites view: shows the favorites heading', favoritesHtml.includes('♥ Favorites')],
  ['favorites view: renders the favorited album with its library name', favoritesHtml.includes('OK Computer') && favoritesHtml.includes('Rock')],
)

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
const createBtn = [...window.document.querySelectorAll('button')].find((b) => b.textContent === 'Create library')
if (!createBtn) throw new Error('Could not find the "Create library" submit button')
createBtn.click()
await new Promise((r) => setTimeout(r, 100))
const afterCreateHtml = window.document.getElementById('root').innerHTML
checks.push(
  ['library form: modal closes after creating', !window.document.querySelector('.modal-backdrop')],
  ['library form: navigates into the new library', afterCreateHtml.includes('0 of 0 albums')],
  ['library form: new library appears in the sidebar', afterCreateHtml.includes('Jazz Nights')],
)

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
