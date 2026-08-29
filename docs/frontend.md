# Frontend

VinylVault is a vanilla HTML/CSS/JS single-page app (no build step, no framework) served by the `vault` view and living under `music_vault/templates/music_vault/` and `music_vault/static/music_vault/`.

## Files and their divergence policy

| File | Status |
|---|---|
| `vinylvault.html` | Original template + `{% static %}` links, a logout form, and `window.MV_BASE` set for the JS. |
| `styles.css` | **Untouched**, copied verbatim from the original standalone frontend. Never edit this for new features. |
| `spotify.css` | New file — styling for the Spotify search/preview modal and playback UI. Exists so `styles.css` can stay untouched. |
| `script.js` | Adapted. See below for exactly where it diverges from the original. |

`script.js` diverges from the original localStorage-based version in three places only — everything else (rendering, filtering, sorting, the modal system) is the original code:

1. **API persistence layer** (top of file): `API_BASE`, `getCookie`, `api()`, `refreshState()` replace what used to be direct `localStorage` reads/writes. `coverOf()` also gained a preference for `coverFile` (locally downloaded cover) over `cover` (remote URL).
2. **Spotify add-album flow**: `openSpotifySearch()` (search → preview → "Save to library") and the `spotify` parameter added to `openAlbumForm()` for prefilling from a chosen Spotify result.
3. **Spotify Connect wiring**: `playAlbum()`, `updateSpotifyButton()`, `disconnectSpotify()`, `handleSpotifyRedirect()` — the ▶ Play button and the sidebar "Connect Spotify" toggle.

If you're adding a feature, keep following this pattern: don't touch `styles.css` or the original rendering code, add new CSS to `spotify.css` (or a new file), and keep new JS logic in clearly separate functions rather than interleaving it into the original render/filter code.

## State and rendering model

No virtual DOM, no diffing — `render()` just regenerates `#view`'s `innerHTML` from the in-memory `state` object and rebinds event listeners (`bindView()`). `state = { libraries: [...] }` is fetched wholesale from `GET api/state/` on boot and after every mutation (`refreshState()`); there's no optimistic/partial update except the live search box, which filters the already-loaded `state` client-side without a round trip.

`route = { view, libId }` is a tiny in-memory router (`home` / `favorites` / `library`) — no History API, no deep links. `uiState` (per-library filters: search text, genre/country/decade/tag filters, sort) is UI-only and never persisted or sent to the server.

## Modals

`openModal()`/`closeModal()` manage a single modal root (`#modalRoot`). Modal-opening functions (`openAlbumForm`, `openLibForm`, `openAlbumDetail`, `openSpotifySearch`) build their HTML as a template string, then wire up event handlers on the returned backdrop element — there's no shared modal component abstraction, each one is self-contained.

`openSpotifySearch(libId)` is the entry point for "＋ Add album": search → grid of results → click a result → preview → "💾 Save to library" hands off to `openAlbumForm(libId, null, spotifyResult)`, which prefills the form and sets `downloadCover: true` on submit so the backend fetches the cover art. The modal also has a "✎ Enter album manually instead" escape hatch straight to the empty form.

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
