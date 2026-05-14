import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'node:path';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  envDir: __dirname,
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist-electron/renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/renderer/index.html'),
    },
  },
  resolve: {
    alias: [
      {
        find: /^@vibes\/shared$/,
        replacement: path.resolve(__dirname, '../shared/src/index.ts'),
      },
      {
        find: /^@vibes\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../shared/src/$1.ts'),
      },
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
