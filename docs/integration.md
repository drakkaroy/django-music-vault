# Integrating into an existing Django project

Step-by-step checklist for adding `music_vault` to a project that isn't this repo's own standalone `project/`. See [architecture.md](architecture.md#the-decoupling-rule) for what the package does and doesn't assume about its host.

## 1. Install

```bash
pip install git+https://github.com/drakkaroy/django-music-vault.git
```

(Not yet published to PyPI.) Only `Django>=4.2` and `requests>=2.28` come along as dependencies — add the `postgres` extra (`pip install "django-music-vault[postgres] @ git+..."`) if your project's database is Postgres.

## 2. `INSTALLED_APPS`

```python
INSTALLED_APPS = [
    ...,
    "django.contrib.staticfiles",   # required — serves music_vault's bundled CSS/JS
    "music_vault",
]
```

`TEMPLATES` needs `APP_DIRS: True` (Django's default via `startproject`) so `music_vault/templates/music_vault/vinylvault.html` is found.

## 3. `urls.py`

```python
from django.urls import include, path

urlpatterns = [
    ...,
    path("music/", include("music_vault.urls")),   # any prefix — "" works too
]
```

**The mount prefix matters for Spotify playback**, not just search: the OAuth redirect URI is built as `request.build_absolute_uri(reverse("music_vault:spotify-callback"))`, so mounting at `"music/"` makes the callback `https://yourhost/music/spotify/callback/`, not `.../spotify/callback/`. Register whatever the actual mounted path is in the Spotify Dashboard — see [configuration.md#spotify-dashboard-setup](configuration.md#spotify-dashboard-setup).

## 4. Auth — bring your own login

`music_vault` requires an authenticated session (`@login_required` on the main view, 401 JSON on the API for anonymous users) but **ships no login view or template** — only the package's own `templates/music_vault/` is installed; the standalone project's `templates/registration/login.html` and `accounts/` URL wiring are `project/`-only and are *not* part of the pip-installed package (see `pyproject.toml`'s `package-data`, which lists only `music_vault/templates/**`).

Your host project needs its own working login, e.g. the simplest option:

```python
# urls.py
urlpatterns = [..., path("accounts/", include("django.contrib.auth.urls"))]
```

plus a `templates/registration/login.html` of your own (Django's auth views expect that template name by default). If your project already has any login flow, this step is likely already done — just confirm `LOGIN_URL` (defaults to `"/accounts/login/"`) resolves to it, and optionally set:

```python
LOGIN_REDIRECT_URL = "music_vault:vault"   # land here right after login
```

## 5. Migrate

```bash
python manage.py migrate
```

Creates `Library`, `Album`, and `SpotifyAccount` tables in `default` (or wherever `DATABASE_ROUTERS` sends the `music_vault` app label — see [configuration.md#separate-database-optional](configuration.md#separate-database-optional), and remember `migrate --database=<alias>` the first time if isolating to a non-default database). Re-run after every package upgrade that ships new migrations — a skipped migration doesn't fail at startup, it fails the first request that touches the new column/table; see [setup.md#troubleshooting](setup.md#troubleshooting).

## 6. Optional: Spotify search/autofill

```python
SPOTIFY_CLIENT_ID = "..."
SPOTIFY_CLIENT_SECRET = "..."
```

Without these, the "Add album" flow's Spotify search returns a 503 and users fall back to the manual entry form — nothing else breaks.

## 7. Optional: Spotify Connect playback

Same credentials as above, plus a Redirect URI registered in the Spotify Dashboard matching your actual mounted callback path (step 3) — see [configuration.md#spotify-dashboard-setup](configuration.md#spotify-dashboard-setup) for the exact-match gotchas. Without this, "Connect Spotify" redirects to Spotify and fails with `redirect_uri: Not matching configuration`; search/autofill still works fine either way.

## 8. Optional: cover downloads

The Spotify search flow can download and store cover art locally (`Album.cover_file`). Needs `MEDIA_ROOT`/`MEDIA_URL` configured and served by your project — see [configuration.md#media-cover-downloads](configuration.md#media-cover-downloads) and [deployment.md](deployment.md#static-and-media-files) for production. Without this configured, `downloadCover` requests just silently keep the remote Spotify URL (`coverFile` stays empty) — not a hard failure.

## 9. Optional: isolate the database

See [configuration.md#separate-database-optional](configuration.md#separate-database-optional) for a `DATABASE_ROUTERS` example that keeps `music_vault`'s tables out of your project's main database.

## Minimal checklist

- [ ] `pip install`
- [ ] `INSTALLED_APPS` includes `music_vault` and `django.contrib.staticfiles`
- [ ] `include("music_vault.urls")` somewhere in `urls.py`
- [ ] a working login (`LOGIN_URL` resolves, `registration/login.html` exists) — **not provided by the package**
- [ ] `python manage.py migrate`
- [ ] (optional) `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` for search
- [ ] (optional) Spotify Dashboard Redirect URI matching your mount prefix, for playback
- [ ] (optional) `MEDIA_ROOT`/`MEDIA_URL` served, for local cover downloads
