import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: { rollupOptions: { output: { manualChunks: (id: string) => {
      if (id.includes('node_modules/@firebase/firestore')) return 'firebase-firestore';
      if (id.includes('node_modules/@firebase/auth')) return 'firebase-auth';
      if (id.includes('node_modules/@firebase/storage')) return 'firebase-storage';
      if (id.includes('node_modules/@firebase') || id.includes('node_modules/firebase/')) return 'firebase-core';
      if (id.includes('node_modules/leaflet/')) return 'maps';
    } } } },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/test-results*/**', '**/playwright-report/**', '**/docs/screenshots/**', '**/*-debug.log'] },
    },
  };
});
