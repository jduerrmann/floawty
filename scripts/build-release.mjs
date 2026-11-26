// `npm run build:release` writes floawty-X.Y.Z-setup.exe and floawty-X.Y.Z-portable.exe to release\.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const cli = path.join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
const target = path.join(root, 'src-tauri', 'target', 'release');
const release = path.join(root, 'release');
// tauri-utils' bundle-type marker as built; the bundler replaces it in the setup's exe.
const UNPATCHED_MARKER = '__TAURI_BUNDLE_TYPE_VAR_UNK';

const config = JSON.parse(readFileSync(path.join(root, 'src-tauri', 'tauri.conf.json'), 'utf8'));
const { productName, version } = config;

// Cleared first, so a failed build never leaves older artifacts behind.
rmSync(release, { recursive: true, force: true });
execFileSync(process.execPath, [cli, 'build'], { cwd: root, stdio: 'inherit' });

const portable = path.join(target, 'floawty.exe');
// The bundler patches the exe only while it packs the setup; a patched copy would count as installed.
if (!readFileSync(portable).includes(UNPATCHED_MARKER)) {
  throw new Error(`${portable} carries a bundle type, so it cannot be the portable build`);
}
mkdirSync(release);
const setup = path.join(target, 'bundle', 'nsis', `${productName}_${version}_x64-setup.exe`);
copyFileSync(setup, path.join(release, `floawty-${version}-setup.exe`));
copyFileSync(portable, path.join(release, `floawty-${version}-portable.exe`));
