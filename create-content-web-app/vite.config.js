import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@api':        path.resolve(__dirname, 'src/api'),
      '@store':      path.resolve(__dirname, 'src/store'),
      '@hooks':      path.resolve(__dirname, 'src/hooks'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@layouts':    path.resolve(__dirname, 'src/layouts'),
      '@pages':      path.resolve(__dirname, 'src/pages'),
      '@features':   path.resolve(__dirname, 'src/features'),
      '@shared':     path.resolve(__dirname, 'src/shared'),
      '@container':  path.resolve(__dirname, 'src/container'),
      '@styles':     path.resolve(__dirname, 'src/styles'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3100', changeOrigin: true },
    },
  },
});
