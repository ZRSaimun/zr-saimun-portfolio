import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';

export default defineConfig({
  root: 'dist',
  publicDir: false,
  plugins: [{ name: 'copy-personal-archive', closeBundle() { cpSync('dist/assets', 'build/assets', { recursive: true }); } }],
  build: { outDir: '../build', emptyOutDir: true, assetsInlineLimit: 0 },
  server: { host: '0.0.0.0', port: 4173, strictPort: true, allowedHosts: ['terminal.local'] }
});
