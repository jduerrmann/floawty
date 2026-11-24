import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const icons = path.join(root, 'src-tauri', 'icons');
const MASTER = path.join('src-tauri', 'icons', 'source', 'icon.svg');
const TUNED = [32, 24, 20, 16].map((size) =>
  path.join('src-tauri', 'icons', 'source', `icon-${size}.svg`),
);
const LOGOS = ['light', 'dark'].map((theme) => path.join('assets', 'brand', `logo-${theme}.svg`));
const ICO_HEADER = 6;
const ICO_ENTRY = 16;

function read(file: string): string {
  const full = path.join(root, file);
  return existsSync(full) ? readFileSync(full, 'utf8') : '';
}

function pngSize(png: Buffer): [number, number] {
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

function icoEntries(ico: Buffer) {
  return Array.from({ length: ico.readUInt16LE(4) }, (_, index) => {
    const entry = ICO_HEADER + ICO_ENTRY * index;
    return {
      width: ico.readUInt8(entry) || 256,
      height: ico.readUInt8(entry + 1) || 256,
      planes: ico.readUInt16LE(entry + 4),
      bits: ico.readUInt16LE(entry + 6),
      bytes: ico.readUInt32LE(entry + 8),
      offset: ico.readUInt32LE(entry + 12),
    };
  });
}

function paths(svg: string): string[] {
  return [...svg.matchAll(/ d="([^"]+)"/g)].map((match) => match[1] ?? '');
}

function colours(svg: string): string[] {
  return [...svg.matchAll(/stop-color="([^"]+)"/g)].map((match) => match[1] ?? '');
}

function shapes(svg: string): string[] {
  return svg.match(/<(rect|path|stop)\b[^>]*>/g) ?? [];
}

describe('app icon', () => {
  const ico = readFileSync(path.join(icons, 'icon.ico'));

  it('has the six approved sizes', () => {
    expect(icoEntries(ico).map((entry) => entry.width)).toEqual([16, 20, 24, 32, 48, 256]);
  });

  it('describes each frame truthfully in its directory', () => {
    const entries = icoEntries(ico);
    let end = ICO_HEADER + ICO_ENTRY * entries.length;
    for (const { width, height, planes, bits, bytes, offset } of entries) {
      expect([height, planes, bits, offset]).toEqual([width, 1, 32, end]);
      expect(pngSize(ico.subarray(offset))).toEqual([width, height]);
      end += bytes;
    }
    expect(end).toBe(ico.length);
  });

  it.each([32, 128])('has the %i px PNG that the Tauri config lists', (size) => {
    expect(pngSize(readFileSync(path.join(icons, `${size}x${size}.png`)))).toEqual([size, size]);
  });

  it.each(TUNED)('%s has the outline and colours of the master', (file) => {
    // Three tentacles and the head are shared; the fifth path, the eyes, is tuned per size.
    const master = paths(read(MASTER));
    expect(master).toHaveLength(5);
    expect(paths(read(file))).toEqual(expect.arrayContaining(master.slice(0, 4)));
    expect(colours(read(file))).toEqual(colours(read(MASTER)));
  });

  it.each(LOGOS)('%s shows the master unchanged', (file) => {
    const master = shapes(read(MASTER));
    expect(master).not.toHaveLength(0);
    expect(shapes(read(file))).toEqual(expect.arrayContaining(master));
  });

  it.each([MASTER, ...TUNED, ...LOGOS])('%s is plain SVG', (file) => {
    const svg = read(file);
    expect(svg).toContain('<svg');
    expect(svg).not.toMatch(
      /<(text|image|script|style|use|foreignObject)|font|data:|href=| on\w+=/i,
    );
  });
});
