# TODO — package review follow-ups

Source: senior-review pass on 2026-09-17 (main @ 31bb0a9, v0.2.1). Items are ordered by
priority; tick them as they land. Status as of 2026-09-17: everything code-side landed on
`chore/review-fixes` (95 tests green on Django 4.2.30 / 5.2.17 / 6.1, ruff clean); the rest needs you. Verified facts, not guesses — each item names the file/line
where the gap was confirmed.

## High

- [x] **CI matrix** — no `.github/workflows/`, no `tox.ini`; classifiers promise Django 4.2/5.0/6.0
      with nothing backing them. Add GitHub Actions matrix (Python 3.10–3.13 × Django 4.2/5.2/6.0)
      + a ruff lint job. Fix classifiers (5.0 is EOL → 5.2 LTS; add Python versions).
- [ ] **Tags/releases** (code half done: `__version__` now comes from `importlib.metadata`;
      tags still missing — see "Needs the user") — zero git tags, zero GitHub releases, not on PyPI, while `pyproject.toml`
      went 0.1.0 → 0.2.0 → 0.2.1. `music_vault/__init__.py` still says `0.1.0`.
      Tag `v0.1.0`=f756d73, `v0.2.0`=cd4c6c7, `v0.2.1`=a87be40; derive `__version__` from
      `importlib.metadata`.

## Medium

- [x] **Catch-all public route shadows host routes** — `urls.py` `<str:username>/<slug>/` matches
      any two-segment path the host registers *after* `include("music_vault.urls")`. Document
      "include last" in `docs/integration.md` + the `urls.py` comment.
- [x] **No `django.core.checks`** — `apps.py` has no `ready()`. Add `checks.py`: W001 Spotify
      credentials missing, W002 `MEDIA_ROOT` empty (covers would land relative to CWD).
- [x] **500 on non-object JSON body** — `ApiView.dispatch` accepts any JSON; `POST api/libraries/`
      with `[]`, or `api/import/` with non-dict library/album entries → `AttributeError`.
- [x] **ruff not configured / not in CI** — `F401` unused `method_decorator` (`views.py:12`),
      `E741` `l` (`views.py:110,229`), 49× `E501`@100, `ruff format --check` → 17 files.
- [x] **Cover download** — `requests.get` follows redirects (host allowlist only checked on the
      initial URL), trusts `Content-Type` blindly, never closes the streamed response.

## Low

- [x] **Missing tests** — `SpotifyAlbumView` (0 tests), search success path, cross-user PUT
      library/album + POST album into another user's library.
- [x] **Type hints** — none on `views.py`/`serializers.py`/`covers.py` public functions;
      `SpotifyClient.__init__`, `PlayerClient.__init__` unannotated.
- [x] **Small cleanups** — `_get_credentials` duplicated (`oauth.py`, `service.py`);
      `service._service` singleton ignores later settings changes; `client.py` sleeps an
      unbounded `Retry-After`; OAuth `state` compare not constant-time.
- [x] **CHANGELOG.md** — created 2026-09-17; keep an `[Unreleased]` section going.

## Needs the user (outward-facing)

- [ ] Create + push the tags (annotated, on the exact bump commits):
      `git tag -a v0.1.0 f756d73 -m 0.1.0 && git tag -a v0.2.0 cd4c6c7 -m 0.2.0 && git tag -a v0.2.1 a87be40 -m 0.2.1 && git push origin --tags`,
      then GitHub releases from them. From now on: bump `pyproject.toml`, move `[Unreleased]` in
      `CHANGELOG.md` to the version, tag, in the same PR.
- [ ] `pip install -e .` again in the repo's `.venv` (and the external dev-server venv) — the stale
      editable metadata there still reports 0.1.0, so `music_vault.__version__` reads 0.1.0 until then.
- [ ] Decide whether public share URLs move under a prefix (breaking → 0.3.0) or stay at
      `/<username>/<slug>/` with the "include last" rule.
