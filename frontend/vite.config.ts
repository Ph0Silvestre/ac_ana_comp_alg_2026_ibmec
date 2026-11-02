/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O backend só aceita CORS de http://localhost:5173. Com o proxy, o navegador
// fala sempre com a mesma origem do Vite e o CORS deixa de importar.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/status': 'http://127.0.0.1:8000',
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/status': 'http://127.0.0.1:8000',
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
