# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `CHANGELOG.md`, `TODO.md` and a GitHub Actions matrix (Django 4.2/5.2/6.0 × Python 3.10–3.13, plus `makemigrations --check` and ruff).
- System checks `music_vault.W001` (Spotify credentials unset) and `music_vault.W002` (`MEDIA_ROOT` empty), registered from `MusicVaultConfig.ready()`.
- ruff configuration (`[tool.ruff]`) and a `dev` extra; the codebase is ruff-formatted.
- Type hints across the API layer (`views.py`, `serializers.py`, `covers.py`) and the Spotify client constructors.

### Changed
- `music_vault.__version__` now comes from package metadata instead of a hand-maintained string (it had been stuck at `0.1.0`).
- Spotify app credentials are read in one place (`spotify/credentials.py`) for both auth flows; `get_service()` rebuilds its singleton when the configured credentials change.
- Classifiers: `Django :: 5.0` (EOL) replaced by `5.2`; explicit Python 3.10–3.13 classifiers.
- Docs: `include("music_vault.urls")` must come after the host's own routes — the public share page pattern matches any two-segment path.

### Fixed
- A valid-JSON-but-not-an-object request body (`[]`, `"x"`) and non-object entries in an import backup returned 500 instead of 400.
- Cover downloads no longer follow redirects off `i.scdn.co`, verify the image's magic bytes rather than trusting `Content-Type`, and close the streamed response.
- Spotify search `limit` is clamped to 1–50 (a negative value was passed through to Spotify).
- A 429 `Retry-After` from Spotify is capped at 30 s instead of sleeping the request thread for whatever Spotify said.

### Security
- OAuth callback `state` is compared in constant time.

## [0.2.1] - 2026-09-16

### Added
- Favicon on all pages, based on the sidebar brand logo.

### Fixed
- Public library share link used the wrong base path when the app was mounted under a URL prefix.
- Library color dot was not visible in the sidebar navigation.

## [0.2.0] - 2026-09-09

### Added
- Public, read-only library sharing at `/<username>/<library-slug>/` (`Library.is_public`, auto-generated `Library.slug`, `GET api/public/<username>/<slug>/`). Migration `0006_library_public_sharing`.
- React/TypeScript frontend (Vite) — now the default UI at `/`; the original vanilla frontend moved to `/legacy/`.
- Collection Statistics view, including "Most listened on Spotify" backed by `GET api/spotify/top-albums/`.
- Album star rating (0–5), `Album.rating`. Migration `0005_album_rating`.
- Album tracklists imported from Spotify or entered manually, with per-track playback. Migration `0004_album_tracks`.
- Spotify Connect playback: link a Spotify account (Authorization Code OAuth), play an album/track on the active device, now-playing card in the sidebar. Migration `0003_spotifyaccount`.
- Spotify search-and-save flow with best-effort local cover download (`Album.cover_file`). Migration `0002_album_cover_file`.
- Covers-only album view, tag suggestions while typing, debounced Spotify search, Export/Import in the React frontend.
- Default `registration/login.html` template shipped with the package (override-friendly).
- `MUSIC_VAULT_LOGOUT_URL` setting so hosts that don't use `django.contrib.auth.urls` (e.g. django-allauth) aren't forced onto `reverse("logout")`.
- Documentation restructured into `docs/` with an integration checklist.

### Changed
- Visible UI text rebranded from VinylVault to Music Vault.

### Fixed
- `NoReverseMatch` for the logout URL under django-allauth.
- Sidebar footer overflow with Export/Import buttons.

## [0.1.0] - 2026-08-10

### Added
- Initial release: `music_vault` reusable app (libraries, albums, tags, favorites) with the VinylVault frontend, JSON API and a standalone host project.

[Unreleased]: https://github.com/drakkaroy/django-music-vault/compare/v0.2.1...HEAD
<!-- 0.1.0–0.2.1 predate tagging; they link to the commits that bumped pyproject.toml. -->
[0.2.1]: https://github.com/drakkaroy/django-music-vault/compare/cd4c6c7...a87be40
[0.2.0]: https://github.com/drakkaroy/django-music-vault/compare/f756d73...cd4c6c7
[0.1.0]: https://github.com/drakkaroy/django-music-vault/tree/f756d73
