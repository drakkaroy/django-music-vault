# Configuration

## Environment variables

Loaded from a `.env` file at the repo root by the standalone project (`project/settings.py`'s `_load_env()` — a minimal hand-rolled loader, no extra dependency). `os.environ.setdefault` is used, so real environment variables always win over `.env`. A package consumer embedding `music_vault` in another project sets these however that project normally manages settings — `.env` loading is a `project/`-only concern.

| Variable | Purpose | Default |
|---|---|---|
| `DJANGO_SECRET_KEY` | Django's `SECRET_KEY` | insecure dev placeholder |
| `DJANGO_DEBUG` | `true`/`false` | `true` |
| `DJANGO_ALLOWED_HOSTS` | comma-separated | `localhost,127.0.0.1` |
| `DB_ENGINE` | `sqlite3` or `postgresql` | `sqlite3` |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | only used when `DB_ENGINE=postgresql` | — |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | powers **both** Spotify flows (search and playback) | — |
| `DJANGO_TIME_ZONE` | | `UTC` |

With no `.env` at all, `migrate` + `runserver` work out of the box on SQLite with no Spotify features.

## Database

- `sqlite3` (default): zero config, file lives at `db.sqlite3` (gitignored).
- `postgresql`: needs `psycopg[binary]` installed (`pip install -r requirements.txt`, or the `postgres` extra in `pyproject.toml` — it's optional so the package itself stays dependency-light). **After switching databases or pulling new migrations, always run `python manage.py migrate` against the DB you're actually pointed at** — a pending migration doesn't error at server start, it errors the first time a request touches the affected table (`ProgrammingError: relation/column ... does not exist`), which can look unrelated to the real cause. See [setup.md](setup.md#troubleshooting).

## Media (cover downloads)

The cover-download feature ([backend.md](backend.md#cover-downloads-coversPy)) needs `MEDIA_ROOT`/`MEDIA_URL` configured in the host project, and the media directory served (the standalone project does this only when `DEBUG=True`, via `django.conf.urls.static.static()` in `project/urls.py` — a real deployment needs its web server or object storage to serve `MEDIA_ROOT` instead, see [deployment.md](deployment.md)).

## Spotify Dashboard setup

Both Spotify flows share one app registration at <https://developer.spotify.com/dashboard> — you only need `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` for search/autofill, but **playback (the ▶ Play button) additionally needs a Redirect URI registered**, or connecting an account fails with Spotify's `redirect_uri: Not matching configuration` error.

The app sends `redirect_uri` dynamically as `request.build_absolute_uri(reverse("music_vault:spotify-callback"))` — i.e. whatever host is in the browser's address bar, plus `/spotify/callback/`. Register the *exact* value in Settings → Redirect URIs, matching scheme, host, port, and the trailing slash. Hard-won gotchas from actually setting this up:

- **The path is required.** `http://127.0.0.1:8000/` (just the origin) is *not* the same as `http://127.0.0.1:8000/spotify/callback/` — Spotify compares the full string. This was the actual cause the one time this bit us: the field had been saved with only the origin.
- **`localhost` and `127.0.0.1` are different values to Spotify**, even though they reach the same server. Register whichever one is actually in your browser's address bar when you click "Connect Spotify" — or register both (Spotify allows multiple Redirect URIs on one app).
- In Spotify's current dashboard UI, typing the URL into the field isn't enough — **press Enter/Add to commit it as a list entry**, then **Save** at the bottom of the page. A value that's only sitting in the text input, un-added, does not get saved.
- If you have another app reusing the same Spotify Dashboard entry for a different project (e.g. a production domain), just **add** your local dev URI alongside it — don't replace the existing one.
- An OAuth `code` is single-use and short-lived. If the callback errors for an unrelated reason (e.g. a pending migration — see [setup.md](setup.md#troubleshooting)) and you fix that and just reload the same callback URL, it will fail again because Spotify already consumed that code. Start over from "Connect Spotify" in the sidebar to get a fresh one.

### Separate database (optional)

The package pins no connection — declare a router in the host project to isolate `music_vault`'s tables in their own database:

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
