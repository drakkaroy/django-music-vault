# 🎵 django-music-vault

Reusable Django app for cataloging your music collection: libraries, albums, unlimited tags, favorites, and Spotify metadata autofill. Ships with the **VinylVault** frontend (vanilla HTML/CSS/JS, dark theme) ready to use — and also runs standalone: clone the repo, migrate, and your vault is up.

## Features

- **Libraries** with name, description and color; **albums** with title, artist, year, genre, country, label, cover, Spotify URI and unlimited tags.
- **Favorites**, live search, combinable filters (genre/country/decade/tags) and sorting — all in the bundled frontend.
- **Export / Import JSON** of your whole collection.
- **JSON REST API** (no extra dependencies, just Django) with session auth; each user only sees their own data.
- **Spotify search/autofill**: the "Add album" flow searches Spotify (by artist or album), shows a quick preview, prefills the form and downloads the cover art to local storage (client-credentials, no user OAuth needed).
- No hardcoded database: uses the host project's `default` connection, or whatever you define with `DATABASE_ROUTERS`.

## Standalone usage (this repo)

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

Open <http://localhost:8000/> and sign in. Without a `.env` it runs on SQLite; with `DB_ENGINE=postgresql` it uses Postgres (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` variables).

## Usage as a package in another project

```bash
pip install git+https://github.com/drakkaroy/django-music-vault.git
```

```python
# settings.py
INSTALLED_APPS = [
    ...,
    "music_vault",
]

SPOTIFY_CLIENT_ID = "..."      # optional, for search/autofill
SPOTIFY_CLIENT_SECRET = "..."

# urls.py
from django.urls import include, path

urlpatterns = [
    ...,
    path("music/", include("music_vault.urls")),
]
```

The main view requires an authenticated user (standard Django `LOGIN_URL`). Models use the host project's `default` database.

### Separate database (optional, in the consumer project)

The package pins no connection. To isolate its tables in another database, declare it in the host project:

```python
# settings.py
DATABASES = {
    "default": {...},
    "music_db": {...},
}
DATABASE_ROUTERS = ["yourproject.routers.MusicVaultRouter"]

# yourproject/routers.py
class MusicVaultRouter:
    route_app_labels = {"music_vault"}

    def db_for_read(self, model, **hints):
        return "music_db" if model._meta.app_label in self.route_app_labels else None

    def db_for_write(self, model, **hints):
        return "music_db" if model._meta.app_label in self.route_app_labels else None

    def allow_migrate(self, db, app_label, **hints):
        if app_label in self.route_app_labels:
            return db == "music_db"
        return None
```

## API

All endpoints live under the prefix where you mount `music_vault.urls` (`/` in the standalone project), require an active session, and use CSRF via cookie + `X-CSRFToken` header.

| Method | Path | Description |
|---|---|---|
| GET | `api/state/` | The user's full collection (`{"libraries": [...]}`) |
| POST | `api/libraries/` | Create library `{name, description, color}` |
| PUT / DELETE | `api/libraries/<id>/` | Edit / delete library |
| POST | `api/libraries/<id>/albums/` | Add album |
| PUT / DELETE | `api/albums/<id>/` | Edit / delete album |
| POST | `api/albums/<id>/favorite/` | Toggle favorite |
| POST | `api/import/` | Restore a JSON backup (replaces the whole collection) |
| GET | `api/spotify/search/?q=&limit=` | Search albums on Spotify |
| GET | `api/spotify/albums/<spotify_id>/` | Normalized detail of a Spotify album |

Album format (mirrors the frontend): `{id, title, artist, year, genre, country, label, cover, coverFile, spotifyUri, tags[], favorite, addedAt}` — ids as strings, dates as epoch ms. `cover` is the remote URL; `coverFile` is the media URL of the locally stored copy (empty if none) and the frontend prefers it.

Album create/update accepts an optional `downloadCover: true` flag: when the cover URL points at Spotify's CDN (`i.scdn.co`), the image is downloaded and stored under `MEDIA_ROOT/music_vault/covers/` (best-effort — the album keeps its remote URL if the download fails). Host projects must configure `MEDIA_ROOT`/`MEDIA_URL` (and serve media) for this feature; the standalone project already does.

## Environment variables

| Variable | Purpose |
|---|---|
| `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS` | Standard config for the standalone project |
| `DB_ENGINE` (`sqlite3`/`postgresql`) + `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Standalone project database |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Client-credentials keys for search/autofill ([dashboard](https://developer.spotify.com/dashboard)) |

## Tests

```bash
python manage.py test music_vault
```

## Roadmap

- [x] Autofill the album form from Spotify search in the UI (with local cover download)
- [ ] Real playback via Spotify Connect (per-user OAuth)
- [ ] Star ratings and collection statistics

## License

MIT
