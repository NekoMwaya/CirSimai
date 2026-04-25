import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Remove the GitHub Pages sub-path base; Vercel hosts at the domain root
  base: '/'
})
