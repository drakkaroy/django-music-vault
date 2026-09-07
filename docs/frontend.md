# Frontend

**The React rewrite (below) is the default UI, served at `/`.** This section first documents the original vanilla HTML/CSS/JS single-page app (no build step, no framework) — kept at `/legacy/` (the `vault` view) for reference/rollback, living under `music_vault/templates/music_vault/` and `music_vault/static/music_vault/` — then covers the React implementation under [React rewrite](#react-rewrite).

## Files and their divergence policy (vanilla app)

| File | Status |
|---|---|
| `vinylvault.html` | Original template + `{% static %}` links, a logout form, and `window.MV_BASE` set for the JS. |
| `styles.css` | **Untouched**, copied verbatim from the original standalone frontend. Never edit this for new features. |
| `spotify.css` | New file — styling for the Spotify search/preview modal and playback UI. Exists so `styles.css` can stay untouched. |
| `script.js` | Adapted. See below for exactly where it diverges from the original. |

`script.js` diverges from the original localStorage-based version in four places only — everything else (rendering, filtering, sorting, the modal system) is the original code:

1. **API persistence layer** (top of file): `API_BASE`, `getCookie`, `api()`, `refreshState()` replace what used to be direct `localStorage` reads/writes. `coverOf()` also gained a preference for `coverFile` (locally downloaded cover) over `cover` (remote URL).
2. **Spotify add-album flow**: `openSpotifySearch()` (search → preview → "Save to library") and the `spotify` parameter added to `openAlbumForm()` for prefilling from a chosen Spotify result.
3. **Spotify Connect wiring**: `playAlbum()`, `updateSpotifyButton()`, `disconnectSpotify()`, `handleSpotifyRedirect()` — the ▶ Play button and the sidebar "Connect Spotify" toggle.
4. **Tracklist**: the track-row editor inside `openAlbumForm()`, `openTracklist()`, and `fmtDuration()`/`parseDuration()` — see below.

If you're adding a feature, keep following this pattern: don't touch `styles.css` or the original rendering code, add new CSS to `spotify.css` (or a new file), and keep new JS logic in clearly separate functions rather than interleaving it into the original render/filter code.

## State and rendering model

No virtual DOM, no diffing — `render()` just regenerates `#view`'s `innerHTML` from the in-memory `state` object and rebinds event listeners (`bindView()`). `state = { libraries: [...] }` is fetched wholesale from `GET api/state/` on boot and after every mutation (`refreshState()`); there's no optimistic/partial update except the live search box, which filters the already-loaded `state` client-side without a round trip.

`route = { view, libId }` is a tiny in-memory router (`home` / `favorites` / `library`) — no History API, no deep links. `uiState` (per-library filters: search text, genre/country/decade/tag filters, sort) is UI-only and never persisted or sent to the server.

## Modals

`openModal()`/`closeModal()` manage a single modal root (`#modalRoot`). Modal-opening functions (`openAlbumForm`, `openLibForm`, `openAlbumDetail`, `openSpotifySearch`) build their HTML as a template string, then wire up event handlers on the returned backdrop element — there's no shared modal component abstraction, each one is self-contained.

`openSpotifySearch(libId)` is the entry point for "＋ Add album": search → grid of results → click a result → preview → "💾 Save to library" hands off to `openAlbumForm(libId, null, spotifyResult)`, which prefills the form and sets `downloadCover: true` on submit so the backend fetches the cover art. The modal also has a "✎ Enter album manually instead" escape hatch straight to the empty form.

## Tracklist

The album form's track section is a **row editor**, not a chip list like tags — each row needs three editable sub-fields (number, title, duration), so unlike `tagEditor`'s "rebuild everything on every change" approach, `renderTrackRows()` only rebuilds the DOM on structural changes (add/remove a row); typing into an existing row's inputs updates the in-memory `tracks` array directly via `input` listeners, with no re-render, so the cursor/focus never jumps mid-edit.

`tracks` is seeded once when the form opens:
- editing an existing album → `album.tracks` (already the frontend's camelCase shape, cloned so editing doesn't mutate `state` before save).
- saving from a Spotify search result → `spotify.tracks`, converted from that endpoint's `snake_case` shape (`track_number`, `duration_ms`, `spotify_uri` — see [backend.md#spotify-integrations](backend.md#spotify-integrations)) into the row editor's camelCase shape.
- a brand-new manual album → `[]`.

Duration is entered/displayed as `m:ss` text and converted to/from milliseconds only at the boundary (`fmtDuration()`/`parseDuration()`) — the stored/submitted value is always `durationMs`, matching the API. On submit, rows with a blank title are dropped (so an unfinished "+ Add track" click doesn't fail validation) and `spotifyUri` (never user-editable — only ever set by an import) is preserved per-row.

`openTracklist(libId, albumId)` — reached via a "☰ Tracklist" button in the album detail modal, shown only when the album has at least one track — is read-only: number, title, formatted duration, and a ▶ button *only on tracks that have a `spotifyUri`* (manually-entered tracks without one just don't get a play button). Clicking ▶ calls `playAlbum(albumId, track.spotifyUri)`, which plays the album's Spotify context starting at that track (not the track in isolation) — see [backend.md#tracks](backend.md#tracks) for why.

## Boot sequence

```js
(async () => {
  await refreshState();                       // GET api/state/
  spotifyConnected = (await api('spotify/status/')).connected;
  handleSpotifyRedirect();                     // reads ?spotify=connected|denied|error from the OAuth callback redirect, then strips it
  updateSpotifyButton();
  render();
})();
```

Static, page-level elements (sidebar's export/import/logout/new-library/Spotify-connect buttons) are bound once here, outside `render()`, since they're not part of the regenerated `#view` HTML.

## React rewrite

The vanilla frontend above has been rewritten in React + TypeScript, built with Vite, and **is now the default UI**, served at `/`. The vanilla app is kept at `/legacy/` for reference/rollback rather than deleted — see below. This section covers the React implementation.

**Where it lives**: `frontend/` at the repo root — a separate Node/TypeScript project, sibling to `music_vault/` and `project/`, *not* part of the installable Python package. See [frontend/README.md](../frontend/README.md) for dev commands.

**Stack, deliberately minimal** (matching this project's "Django + requests only" dependency discipline on the Python side): React + TypeScript via Vite. Styling is **plain CSS with the same custom properties the original `styles.css`/`spotify.css` already used** — no Tailwind, no CSS-in-JS, no CSS Modules; `frontend/src/styles/` is those two files copied verbatim so components can reuse the exact same class names. No React Router (routing is a `useState`-held `{view, libId}`, same as the vanilla app's `route` — there's no History API integration in either version) and no state-management library (a single `VaultContext`/`useVault()` — plain `createContext`/hooks, not a new dependency — holds `state`, `spotifyConnected`, and toasts).

**Component structure**: `src/components/ui/` holds small, generic pieces with no business logic — `Button` (accent/ghost/danger variants over the vanilla `.btn`/`.btn-*` classes), `IconButton`, `FootButton`, `NavItem`, `LibDot`, `TagChip`, `ColorSwatch`, `PlayButton`, `FavButton`, `Modal` (the shared shell every modal uses — Escape/click-outside to close, focuses the first field on open). `src/components/` holds the feature-level pieces built from those: `Sidebar`, `HomeView`, `LibraryView` + `Toolbar` + `AlbumGrid` + `AlbumCard`, `FavoritesView`, and the five modals — `LibraryFormModal`, `AlbumFormModal` (with `TagEditor` and `TrackEditor` as its own sub-components), `AlbumDetailModal`, `TracklistModal`, `SpotifySearchModal`. `App.tsx` holds a single `ModalState` union (`{type: 'library-form' | 'spotify-search' | 'album-form' | 'album-detail' | 'tracklist', ...}` or `null`) instead of a bag of booleans — the same "one modal root" idea as the vanilla app's `#modalRoot`, just typed.

**Build → Django integration**: `vite build` outputs straight into `music_vault/static/music_vault/react-app/` with **fixed, unhashed filenames** (`app.js`, `app.css` — configured via `rollupOptions.output` in `vite.config.ts`), no manifest file, no `django-vite`-style dependency to read one. That output **is committed to git** — installing the package via `pip` never needs Node; only developing the frontend does. Two globals the Django template injects (mirroring `MV_BASE` in the vanilla version) tell the app what it's running against: `window.MV_BASE` and `window.MV_LOGOUT_URL` (the latter because the login/logout URLs live in the *host project's* urlconf, not `music_vault`'s own namespace — see [integration.md](integration.md#4-auth--wire-up-login-styling-comes-for-free) — so the app can't safely assume a path for it).

**Served at `/`, vanilla kept at `/legacy/`**: `music_vault:vault` (`views.vault_react`) now renders `vinylvault_react.html` at the app's root — the URL name `vault` stayed attached to the `""` path through the swap, so `LOGIN_REDIRECT_URL`, the Spotify OAuth redirect-back, and both templates' `window.MV_BASE` (which needs the app's *mount root*, not either page's own path, since `api/` isn't nested under `/legacy/`) all kept working unchanged. The original vanilla view (`views.vault`) moved to `music_vault:vault-legacy` (`/legacy/`).

**Verification without a browser**: this environment has no real browser available (the Claude-in-Chrome extension isn't connected here), so `tsc -b` + a successful `vite build` are necessary but not sufficient proof the app actually works. `frontend/scripts/smoke.mjs` (`npm run smoke`) mounts the *actual built* `app.js` in `jsdom` against mocked `fetch`/`File`/`URL.createObjectURL` responses and drives real interactions — clicks, typed input (via the native `HTMLInputElement` value setter, not a plain `.value =`, which React's controlled-input tracking would otherwise silently ignore — see the comment in `smoke.mjs`), a real file pick for Import — through every view and modal, asserting on the resulting DOM *and* on the actual outgoing request payloads where the DOM alone can't prove correctness (e.g. tags/tracks in a create-album POST body). It is still not a substitute for real browser testing.

**Formatting**: `npm run format` (Prettier — no semicolons, single quotes, trailing commas) covers every `.ts`/`.tsx`/`.css` file and `index.html`; run it before committing so the code stays easy to read, not just functionally correct. `vinylvault_react.html` is the one exception — it's a Django template (`{% %}`/`{{ }}` syntax Prettier's HTML parser doesn't understand), so it's kept readable by hand.

**Status**: the default UI — see [frontend/README.md](../frontend/README.md) for dev commands. Known, deliberate simplifications versus the vanilla app: per-library filter memory (`uiState[libId]` in the original) isn't ported, so filters reset when you navigate away from a library and back; the toast's fade-out animation (`.toast.out`) isn't wired up, so toasts disappear abruptly instead of fading; the `/` keyboard shortcut to focus the search box isn't ported. None of these affect data correctness — all are cosmetic/UX polish.
