import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('leaflet')) return 'vendor-leaflet';
            if (id.includes('recharts')) return 'vendor-recharts';
            if (id.includes('react')) return 'vendor-react';
            return 'vendor-libs';
          }
        }
      }
    }
  }
})
