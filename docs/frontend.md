# Frontend

VinylVault is a vanilla HTML/CSS/JS single-page app (no build step, no framework) served by the `vault` view and living under `music_vault/templates/music_vault/` and `music_vault/static/music_vault/`.

## Files and their divergence policy

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
