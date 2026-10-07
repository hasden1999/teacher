import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,wasm,woff,woff2}'],
        // 15MB limit to allow sqlite3.wasm precaching without omission
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
      manifest: false, // Use public/manifest.webmanifest directly for exact control
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@techeeer/core': path.resolve(import.meta.dirname, '../../packages/core/src/index.ts'),
      '@techeeer/content': path.resolve(import.meta.dirname, '../../packages/content/src/index.ts'),
    },
  },
  worker: {
    format: 'es',
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
