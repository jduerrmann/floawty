// `npm run icons` draws src-tauri/icons/ from the SVGs in src-tauri/icons/source/.
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const icons = path.join(root, 'src-tauri', 'icons');
const cli = path.join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');

// `tauri icon` scales one drawing, which blurs the eyes below 48 px, so each small size has its own.
const DRAWINGS = [
  { source: 'icon-16.svg', sizes: [16] },
  { source: 'icon-20.svg', sizes: [20] },
  { source: 'icon-24.svg', sizes: [24] },
  { source: 'icon-32.svg', sizes: [32] },
  { source: 'icon.svg', sizes: [48, 128, 256] },
];
const ICO_SIZES = [16, 20, 24, 32, 48, 256];
const HEADER_BYTES = 6;
const ENTRY_BYTES = 16;

function render(out) {
  for (const { source, sizes } of DRAWINGS) {
    const input = path.join(icons, 'source', source);
    const args = [cli, 'icon', input, '--png', sizes.join(','), '--output', out];
    execFileSync(process.execPath, args, { stdio: ['ignore', 'ignore', 'inherit'] });
  }
}

function buildIco(frames) {
  const header = Buffer.alloc(HEADER_BYTES + ENTRY_BYTES * frames.length);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach(({ size, png }, index) => {
    const entry = HEADER_BYTES + ENTRY_BYTES * index;
    // The format stores 256 as 0, as a size has only one byte.
    header.writeUInt8(size % 256, entry);
    header.writeUInt8(size % 256, entry + 1);
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...frames.map(({ png }) => png)]);
}

const out = mkdtempSync(path.join(tmpdir(), 'floawty-icons-'));
try {
  render(out);
  const pngOf = (size) => path.join(out, `${size}x${size}.png`);
  const frames = ICO_SIZES.map((size) => ({ size, png: readFileSync(pngOf(size)) }));
  writeFileSync(path.join(icons, 'icon.ico'), buildIco(frames));
  for (const size of [32, 128]) copyFileSync(pngOf(size), path.join(icons, `${size}x${size}.png`));
} finally {
  rmSync(out, { recursive: true, force: true });
}
