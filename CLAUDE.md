# django-music-vault

Reusable Django app (`music_vault`) that catalogs a music collection and serves the bundled VinylVault frontend, plus a minimal host project (`project/` + `manage.py`) so the repo runs standalone.

## Documentation

Deep-reference docs live in `docs/` (start at [docs/index.md](docs/index.md)) — architecture, backend, frontend, configuration (env vars, Spotify Dashboard setup), deployment. This file stays short and states hard constraints; when a bullet below needs more explanation, it links to the relevant doc instead of repeating it. Keep both in sync: update the linked doc when behavior changes, not just this file.

## Layout

- `music_vault/` — the installable package (published via `pyproject.toml`). Everything reusable lives here: models, JSON API views, urls, the vanilla frontend (`templates/music_vault/`, `static/music_vault/`), the React rewrite's **built output** (`static/music_vault/react-app/` — committed, see below), a default login template (`templates/registration/login.html` — see below), and the `spotify/` client module.
- `project/` — thin host project for standalone use only. Env-driven settings (loads `.env` at repo root); no business logic belongs here.
- `frontend/` — the React/TypeScript rewrite's **source**, a separate Node project (its own `package.json`) that builds *into* `music_vault/static/music_vault/react-app/`. Not part of the Python package. See [docs/frontend.md#react-rewrite](docs/frontend.md#react-rewrite).

## Conventions and constraints

- **Keep the package decoupled**: `music_vault` must not import from `project/`, hardcode a database connection, or assume anything beyond `INSTALLED_APPS` + `include("music_vault.urls")` in a host project. Database isolation is the consumer's job (`DATABASE_ROUTERS`) — see [docs/architecture.md](docs/architecture.md) and [docs/configuration.md](docs/configuration.md#separate-database-optional). Full integration checklist: [docs/integration.md](docs/integration.md).
- **Default login template**: `music_vault/templates/registration/login.html` (VinylVault-themed, plain Django auth form fields, no hardcoded URLs) ships with the package via `APP_DIRS`, so a host project gets a working login for free — but never gets forced into it: Django's template loader checks a host project's own `TEMPLATES.DIRS` before app dirs, so any project supplying its own `registration/login.html` overrides ours automatically, no settings flag needed. The package still ships **no login URLs/view** — a host project must wire `path("accounts/", include("django.contrib.auth.urls"))` (or equivalent) itself, so it isn't forced onto routes it might already use.
- **Dependencies**: package depends on Django + requests only. No DRF, no spotipy — the API uses plain `JsonResponse` views (`ApiView` base class in `views.py`) and the Spotify client is hand-rolled in `music_vault/spotify/`. Details: [docs/backend.md](docs/backend.md).
- **API JSON shape mirrors the original localStorage frontend**: camelCase keys, ids as strings, datetimes as epoch milliseconds. Don't change this contract without updating `static/music_vault/script.js` — the JS compares ids with `===` against DOM dataset strings. Full contract: [docs/backend.md#json-contract](docs/backend.md#json-contract).
- **`Album.tags`/`Album.tracks` are flat `JSONField` lists, not relational models** — a deliberate choice matching "mirror the frontend, don't redesign the domain." Don't reach for a `Track` model without a concrete need (querying/filtering a track independent of its album) that doesn't exist today. Details: [docs/backend.md#tracks](docs/backend.md#tracks).
- **Cover downloads**: only `https://i.scdn.co` is allowed as a source (SSRF guard), best-effort, host projects need `MEDIA_ROOT`/`MEDIA_URL`. Details: [docs/backend.md#cover-downloads-coversPy](docs/backend.md#cover-downloads-coverspy).
- **Frontend (vanilla)**: `styles.css` comes from the original VinylVault app and stays untouched — new UI goes in a new file (e.g. `spotify.css`), never edit it. `script.js` divergence points from the original are documented in [docs/frontend.md](docs/frontend.md) — read that before adding another one, and add yours to the list there.
- **Frontend (React rewrite)**: lives in `frontend/`, served in *parallel* with the vanilla app at `/react/`. **Feature-complete** — all five modals (library form, album form, album detail, tracklist, Spotify search), both remaining views (library, favorites), and Export/Import are done; matches the vanilla app 1:1. Still not a replacement: don't remove the vanilla frontend, and **don't open a PR / merge this work until the user explicitly says so** — they've asked to hold off, and separately no real browser has verified the UI yet (this environment has none — `npm run smoke` against a `jsdom`-mounted build is the closest substitute, not equivalent). Its built output (`music_vault/static/music_vault/react-app/`) is committed — always `npm run build` (from `frontend/`) and commit the result alongside a source change there, the same way you wouldn't leave the Python side with an uncommitted migration. No React Router, no state-management library, no CSS framework — plain Context/hooks and plain CSS with the same custom properties as the vanilla app, matching this project's "nada extra" dependency discipline. **Run `npm run format` (Prettier) before every commit** — the user explicitly asked that all new frontend code stay formatted/readable, not just functional. Known simplifications vs. the vanilla app (cosmetic only, not data-affecting): no per-library filter memory, no toast fade-out animation, no `/`-to-focus-search shortcut. Details: [docs/frontend.md#react-rewrite](docs/frontend.md#react-rewrite).
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

The user's actual dev server (port 8000) sometimes runs from an external venv (`/home/rmonroy/drakk-server/venv`, not this repo's own `.venv`), pointed at the same real Postgres. New migrations need `migrate` run against *that* connection too, not just the local `.venv`'s SQLite test DB — see [docs/setup.md#troubleshooting](docs/setup.md#troubleshooting) (this exact gap caused live 500s twice already: `cover_file`, then `SpotifyAccount` — check for pending migrations there every time a new one ships, e.g. `0004_album_tracks`).

**`media/` at the repo root is real user data, not a test artifact — never `rm -rf` it.** `MEDIA_ROOT` (downloaded Spotify covers) is a fixed path relative to `BASE_DIR`, not gated by `DB_ENGINE` or which venv is running — so it's the *same* directory whether a SQLite smoke test or the user's real Postgres-backed dev server wrote to it. An ad-hoc manual smoke test script (outside `manage.py test`, which correctly isolates `MEDIA_ROOT` via `override_settings`/`tempfile.mkdtemp()` — see `CoverDownloadTests` in `tests.py`) that doesn't override `MEDIA_ROOT` writes into — and a careless cleanup can delete — the real one. This already happened once: a session's smoke-test cleanup ran `rm -rf media/` and deleted two real downloaded covers (recovered by re-running `fetch_cover()` against the surviving `cover_url` — lossy only if `cover_url` had also been cleared, which it hadn't). Any manual smoke test touching cover downloads must pass its own `MEDIA_ROOT` (e.g. a scratchpad tempdir) and only ever clean up *that* directory.

## Related projects (read-only)

- `/home/rmonroy/drakk-server/rmonroyc` — Collector App; the Spotify module here was adapted from `collector/spotify/`. Reference only, never modify it from this repo.
- `C:\Users\drakk\Lab\vinylvault\` — original standalone VinylVault frontend (localStorage version).
