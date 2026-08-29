# VinylVault frontend (React + TypeScript)

React/TypeScript rewrite of the VinylVault UI, in progress alongside the original vanilla HTML/CSS/JS frontend (`music_vault/static/music_vault/`, `music_vault/templates/music_vault/vinylvault.html`). See [../docs/frontend.md](../docs/frontend.md) for the full picture: why this exists, how it's built into the Django package, and current migration status.

## Commands

```bash
npm install
npm run dev      # standalone dev server with HMR — proxies /api, /accounts, /spotify to a real
                  # Django dev server on :8000 (DB_ENGINE=sqlite3 python manage.py runserver, from the repo root)
npm run build     # tsc -b && vite build — outputs into ../music_vault/static/music_vault/react-app/
npm run lint      # oxlint
npm run format    # prettier --write, all of src/ (ts/tsx/css) + index.html — run before every commit
npm run format:check   # same, but just checks (no writes) — CI-friendly
npm run smoke     # runtime check of the built bundle in jsdom (see scripts/smoke.mjs) — this
                  # environment has no browser available, so this is the closest thing to a
                  # real render check; run it after every build
```

`npm run build`'s output is committed to the repo (not gitignored) so `pip install`ing the package never requires Node — only frontend development does.

## Style

Prettier (`.prettierrc.json`: no semicolons, single quotes, trailing commas, 2-space indent) formats every `.ts`/`.tsx`/`.css` file plus `index.html` — run `npm run format` before committing. The one file this doesn't cover is `../music_vault/templates/music_vault/vinylvault_react.html`: it's a Django template (`{% %}`/`{{ }}` tags), and Prettier's HTML parser doesn't understand Django template syntax, so that file is kept readable by hand instead.
