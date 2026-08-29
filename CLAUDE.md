# django-music-vault

Reusable Django app (`music_vault`) that catalogs a music collection and serves the bundled VinylVault frontend, plus a minimal host project (`project/` + `manage.py`) so the repo runs standalone.

## Documentation

Deep-reference docs live in `docs/` (start at [docs/index.md](docs/index.md)) — architecture, backend, frontend, configuration (env vars, Spotify Dashboard setup), deployment. This file stays short and states hard constraints; when a bullet below needs more explanation, it links to the relevant doc instead of repeating it. Keep both in sync: update the linked doc when behavior changes, not just this file.

## Layout

- `music_vault/` — the installable package (published via `pyproject.toml`). Everything reusable lives here: models, JSON API views, urls, the adapted frontend (`templates/music_vault/`, `static/music_vault/`), and the `spotify/` client module.
- `project/` — thin host project for standalone use only. Env-driven settings (loads `.env` at repo root); no business logic belongs here.
- `templates/registration/login.html` — login page for the standalone project (project-level concern, not part of the package).

## Conventions and constraints

- **Keep the package decoupled**: `music_vault` must not import from `project/`, hardcode a database connection, or assume anything beyond `INSTALLED_APPS` + `include("music_vault.urls")` in a host project. Database isolation is the consumer's job (`DATABASE_ROUTERS`) — see [docs/architecture.md](docs/architecture.md) and [docs/configuration.md](docs/configuration.md#separate-database-optional).
- **Dependencies**: package depends on Django + requests only. No DRF, no spotipy — the API uses plain `JsonResponse` views (`ApiView` base class in `views.py`) and the Spotify client is hand-rolled in `music_vault/spotify/`. Details: [docs/backend.md](docs/backend.md).
- **API JSON shape mirrors the original localStorage frontend**: camelCase keys, ids as strings, datetimes as epoch milliseconds. Don't change this contract without updating `static/music_vault/script.js` — the JS compares ids with `===` against DOM dataset strings. Full contract: [docs/backend.md#json-contract](docs/backend.md#json-contract).
- **Cover downloads**: only `https://i.scdn.co` is allowed as a source (SSRF guard), best-effort, host projects need `MEDIA_ROOT`/`MEDIA_URL`. Details: [docs/backend.md#cover-downloads-coversPy](docs/backend.md#cover-downloads-coverspy).
- **Frontend**: `styles.css` comes from the original VinylVault app and stays untouched — new UI goes in a new file (e.g. `spotify.css`), never edit it. `script.js` divergence points from the original are documented in [docs/frontend.md](docs/frontend.md) — read that before adding another one, and add yours to the list there.
- **Two separate Spotify auth flows** — don't conflate them: client-credentials (`spotify/auth.py`/`client.py`/`service.py`, search/autofill, no user login) vs. per-user Authorization Code (`spotify/oauth.py`/`player.py`, playback). `SpotifyAccount` tokens are stored **in plaintext** — a deliberate, documented choice for this self-hosted app, not an oversight; see [docs/backend.md#spotify-integrations](docs/backend.md#spotify-integrations) before changing it.
- **Spotify Dashboard redirect URI** is the most common setup failure for playback (exact-match on scheme/host/port/path) — the gotchas are documented in [docs/configuration.md#spotify-dashboard-setup](docs/configuration.md#spotify-dashboard-setup); point there instead of re-debugging from scratch.
- Documentation and code comments are in English.

## Commands

```bash
source .venv/bin/activate
python manage.py test music_vault      # run the test suite (uses SQLite)
DB_ENGINE=sqlite3 python manage.py runserver   # run without Postgres
```

The local `.env` (gitignored) points at the Collector App's Postgres (`django-postgres` docker container, port 5432) and holds real Spotify credentials — never commit or print it.

The user's actual dev server (port 8000) sometimes runs from an external venv (`/home/rmonroy/drakk-server/venv`, not this repo's own `.venv`), pointed at the same real Postgres. New migrations need `migrate` run against *that* connection too, not just the local `.venv`'s SQLite test DB — see [docs/setup.md#troubleshooting](docs/setup.md#troubleshooting) (this exact gap caused two live 500s this session: `cover_file` then `SpotifyAccount`).

## Related projects (read-only)

- `/home/rmonroy/drakk-server/rmonroyc` — Collector App; the Spotify module here was adapted from `collector/spotify/`. Reference only, never modify it from this repo.
- `C:\Users\drakk\Lab\vinylvault\` — original standalone VinylVault frontend (localStorage version).
