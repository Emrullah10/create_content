import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Panel 127.0.0.1:5174'te, API 127.0.0.1:3100'de. `localhost` DEGIL: Node 24 localhost'u ::1'e cozebilir, servis yalniz IPv4'e baglanir.
// changeOrigin:true Host basligini hedefe cevirir (servis localGuard Host beyaz listesi).
const proxyTarget = globalThis.process?.env?.VITE_PROXY_TARGET || 'http://127.0.0.1:3100';
const appBase = globalThis.process?.env?.APP_BASE || '/';

export default defineConfig({
  base: appBase,
  plugins: [react()],
  css: { preprocessorOptions: { scss: { additionalData: '@use "@styles/globals" as *;' } } },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    proxy: { '/api': { target: proxyTarget, changeOrigin: true, secure: false } },
  },
  // Alias'lar UC yerde ayni tutulur: burasi, jsconfig.json, kok jest.config.js (webAliases).
  resolve: {
    alias: {
      '@assets': '/src/assets',
      '@components': '/src/components',
      '@container': '/src/container',
      '@hooks': '/src/hooks',
      '@layouts': '/src/layouts',
      '@pages': '/src/pages',
      '@router': '/src/router',
      '@shared': '/src/shared',
      '@store': '/src/store',
      '@styles': '/src/styles',
      '@api': '/src/api',
      '@utils': '/src/utils',
      '@features': '/src/features',
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react-router')) return 'vendor-react';
          if (id.includes('@mui/') || id.includes('@emotion/')) return 'vendor-mui';
        },
      },
    },
  },
});
