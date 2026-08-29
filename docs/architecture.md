# Architecture

## Repo layout

```
music_vault/     the installable, reusable package (pyproject.toml)
project/         thin host project — only exists so this repo runs standalone
manage.py
```

`music_vault` is the thing that matters; `project/` is just one possible consumer of it, kept as small as possible so it stays a realistic example of "how to host this package" rather than a place business logic accumulates.

## The decoupling rule

`music_vault` must never:
- import from `project/`
- hardcode a database connection
- assume anything about the host project beyond `INSTALLED_APPS` + `include("music_vault.urls")`

This is what makes it installable in an unrelated Django project via pip. A consumer that wants the app's tables in a separate database does so with a `DATABASE_ROUTERS` entry pointing at the `music_vault` app label — see [configuration.md](configuration.md#separate-database-optional). The package itself has no opinion on this; it just uses `default` unless routed elsewhere.

## Data model

```
User (host project's AUTH_USER_MODEL)
  └─ Library (owner FK)            name, description, color
       └─ Album (library FK)       title, artist, year, genre, country, label,
                                    cover_url, cover_file, spotify_uri, tags[], favorite
  └─ SpotifyAccount (user OneToOne)  access_token, refresh_token, expires_at, scope
```

- `Library`/`Album` are a flat, denormalized mirror of what the original VinylVault frontend kept in `localStorage` — no separate `Genre`/`Tag` tables, `tags` is just a `JSONField` list. That's deliberate: this app's job is to be the *persistence layer* for an existing UI's exact data shape, not to redesign the domain model. See [backend.md](backend.md#json-contract) for why this also constrains the API's JSON shape.
- `SpotifyAccount` is unrelated to `Library`/`Album` — it exists only so the ▶ Play button can control playback on the user's own Spotify Connect devices. See [backend.md](backend.md#spotify-integrations).

## Request flow

Every page and API request requires an authenticated session (standard Django `LOGIN_URL` / session auth). There's no DRF: the single page view (`vault`) renders the VinylVault shell once; everything after that is the frontend calling the JSON API (`ApiView` subclasses in `views.py`) and re-rendering client-side. See [frontend.md](frontend.md) for how the JS drives this.

```
Browser (script.js)
  → GET  /                    vault page (login_required, ensure_csrf_cookie)
  → GET  /api/state/          full collection for the logged-in user
  → POST /api/libraries/...   mutations, each followed by a state refresh
  → GET  /api/spotify/...     client-credentials search/autofill (no user auth with Spotify)
  → GET  /spotify/connect/    real browser redirect into Spotify's OAuth consent screen
  → POST /api/albums/<id>/play/   Spotify Connect playback, needs a linked SpotifyAccount
```

Ownership is enforced per-request, not via row-level DB permissions: `ApiView.get_library`/`get_album` always filter by `owner=request.user` (or `library__owner=request.user`), so a mismatched id 404s instead of leaking another user's row.
