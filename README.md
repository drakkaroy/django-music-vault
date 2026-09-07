# 🎵 django-music-vault

Reusable Django app for cataloging your music collection: libraries, albums, unlimited tags, favorites, and Spotify metadata autofill. Ships with the **VinylVault** frontend (React + TypeScript, dark theme) ready to use — and also runs standalone: clone the repo, migrate, and your vault is up. The original vanilla HTML/CSS/JS frontend is still bundled at `/legacy/` for reference/rollback.

📚 **[Full documentation](docs/index.md)** — architecture, backend, frontend, configuration, deployment.

## Features

- **Libraries** with name, description and color; **albums** with title, artist, year, genre, country, label, cover, Spotify URI, unlimited tags, and an optional tracklist.
- **Tracklists**: imported automatically (with duration and per-track Spotify links) when you add an album from Spotify search, or entered manually — either way, play a single track from the album's Tracklist view.
- **Favorites**, live search, combinable filters (genre/country/decade/tags) and sorting — all in the bundled frontend.
- **Export / Import JSON** of your whole collection.
- **JSON REST API** (no extra dependencies, just Django) with session auth; each user only sees their own data.
- **Spotify search/autofill**: the "Add album" flow searches Spotify (by artist or album), shows a quick preview, prefills the form and downloads the cover art to local storage (client-credentials, no user OAuth needed).
- **Spotify Connect playback**: each user can link their own Spotify account (OAuth); the ▶ Play button then starts the album on whichever of their devices already has Spotify open.
- No hardcoded database: uses the host project's `default` connection, or whatever you define with `DATABASE_ROUTERS`.

## Quickstart (standalone)

```bash
git clone git@github.com:drakkaroy/django-music-vault.git
cd django-music-vault
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env       # edit credentials (or delete it to use SQLite)
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open <http://localhost:8000/> and sign in. Full setup details (Postgres, Spotify credentials, playback's Redirect URI requirement) are in [docs/setup.md](docs/setup.md) and [docs/configuration.md](docs/configuration.md).

## Usage as a package in another project

```bash
pip install git+https://github.com/drakkaroy/django-music-vault.git
```

```python
# settings.py
INSTALLED_APPS = [..., "music_vault"]
SPOTIFY_CLIENT_ID = "..."       # optional, for search/autofill and playback
SPOTIFY_CLIENT_SECRET = "..."

# urls.py
urlpatterns = [..., path("music/", include("music_vault.urls"))]
```

The main view requires an authenticated user — the package ships a default VinylVault-themed login template (override it automatically by supplying your own `registration/login.html`), but not the login URL itself. Full checklist (auth wiring, migrations, optional Spotify/media/database-isolation steps): **[docs/integration.md](docs/integration.md)**.

## API

JSON REST API under wherever `music_vault.urls` is mounted, session auth + CSRF. Full endpoint list and the JSON contract (why ids are strings, dates are epoch ms, etc.) are in [docs/backend.md](docs/backend.md).

## Tests

```bash
python manage.py test music_vault
```

## Roadmap

- [x] Autofill the album form from Spotify search in the UI (with local cover download)
- [x] Real playback via Spotify Connect (per-user OAuth)
- [x] Tracklists (imported or manual) with per-track playback
- [ ] Star ratings and collection statistics

## License

MIT
