# django-music-vault

Reusable Django app (`music_vault`) that catalogs a music collection and serves the bundled VinylVault frontend, plus a minimal host project (`project/` + `manage.py`) so the repo runs standalone.

## Layout

- `music_vault/` — the installable package (published via `pyproject.toml`). Everything reusable lives here: models, JSON API views, urls, the adapted frontend (`templates/music_vault/`, `static/music_vault/`), and the `spotify/` client module.
- `project/` — thin host project for standalone use only. Env-driven settings (loads `.env` at repo root); no business logic belongs here.
- `templates/registration/login.html` — login page for the standalone project (project-level concern, not part of the package).

## Conventions and constraints

- **Keep the package decoupled**: `music_vault` must not import from `project/`, hardcode a database connection, or assume anything beyond `INSTALLED_APPS` + `include("music_vault.urls")` in a host project. Database isolation is the consumer's job (`DATABASE_ROUTERS`, documented in README).
- **Dependencies**: package depends on Django + requests only. No DRF, no spotipy — the API uses plain `JsonResponse` views (`ApiView` base class in `views.py`) and the Spotify client is hand-rolled in `music_vault/spotify/`.
- **API JSON shape mirrors the original localStorage frontend**: camelCase keys (`spotifyUri`, `addedAt`, `cover`), ids serialized as strings, datetimes as epoch milliseconds. Don't change this contract without updating `static/music_vault/script.js` — the JS compares ids with `===` against DOM dataset strings.
- **Frontend**: `vinylvault.html` and `styles.css` come from the original VinylVault app and should stay visually untouched; `script.js` is the adapted version whose only intended divergence is the API persistence layer (top of file) replacing localStorage.
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
