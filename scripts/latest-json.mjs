// Writes the updater's latest.json:
// `node scripts/latest-json.mjs <version> <setup url> <signature file> <out file> [notes file]`.
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

/** @type {import('./latest-json.d.mts').latestJson} */
export function latestJson({ version, notes, pubDate, signature, url }) {
  if (!VERSION.test(version)) throw new Error(`version "${version}" is not X.Y.Z or X.Y.Z-suffix`);
  if (signature.trim() === '') throw new Error('signature is empty');
  if (!URL.canParse(url)) throw new Error(`url "${url}" is not a URL`);
  return {
    version,
    notes,
    pub_date: pubDate.toISOString(),
    platforms: { 'windows-x86_64': { signature: signature.trim(), url } },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [version, url, signatureFile, out, notesFile] = process.argv.slice(2);
  if (!out) {
    process.stderr.write('usage: latest-json.mjs <version> <url> <signature file> <out> [notes]\n');
    process.exit(2);
  }
  const json = latestJson({
    version,
    url,
    signature: readFileSync(signatureFile, 'utf8'),
    notes: notesFile ? readFileSync(notesFile, 'utf8').trim() : '',
    pubDate: new Date(),
  });
  writeFileSync(out, `${JSON.stringify(json, null, 2)}\n`);
}
