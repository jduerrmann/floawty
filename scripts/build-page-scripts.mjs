// Bundles each src/services/<id>/page.ts into a self-contained dist/page/<id>.js (IIFE).
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { build } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const servicesDir = path.join(root, 'src', 'services');

const ids = readdirSync(servicesDir, { withFileTypes: true })
  .filter(
    (entry) => entry.isDirectory() && existsSync(path.join(servicesDir, entry.name, 'page.ts')),
  )
  .map((entry) => entry.name);

for (const id of ids) {
  await build({
    configFile: false,
    root,
    logLevel: 'warn',
    build: {
      target: 'es2022',
      outDir: 'dist/page',
      emptyOutDir: false,
      lib: {
        entry: path.join(servicesDir, id, 'page.ts'),
        formats: ['iife'],
        // Service ids may contain dashes; the IIFE name must be an identifier.
        name: `floawtyPage_${id.replaceAll('-', '_')}`,
        fileName: () => `${id}.js`,
      },
    },
  });
}
