import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The /api proxy points at the local Fenwick capture/agent service that will
// run on this workstation. Nothing listens there yet, so requests fail and the
// UI shows its honest offline states until a real service is connected.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9400',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
