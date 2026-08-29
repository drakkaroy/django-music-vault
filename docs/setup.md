# Local setup

## Standalone (this repo)

```bash
git clone git@github.com:drakkaroy/django-music-vault.git
cd django-music-vault
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env       # edit credentials, or delete it to run on SQLite
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open <http://localhost:8000/> and sign in. See [configuration.md](configuration.md) for every env var and for setting up Spotify (search needs only credentials; playback also needs a Redirect URI registered).

## As a package in another project

See [integration.md](integration.md) for the full step-by-step checklist (install, `INSTALLED_APPS`, urls, auth — the package ships no login view/template, migrate, and the optional Spotify/media/database-isolation steps).

## Tests

```bash
python manage.py test music_vault      # runs on SQLite regardless of DB_ENGINE
```

## Troubleshooting

**`ProgrammingError`/`relation ... does not exist` or `column ... does not exist`, out of nowhere, on an endpoint you didn't just change.** A migration is pending on whichever database the running server is actually connected to. This doesn't fail at server start — it fails the first time a request touches the affected table, which can look unrelated to the real cause (e.g. creating a library can 500 on the *next* request, the automatic state refresh, if it's a different model's column that's missing). Fix:

```bash
python manage.py showmigrations music_vault   # look for unchecked [ ] entries
python manage.py migrate music_vault
```

**If you run the dev server from a different Python environment than the one you used to `pip install -r requirements.txt` / `makemigrations`** (a shared/system venv instead of this repo's own `.venv`, for example), remember migrations and dependencies need to be current in *that* environment too — `migrate` run from one venv doesn't help a server process running from another, but they can share the same target database and so appear to "sometimes work."

**Django test client requests return 400 `DisallowedHost`.** The test client's default `Host` header is `testserver`, which isn't in `DJANGO_ALLOWED_HOSTS`. Pass `SERVER_NAME=` to `Client()` (or hit a real `ALLOWED_HOSTS` entry) when reproducing issues via `manage.py shell`.

**A Spotify OAuth callback fails, you fix the cause, and retrying the exact same callback URL still fails.** The authorization `code` in that URL was already consumed on the first (failed) attempt — Spotify codes are single-use. Start the flow over from "Connect Spotify" in the sidebar rather than reloading the callback page.

See [configuration.md](configuration.md#spotify-dashboard-setup) for Spotify-specific setup gotchas (redirect URI mismatches).
