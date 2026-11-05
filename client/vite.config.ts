/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev server proxies /api to the Node API so the browser sees one origin
// (needed for the SameSite=Strict admin cookie).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: { '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false } },
  },
  preview: { port: 4173, host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:4000' } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], i18n: ['i18next', 'react-i18next'] },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    css: false,
  },
});
