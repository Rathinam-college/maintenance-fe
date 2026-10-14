import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/maintenance/',
  server: {
    allowedHosts: ['insight.rathinamtechzone.com', 'localhost'],
    host: '0.0.0.0',
    hmr: false,
  },
  plugins: [react(), tailwindcss()],
})
