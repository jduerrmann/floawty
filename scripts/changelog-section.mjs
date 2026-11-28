// Writes one version's CHANGELOG section:
// `node scripts/changelog-section.mjs <version> <out file>`.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/** @type {import('./changelog-section.d.mts').changelogSection} */
export function changelogSection(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const heading = `## [${version}]`;
  // A version starts with a digit, so "Unreleased" can never match.
  const start = /^\d/.test(version) ? lines.findIndex((line) => line.startsWith(heading)) : -1;
  if (start === -1) throw new Error(`CHANGELOG has no section "${heading}"`);
  const length = lines.slice(start + 1).findIndex((line) => line.startsWith('## '));
  const body = lines.slice(start + 1, length === -1 ? undefined : start + 1 + length);
  const section = body.join('\n').trim();
  if (section === '') throw new Error(`CHANGELOG section "${heading}" is empty`);
  return section;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [version, out] = process.argv.slice(2);
  if (!version || !out) {
    process.stderr.write('usage: changelog-section.mjs <version> <out file>\n');
    process.exit(2);
  }
  const root = path.resolve(import.meta.dirname, '..');
  const changelog = readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  try {
    writeFileSync(out, `${changelogSection(changelog, version)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
