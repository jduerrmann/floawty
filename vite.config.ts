// Vite builds floawty's own UI from src/; Tauri loads it from dist/.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: 'src',
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2022' },
  server: { port: 1420, strictPort: true },
  clearScreen: false,
  test: { root: '.', include: ['src/**/*.test.ts'] },
});
