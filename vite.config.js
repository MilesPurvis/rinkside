import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://api.flohockey.tv',
        changeOrigin: true,
        headers: {
          'Origin': 'https://www.flohockey.tv',
          'Referer': 'https://www.flohockey.tv/',
          'x-flo-app': 'flosports-webapp',
          'x-301-location': 'web',
        },
      },
      '/live-api': {
        target: 'https://live-api-3.flosports.tv',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/live-api/, ''),
        headers: {
          'Origin': 'https://www.flohockey.tv',
          'Referer': 'https://www.flohockey.tv/',
          'x-flo-app': 'flosports-webapp',
          'x-301-location': 'web',
        },
      },
    },
  },
})
