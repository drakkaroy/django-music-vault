# Deployment

This repo is currently documented and tested for local/standalone use only ([setup.md](setup.md)) — nothing here has been deployed to a real host yet. This page is a checklist of what changes when that happens, not a guide to a specific platform.

## Django settings

- `DJANGO_DEBUG=false`. With `DEBUG=True`, `project/urls.py` is the only thing serving `MEDIA_URL` (via `static()`), and error pages leak tracebacks/settings.
- `DJANGO_SECRET_KEY` — set to a real random value; the fallback in `project/settings.py` is an insecure dev placeholder.
- `DJANGO_ALLOWED_HOSTS` — the production domain(s), not `localhost,127.0.0.1`.
- `CSRF_TRUSTED_ORIGINS` isn't currently set anywhere — add it (with the production scheme+host) if the app sits behind a reverse proxy that terminates TLS, or cross-origin POSTs will be rejected.

## Static and media files

- `STATIC_ROOT`/`collectstatic` — `project/settings.py` already sets `STATIC_ROOT`; run `python manage.py collectstatic` as part of the deploy and serve it via the web server or a CDN, not Django.
- `MEDIA_ROOT` (downloaded album covers, see [backend.md](backend.md#cover-downloads-coversPy)) — `project/urls.py` only serves this when `DEBUG=True`. In production, point the web server (nginx, etc.) at `MEDIA_ROOT`, or swap in a real storage backend (e.g. S3 via `django-storages`) if the deployment target has an ephemeral filesystem.

## Database

Run `python manage.py migrate` against the production database as part of every deploy — see the troubleshooting note in [setup.md](setup.md#troubleshooting) for what happens when this is skipped. If using Postgres, install the `postgres` extra (`pip install .[postgres]`) or `psycopg[binary]` directly.

## Spotify

- Register the production Redirect URI (`https://yourdomain/spotify/callback/`) in the Spotify Dashboard **in addition to** any local dev URIs already there — see [configuration.md](configuration.md#spotify-dashboard-setup) for the exact-match gotchas. Spotify requires HTTPS for non-loopback redirect URIs, so this only works once the deployment has a real TLS certificate.
- `SpotifyAccount` tokens are stored in plaintext in the database (see [backend.md](backend.md#2-authorization-code--spotify-connect-spotifyoauthpy-playerpy--playback)) — a deliberate tradeoff for a self-hosted, trusted-users app. Revisit (e.g. Fernet-encrypt at rest) before deploying anywhere with untrusted users or shared database access.

## Process

Django's built-in `runserver` is dev-only. Run via a WSGI server (`project/wsgi.py` is already set up — e.g. `gunicorn project.wsgi:application`) behind a reverse proxy.
