import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const resolvePath = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Builds straight into the Django package's static folder, with fixed
// (unhashed) filenames — no manifest, no extra Python dependency to read
// one. The compiled output is committed to git so `pip install` never
// needs Node; only frontend development does. See docs/frontend.md.
//
// Two HTML entries, built as two entirely SEPARATE `vite build` runs (see
// the `build` script in package.json: `--mode app` then `--mode public`,
// only the first empties outDir) rather than one multi-input build. `app`
// is the full authenticated app (index.html → app.js/app.css, served by
// vinylvault_react.html); `public` is the read-only public share page
// (public.html → public.js/public.css, served by vinylvault_public.html)
// — see docs/frontend.md#public-library-sharing. Splitting the builds
// keeps each output self-contained: they're two independent page loads
// (different URLs, no shared cache to exploit), so a Rollup shared chunk
// between them would only add a second network request with an
// unpredictable filename (Vite names a shared chunk's CSS after one of
// its component modules, not after either entry) — real bug hit while
// building this, not a hypothetical. Two full builds duplicate React
// itself between app.js/public.js, a few KB neither page notices.
export default defineConfig(({ mode }) => {
  const isPublic = mode === 'public'
  return {
    plugins: [react()],
    server: {
      // `npm run dev` serves both entries standalone (app at /, public
      // share page at /public.html); proxy API/auth/OAuth paths to a real
      // Django dev server (`DB_ENGINE=sqlite3 python manage.py runserver`
      // in the repo root) so there's no CORS/cookie juggling — the
      // browser only ever talks to Vite's origin.
      proxy: {
        '/api': 'http://127.0.0.1:8000',
        '/accounts': 'http://127.0.0.1:8000',
        '/spotify': 'http://127.0.0.1:8000',
      },
    },
    build: {
      outDir: '../music_vault/static/music_vault/react-app',
      // Only the `app` build (run first) clears the directory — the
      // `public` build that follows must not wipe app.js/app.css.
      emptyOutDir: !isPublic,
      rollupOptions: {
        input: resolvePath(isPublic ? './public.html' : './index.html'),
        output: {
          entryFileNames: `${isPublic ? 'public' : 'app'}.js`,
          assetFileNames: (info) =>
            info.name?.endsWith('.css') ? `${isPublic ? 'public' : 'app'}.css` : 'assets/[name][extname]',
        },
      },
    },
  }
})
