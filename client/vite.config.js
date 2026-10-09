import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the React dev server proxies /api to the Express server,
// so the browser only ever talks to one origin (no CORS setup needed).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // allow importing ../shared/menu-seed.json in dev
    fs: { allow: ['..'] },
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
