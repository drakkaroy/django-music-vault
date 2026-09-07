import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Builds straight into the Django package's static folder, with fixed
// (unhashed) filenames — no manifest, no extra Python dependency to read
// one. The compiled output is committed to git so `pip install` never
// needs Node; only frontend development does. See docs/frontend.md.
export default defineConfig({
  plugins: [react()],
  server: {
    // `npm run dev` serves the app standalone; proxy API/auth/OAuth paths
    // to a real Django dev server (`DB_ENGINE=sqlite3 python manage.py
    // runserver` in the repo root) so there's no CORS/cookie juggling —
    // the browser only ever talks to Vite's origin.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/accounts': 'http://127.0.0.1:8000',
      '/spotify': 'http://127.0.0.1:8000',
    },
  },
  build: {
    outDir: '../music_vault/static/music_vault/react-app',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'app-[name].js',
        assetFileNames: (info) => (info.name?.endsWith('.css') ? 'app.css' : 'assets/[name][extname]'),
      },
    },
  },
})
