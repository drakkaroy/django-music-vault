# Releasing

Releases go to [PyPI](https://pypi.org/p/django-music-vault) from GitHub Actions (`.github/workflows/release.yml`) whenever a `v*` tag is pushed. Nothing is uploaded from a laptop, and no PyPI token is stored anywhere: the workflow uses **Trusted Publishing** (OIDC), where PyPI is told to trust this exact repository + workflow file + environment name.

## One-time setup (PyPI side)

1. Create the PyPI account (with 2FA — required for publishing) at https://pypi.org/account/register/.
2. Go to https://pypi.org/manage/account/publishing/ and add a **pending publisher** (the project doesn't exist on PyPI yet — a pending publisher reserves the name and creates the project on the first upload):
   - PyPI project name: `django-music-vault`
   - Owner: `drakkaroy`
   - Repository name: `django-music-vault`
   - Workflow name: `release.yml`
   - Environment name: `pypi`
3. On GitHub, *Settings → Environments → New environment* named `pypi`. Optionally add yourself as a required reviewer so a tag push doesn't publish until you approve the `publish` job.

Every value must match the workflow exactly (the environment name included) or PyPI rejects the upload with an "invalid-publisher" error.

## Every release

1. Bump `version` in `pyproject.toml` (this is the single source of truth — `music_vault.__version__` reads it from the installed metadata).
2. In `CHANGELOG.md`, rename `[Unreleased]` to the version + date, start a fresh empty `[Unreleased]`, and update the compare links at the bottom.
3. Merge to `main`, then tag the merge commit and push the tag:
   ```bash
   git tag -a v0.3.0 -m "0.3.0"
   git push origin v0.3.0
   ```
4. The workflow builds sdist + wheel, refuses to continue if the tag doesn't match `pyproject.toml`, runs `twine check`, publishes to PyPI, and creates a GitHub release with the files attached.

## Checking a build locally

```bash
pip install build twine
python -m build && twine check dist/*
```

The wheel must contain `music_vault/templates/**` and `music_vault/static/**` (the built React bundle lives in `static/music_vault/react-app/` and is committed — see [frontend.md](frontend.md#react-rewrite)); the sdist must **not** contain `.env`, `media/`, `db.sqlite3` or `frontend/` (they're outside the package; a quick `tar tzf dist/*.tar.gz | grep -E '\.env|media/'` should print nothing).

## Manual fallback (API token)

If Actions is unavailable: create a project-scoped API token on PyPI, then `twine upload dist/*` with `TWINE_USERNAME=__token__` and `TWINE_PASSWORD=<token>`. Prefer the workflow — a token is a long-lived secret to protect, the OIDC trust isn't.
