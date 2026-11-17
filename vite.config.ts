// Vite builds floawty's own UI from src/; Tauri loads it from dist/.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: 'src',
  // No inlined data: URLs, so the strict CSP (img-src 'self') can stay as it is.
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: { input: { main: 'src/index.html', bar: 'src/bar.html' } },
  },
  server: { port: 1420, strictPort: true },
  clearScreen: false,
  test: { root: '.', include: ['src/**/*.test.ts'] },
});
