// `npm run build:update-test`: a floawty that asks 127.0.0.1:9335 for updates, signed with a
// throwaway key, plus the signed payloads tests/update.spec.ts serves. All under
// src-tauri/target/update-test, so the normal build in target/release is never replaced.
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { patchBundleType, UPDATE_TEST } from './update-test.mjs';

const root = path.resolve(import.meta.dirname, '..');
const cli = path.join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
const dir = path.join(root, UPDATE_TEST.dir);
const tauri = (args, env = process.env) =>
  execFileSync(process.execPath, [cli, ...args], { cwd: root, stdio: 'inherit', env });

mkdirSync(dir, { recursive: true });
const key = path.join(dir, 'updater.key');
// No password: the key signs nothing but these test files.
if (!existsSync(key)) tauri(['signer', 'generate', '--ci', '-p', '', '-w', key]);

const override = path.join(dir, 'tauri.update-test.json');
const updater = {
  pubkey: readFileSync(`${key}.pub`, 'utf8').trim(),
  endpoints: [`http://127.0.0.1:${UPDATE_TEST.port}/latest.json`],
  dangerousInsecureTransportProtocol: true,
};
writeFileSync(override, JSON.stringify({ plugins: { updater } }, null, 2));
tauri(['build', '--no-bundle', '--config', override], {
  ...process.env,
  CARGO_TARGET_DIR: path.join(dir, 'cargo'),
});

const built = path.join(dir, 'cargo', 'release', 'floawty.exe');
copyFileSync(built, path.join(dir, UPDATE_TEST.portable));
// What the NSIS bundler does to the exe it packs, so this copy runs as an installed floawty.
writeFileSync(path.join(dir, UPDATE_TEST.installed), patchBundleType(readFileSync(built)));

// Any exe will do: hidden runs swallow the call that would start it.
const payload = path.join(dir, UPDATE_TEST.payload);
copyFileSync(
  path.join(root, 'tools', 'test-input', 'target', 'release', 'test-input.exe'),
  payload,
);
const sign = (file, version = UPDATE_TEST.version) =>
  tauri(['signer', 'sign', '-f', key, '-p', '', '--app-version', version, file]);
sign(payload);
// The same bytes signed for another version, for an announced version that does not match.
const otherVersion = path.join(dir, 'other-version.exe');
copyFileSync(payload, otherVersion);
sign(otherVersion, '9.9.8');
// A signature over other bytes, for the rejected update.
const other = path.join(dir, 'other.exe');
writeFileSync(other, Buffer.concat([readFileSync(payload), Buffer.from([0])]));
sign(other);
