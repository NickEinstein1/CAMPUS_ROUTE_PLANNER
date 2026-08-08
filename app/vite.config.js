import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Landmark data lives at the repo root (../data) so the OSM build scripts
    // and the app share one copy. Allow Vite to read outside app/.
    fs: { allow: ['..'] },
  },
})
