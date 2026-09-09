# Backend

## `ApiView` base class (`views.py`)

Every JSON endpoint subclasses `ApiView`, which handles the two things every endpoint needs so individual views don't repeat them:

- **Auth**: `dispatch()` returns a 401 JSON body for anonymous users before the view method runs — no `@login_required` boilerplate per view.
- **Body parsing**: `self.payload` is populated from the JSON body only when `Content-Type: application/json` and the method is POST/PUT/PATCH; otherwise it's `{}`. This guard exists because Django's test client (and some non-JS clients) sends a non-empty multipart body on a bodyless POST — parsing that as JSON used to raise a false "Invalid JSON body" 400.
- **Ownership helpers**: `get_library`/`get_album` filter by the requesting user, so a valid id belonging to someone else 404s instead of 403ing (no confirmation that the id exists at all).

No DRF — plain `JsonResponse` in, `json.loads(request.body)` out. This is a deliberate dependency constraint (see [configuration.md](configuration.md)): the package depends on Django + `requests` only.

## JSON contract

The API's JSON shape mirrors exactly what the original VinylVault frontend used to keep in `localStorage`, because `static/music_vault/script.js` still contains the original rendering/filtering code untouched, and that code does things like `b.addedAt - a.addedAt` and compares ids with `===` against `dataset` strings. Breaking the shape breaks the frontend silently (wrong sort order, cards that never match).

Rules that must hold:
- **ids are strings** (`str(pk)`), never numbers — `album_to_dict`/`library_to_dict` in `serializers.py`.
- **datetimes are epoch milliseconds** (`addedAt`, `createdAt`), not ISO strings.
- **keys are camelCase** (`spotifyUri`, `coverFile`, not `spotify_uri`/`cover_file`).

