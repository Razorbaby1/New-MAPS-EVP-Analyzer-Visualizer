import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: update base if your repo name is different.
// For deployment to https://<user>.github.io/New-MAPS-EVP-Analyzer-Visualizer/ keep this value.
export default defineConfig({
  base: '/New-MAPS-EVP-Analyzer-Visualizer/',
  plugins: [react()],
  server: {
    port: 5173
  }
})
