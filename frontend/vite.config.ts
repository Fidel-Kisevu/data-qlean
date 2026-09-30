import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy every API route the backend serves.
      // Keep this list in sync with the backend's route prefixes.
      '/upload':      'http://localhost:8000',
      '/profile':     'http://localhost:8000',
      '/quality':     'http://localhost:8000',
      '/data':        'http://localhost:8000',
      '/suggestions': 'http://localhost:8000',
      '/transform':   'http://localhost:8000',
      '/changes':     'http://localhost:8000',
      '/export':      'http://localhost:8000',
      '/health':      'http://localhost:8000',
    },
  },
})
