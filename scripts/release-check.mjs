// Refuses a release whose files disagree with its tag: `node scripts/release-check.mjs <tag>`.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { changelogSection } from './changelog-section.mjs';

const TAG = /^v(\d+\.\d+\.\d+(?:-rc\.\d+)?)$/;
const VERSION_LINE = /^version\s*=\s*"([^"]*)"/;

/** The first `version = "..."` of the `[package]` table. */
function cargoTomlVersion(text) {
  let inPackage = false;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('[')) inPackage = line.trim() === '[package]';
    else if (inPackage && VERSION_LINE.test(line)) return VERSION_LINE.exec(line)[1];
  }
  return undefined;
}

/** The version of the `[[package]]` named floawty. */
function cargoLockVersion(text) {
  const block = text.split('[[package]]').find((part) => /^name\s*=\s*"floawty"\s*$/m.test(part));
  return block
    ?.split(/\r?\n/)
    .map((line) => VERSION_LINE.exec(line)?.[1])
    .find(Boolean);
}

/** @type {import('./release-check.d.mts').releaseProblems} */
export function releaseProblems(files) {
  const match = TAG.exec(files.tag);
  if (!match) return [`tag "${files.tag}" is not vX.Y.Z or vX.Y.Z-rc.N`];
  const version = match[1];
  const packageLock = JSON.parse(files.packageLock);
  const tauriConf = JSON.parse(files.tauriConf);
  const found = [
    ['package.json', JSON.parse(files.packageJson).version],
    ['package-lock.json', packageLock.version],
    ['package-lock.json packages[""]', packageLock.packages?.['']?.version],
    ['src-tauri/Cargo.toml', cargoTomlVersion(files.cargoToml)],
    ['src-tauri/Cargo.lock', cargoLockVersion(files.cargoLock)],
    ['src-tauri/tauri.conf.json', tauriConf.version],
  ];
  const problems = found
    .filter(([, actual]) => actual !== version)
    .map(([file, actual]) => `${file} has version ${actual ?? '(none)'}, the tag is ${version}`);
  try {
    changelogSection(files.changelog, version);
  } catch (error) {
    problems.push(error.message);
  }
  const pubkey = tauriConf.plugins?.updater?.pubkey;
  if (typeof pubkey !== 'string' || pubkey.trim() === '') {
    problems.push(
      'plugins.updater.pubkey in src-tauri/tauri.conf.json is empty: the release could not be updated',
    );
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [tag] = process.argv.slice(2);
  if (!tag) {
    process.stderr.write('usage: release-check.mjs <tag>\n');
    process.exit(2);
  }
  const root = path.resolve(import.meta.dirname, '..');
  const read = (file) => readFileSync(path.join(root, file), 'utf8');
  const problems = releaseProblems({
    tag,
    packageJson: read('package.json'),
    packageLock: read('package-lock.json'),
    cargoToml: read('src-tauri/Cargo.toml'),
    cargoLock: read('src-tauri/Cargo.lock'),
    tauriConf: read('src-tauri/tauri.conf.json'),
    changelog: read('CHANGELOG.md'),
  });
  if (problems.length > 0) {
    process.stderr.write(`${problems.join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write(`release ${tag}: versions, CHANGELOG and updater key match\n`);
}