Album shape: `{id, title, artist, year, genre, country, label, cover, coverFile, spotifyUri, tags[], tracks[], favorite, rating, addedAt}`. `rating` is a `0-5` integer (0 = unrated) validated in `clean_album_payload()` — unlike `favorite` (only ever changed via its own toggle endpoint), `rating` flows through the normal create/update payload like `tags`/`tracks`, since it's an editable field in the album form rather than something with its own dedicated action.
- `cover` — the remote URL (from Spotify or typed manually).
- `coverFile` — media URL of a locally downloaded copy, or `""`. The frontend's `coverOf()` prefers this over `cover` when present.
- `tracks` — `[{trackNumber, title, durationMs, spotifyUri}, ...]`, sorted by `trackNumber`. See [Tracks](#tracks) below — like `tags`, this is a flat `JSONField` list, not a separate model.

Library shape: `{id, name, description, color, slug, isPublic, createdAt, albums[]}`. `slug` and `isPublic` back the public share URL — see [Public library sharing](#public-library-sharing). `api/state/`'s response also carries a top-level `username` (the requesting user's, for building `/​<username>/<slug>/` links client-side) alongside `libraries[]`.

`clean_album_payload`/`clean_library_payload` in `serializers.py` are the single validation point for both the create and update paths (and `ImportView`, which reuses them per-album/per-library during a backup restore).

## Endpoints

All under wherever `music_vault.urls` is mounted (`/` in the standalone project). Session auth + CSRF cookie/`X-CSRFToken` header for everything except the two OAuth redirects, which are real browser navigations, not `fetch`.

| Method | Path | Notes |
|---|---|---|
| GET | `api/state/` | `{"libraries": [...]}`, only the requesting user's data |
| POST | `api/libraries/` | `{name, description, color}` |
| PUT / DELETE | `api/libraries/<id>/` | |
| POST | `api/libraries/<id>/albums/` | |
| PUT / DELETE | `api/albums/<id>/` | |
| POST | `api/albums/<id>/favorite/` | toggles |
| POST | `api/import/` | replaces the user's entire collection, all-or-nothing (`transaction.atomic`) |
| GET | `api/public/<username>/<slug>/` | **no auth** — read-only, only if the library's `is_public` — see [Public library sharing](#public-library-sharing) |
| GET | `api/spotify/search/?q=&limit=` | client-credentials, no user auth needed |
| GET | `api/spotify/albums/<spotify_id>/` | normalized detail |
| GET | `api/spotify/status/` | `{connected: bool}` |
| POST | `api/spotify/disconnect/` | removes the user's `SpotifyAccount` |
| GET | `api/spotify/now-playing/` | `{playing: bool, track?, artist?, albumImage?, deviceName?}` — see below |
| GET | `api/spotify/top-albums/?range=` | `{results: [...]}`, `range` one of `short_term`/`medium_term`/`long_term` (default `medium_term`) — see below |
| POST | `api/albums/<id>/play/` | Spotify Connect playback; optional `{trackUri}` jumps to that track within the album's context |
| GET | `spotify/connect/` | redirect into Spotify's consent screen (not JSON) |
| GET | `spotify/callback/` | OAuth redirect target (not JSON) |

## Public library sharing

A library's owner can make it reachable by anyone with the link, at `/<owner.username>/<library.slug>/` — a real, page-shell-plus-fetch route registered as the **last** urlpattern in `music_vault/urls.py` (so a username of `api`, `legacy`, or `spotify` can never shadow those routes). Two pieces:

- **`Library.slug`** (`models.py`) — auto-generated once from `name` in `Library.save()` the first time the row is saved (`slugify(name)`, deduplicated per owner with a `-2`/`-3`/... suffix — two different users can each have their own `/​<username>/metal/`, but the same user can't have two). It never changes on a later rename, so a shared link never breaks just because the library got renamed. Because generation lives in `save()` rather than in a view, it applies uniformly whether the row is created through `LibraryListView.post`, `ImportView`, the Django admin, or a test's direct `Library.objects.create(...)` — one place, no endpoint-specific duplication (same reasoning as `clean_album_payload`/`clean_library_payload` being the single validation point for the rest of the model). A `UniqueConstraint(fields=["owner", "slug"])` backs this at the DB level; migration `0006_library_public_sharing` backfills slugs for rows that predate this field before adding the constraint.
- **`Library.is_public`** (default `False`) — the opt-in switch. `clean_library_payload()` only includes `is_public` in the fields it returns when the caller's payload actually contains an `isPublic` key — a plain rename (`{name, description, color}`, no `isPublic`) must never silently flip a public library back to private. The frontend's library form always sends the field (it's a checkbox with a real value either way), so this only matters for other API clients.

**`PublicLibraryView`** (`api/public/<username>/<slug>/`) is a plain Django `View`, not an `ApiView` — it doesn't require a session, and it's GET-only by construction (no `post`/`put`/`delete` method exists on it, so those 405 automatically). This is deliberate: it's the one endpoint meant to be reachable by anonymous visitors, and it has no write path at all, matching the "reference only, no API mutation" requirement this feature was built for. It 404s unless a `Library` matches `owner__username`, `slug`, **and** `is_public=True` — a private library's slug and a nonexistent one are indistinguishable to a visitor. The response shape is the same `library_to_dict()` used everywhere else (`{"library": {...}}`), so the frontend's existing `Library`/`Album` types and read-only components (`AlbumCard`, `AlbumGrid`, `Toolbar`, `LibraryView`) work unmodified — see [frontend.md#public-library-sharing](frontend.md#public-library-sharing).

`public_library` (the page view, `<username>/<slug>/`) renders unconditionally — even for a missing or private library — rather than 404ing itself; the read-only React bundle calls `PublicLibraryView` on mount and shows its own "not found" state on a 404, the same way the rest of the app surfaces API errors, instead of a bare Django 404 page.

## Cover downloads (`covers.py`)

Album create/update accepts an optional `downloadCover: true`. When set, `fetch_cover()` downloads the image at `cover_url` into `Album.cover_file` (`MEDIA_ROOT/music_vault/covers/`) and the response's `coverFile` reflects it.

This is a **best-effort, SSRF-guarded** fetch:
- only `https://i.scdn.co` (Spotify's image CDN) is accepted as a source host — nothing else is ever requested, so this endpoint can't be used to make the server fetch arbitrary URLs;
- 5 MB cap, content-type allowlist (`image/jpeg|png|webp`);
- any failure (disallowed host, network error, oversized, wrong content-type) just leaves `coverFile` empty — the album keeps its remote `cover` URL and the request still succeeds. This is intentional: a flaky/unreachable image host should never block saving an album.

On edit, if the cover URL changes, the stale local file is deleted before a new one is (optionally) fetched. A `post_delete` signal on `Album` removes the file when the album itself is deleted.

## Tracks

`Album.tracks` is a `JSONField(default=list)` — a list of `{track_number, title, duration_ms, spotify_uri}` dicts — not a separate `Track` model. This is the same tradeoff already made for `tags` (see [architecture.md](architecture.md#data-model)): nothing in the app ever needs to query, filter, or paginate a track independently of its album, so a relational table would add migration/view/serializer surface for no real benefit. `_clean_tracks()` in `serializers.py` validates each row (title required, duration/track number coerced to non-negative ints, defaulting track number to the row's position when omitted) and is shared by create, update, and `ImportView`.

Two ways tracks get populated:
- **Imported from Spotify**: `_normalize_album()` (see below) extracts `tracks` from the full `/albums/{id}` response when the user previews and saves a search result — the frontend sends them straight through on save.
- **Entered manually**: the album form's track-row editor (`script.js`) — see [frontend.md](frontend.md).

Playing a single track (`api/albums/<id>/play/` with `{trackUri}`) doesn't need a track's own id — the frontend already has the `spotifyUri` from the loaded album, and `PlayerClient.play()` takes it directly as an `offset` inside the album's context (see below). The view only accepts a `trackUri` that starts with `spotify:track:` — anything else is silently ignored (falls back to playing the album from the top) rather than erroring, since a malformed value here is a client bug, not something worth failing the whole play request over.

## Spotify integrations

There are **two independent Spotify auth flows** — don't conflate them:

### 1. Client-credentials (`spotify/auth.py`, `client.py`, `service.py`) — search/autofill

App-level auth, no user login with Spotify. `SpotifyAuth` caches a token in memory; `SpotifyClient` wraps `/search` and `/albums/<id>` with 429 retry/backoff; `service.get_service()` is a lazy singleton that raises `ImproperlyConfigured` (→ 503 in the view) if `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` aren't set. `_normalize_album()` reshapes Spotify's response into the flat dict the frontend's search modal and album-form prefill expect — including a `tracks` list (only present on the full album detail fetch, not on search result items, since Spotify's `/search` doesn't include a tracklist). Note this endpoint's JSON is **not** the frontend's camelCase album contract — it's `snake_case` throughout (`cover_url`, `release_date`, `track_number`, ...), and the album form converts it once when prefilling from an import.

This flow can only read public catalog data — it cannot see devices or control playback.

### 2. Authorization Code / Spotify Connect (`spotify/oauth.py`, `player.py`) — playback

Per-user OAuth, needed because starting playback requires acting *as* a specific user on *their* devices.

- `oauth.py`: `authorize_url()`, `exchange_code()`, `refresh_access_token()` — thin wrappers over Spotify's `/authorize` and `/api/token`.
- `player.py`: `PlayerClient(account)` wraps a user's `SpotifyAccount`, auto-refreshing the access token when it's within 30s of expiring (and persisting the refreshed token back to the DB). `.play(context_uri, offset_uri=None)` tries the user's currently active device first; on a 404 (`NO_ACTIVE_DEVICE`) it falls back to the first device from `/me/player/devices`, or raises `NoActiveDevice` if there are none. `offset_uri` (a `spotify:track:...` URI) plays the whole album context starting at that track, rather than just that track in isolation — chosen deliberately so playback continues into the rest of the album afterward, matching Spotify's own apps. `normalize_context_uri()` accepts either a `spotify:album:...` URI or an `open.spotify.com/album/...` share link in the album's `spotifyUri` field, since that field is free text.
- `views.spotify_connect`/`spotify_callback` are **plain Django views, not `ApiView`** — OAuth requires a real browser redirect to Spotify's consent screen, which `fetch()` cannot do. The OAuth `state` param is stored in `request.session` and checked on callback to guard against CSRF on the callback endpoint.
- `SpotifyAccount.access_token`/`refresh_token` are stored **in plaintext**. Deliberate for this self-hosted, single-tenant-per-deployment app — see [configuration.md](configuration.md) before changing this if the deployment model ever changes (multi-tenant, exposed beyond trusted users).

Setting up the redirect URI correctly in the Spotify Dashboard is the single most common source of playback-connect failures — see [configuration.md](configuration.md#spotify-dashboard-setup).

`PlayerClient.currently_playing()` wraps "Get Playback State" (`GET /me/player`), used by `api/spotify/now-playing/` (`SpotifyNowPlayingView`) to feed the React sidebar's now-playing card — see [frontend.md](frontend.md#react-rewrite). It returns `None` on Spotify's 204 (nothing to report); the view treats *any* failure (no linked account, no active device, a request exception) the same way, as `{"playing": false}` — this endpoint is polled every few seconds, so it must never surface an error to the UI, just silently report nothing. A response with `is_playing: false` (e.g. paused) is also reported as `playing: false` to the frontend — the card is meant to reflect active playback, not track a paused session. `albumImage` uses the *smallest* of Spotify's provided image sizes (`images[-1]`, since the API orders them largest-first) since it's only ever shown as a small thumbnail.

**`api/spotify/top-albums/`** (`SpotifyTopAlbumsView`) powers the statistics view's "Most listened on Spotify" — Spotify has no top-albums endpoint, so it calls `PlayerClient.top_tracks(time_range)` ("Get User's Top Items", tracks) and groups the results by album, ordering by how many of the user's top tracks came from each (`track_count`), capped at 10. This requires the `user-top-read` OAuth scope, added alongside the two playback scopes already requested — an account connected *before* this scope was added won't have it, so the view checks `"user-top-read" in account.scope.split()` (the `scope` string Spotify actually granted, stored on `SpotifyAccount` at OAuth callback) and returns `{"code": "insufficient_scope"}` (409) rather than letting Spotify's own 403 surface. Re-running the existing OAuth flow (no separate disconnect needed) requests the fuller scope and overwrites the stored tokens via `get_or_create` in `spotify_callback`. Each result item is `{spotify_id, spotify_uri, name, artists[], cover_url, external_url, track_count}` — deliberately minimal (no release date, genres, tracklist) since adding one to the collection re-fetches the full detail through the already-existing `api/spotify/albums/<id>/` endpoint rather than duplicating that shape here.
