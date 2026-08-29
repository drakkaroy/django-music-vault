# VinylVault frontend (React + TypeScript)

React/TypeScript rewrite of the VinylVault UI, in progress alongside the original vanilla HTML/CSS/JS frontend (`music_vault/static/music_vault/`, `music_vault/templates/music_vault/vinylvault.html`). See [../docs/frontend.md](../docs/frontend.md) for the full picture: why this exists, how it's built into the Django package, and current migration status.

## Commands

```bash
npm install
npm run dev      # standalone dev server with HMR — proxies /api, /accounts, /spotify to a real
                  # Django dev server on :8000 (DB_ENGINE=sqlite3 python manage.py runserver, from the repo root)
npm run build     # tsc -b && vite build — outputs into ../music_vault/static/music_vault/react-app/
npm run lint      # oxlint
npm run smoke     # runtime check of the built bundle in jsdom (see scripts/smoke.mjs) — this
                  # environment has no browser available, so this is the closest thing to a
                  # real render check; run it after every build
```

`npm run build`'s output is committed to the repo (not gitignored) so `pip install`ing the package never requires Node — only frontend development does.
