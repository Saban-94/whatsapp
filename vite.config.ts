import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.APP_URL': JSON.stringify(process.env.APP_URL || ''),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
  optimizeDeps: {
    exclude: ['fsevents']
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: [
        'fsevents',
        'node:path',
        'node:fs',
        'node:url',
        'node:util',
        'node:module',
        'node:crypto',
        'node:net',
        'node:http',
        'node:https',
        'node:process',
        'node:events',
        'node:child_process',
        'path',
        'fs',
        'util',
        'crypto',
        'os',
        'events',
        'stream'
      ]
    }
  }
});
