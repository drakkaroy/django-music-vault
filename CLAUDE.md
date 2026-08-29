# django-music-vault

Reusable Django app (`music_vault`) that catalogs a music collection and serves the bundled VinylVault frontend, plus a minimal host project (`project/` + `manage.py`) so the repo runs standalone.

## Layout

- `music_vault/` — the installable package (published via `pyproject.toml`). Everything reusable lives here: models, JSON API views, urls, the adapted frontend (`templates/music_vault/`, `static/music_vault/`), and the `spotify/` client module.
- `project/` — thin host project for standalone use only. Env-driven settings (loads `.env` at repo root); no business logic belongs here.
- `templates/registration/login.html` — login page for the standalone project (project-level concern, not part of the package).

## Conventions and constraints

- **Keep the package decoupled**: `music_vault` must not import from `project/`, hardcode a database connection, or assume anything beyond `INSTALLED_APPS` + `include("music_vault.urls")` in a host project. Database isolation is the consumer's job (`DATABASE_ROUTERS`, documented in README).
- **Dependencies**: package depends on Django + requests only. No DRF, no spotipy — the API uses plain `JsonResponse` views (`ApiView` base class in `views.py`) and the Spotify client is hand-rolled in `music_vault/spotify/`.
- **API JSON shape mirrors the original localStorage frontend**: camelCase keys (`spotifyUri`, `addedAt`, `cover`), ids serialized as strings, datetimes as epoch milliseconds. Don't change this contract without updating `static/music_vault/script.js` — the JS compares ids with `===` against DOM dataset strings. Extra keys: `coverFile` (media URL of the locally stored cover, preferred by the frontend over `cover`).
- **Cover downloads**: album create/update accepts `downloadCover: true`; the server fetches the cover into `Album.cover_file` via `covers.py`. Only `https://i.scdn.co` is allowed as source (SSRF guard) and the download is best-effort — `cover_url` always keeps the remote URL as fallback. Host projects need `MEDIA_ROOT`/`MEDIA_URL`.
- **Frontend**: `styles.css` comes from the original VinylVault app and stays untouched — new UI (the Spotify search/preview modal) is styled in `spotify.css` instead. `script.js` diverges from the original in three places: the API persistence layer (top of file), the Spotify add-album flow (`openSpotifySearch` + prefill in `openAlbumForm`), and the Spotify Connect wiring (`playAlbum`, `updateSpotifyButton`, `disconnectSpotify`, `handleSpotifyRedirect`).
- **Spotify Connect (playback)**: separate from the client-credentials flow used for search. `spotify/oauth.py` implements Authorization Code exchange/refresh; `spotify/player.py`'s `PlayerClient` uses a user's `SpotifyAccount` to call `/me/player/*`, auto-refreshing the token and falling back to the user's first available device when none is active (`NoActiveDevice`). `spotify_connect`/`spotify_callback` in `views.py` are plain redirect views (not `ApiView`/JSON) — the OAuth `state` is round-tripped through the session. Tokens are stored **in plaintext** in `SpotifyAccount` (a deliberate, documented choice — not an oversight — since this is a self-hosted dev app; revisit with Fernet encryption if it's ever exposed beyond trusted users).
- Documentation and code comments are in English.

## Commands

```bash
source .venv/bin/activate
python manage.py test music_vault      # run the test suite (uses SQLite)
DB_ENGINE=sqlite3 python manage.py runserver   # run without Postgres
```

The local `.env` (gitignored) points at the Collector App's Postgres (`django-postgres` docker container, port 5432) and holds real Spotify credentials — never commit or print it.

## Related projects (read-only)

- `/home/rmonroy/drakk-server/rmonroyc` — Collector App; the Spotify module here was adapted from `collector/spotify/`. Reference only, never modify it from this repo.
- `C:\Users\drakk\Lab\vinylvault\` — original standalone VinylVault frontend (localStorage version).
