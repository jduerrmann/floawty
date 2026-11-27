// Shared by the update-test build and tests/update.spec.ts.
import { Buffer } from 'node:buffer';

/** @type {import('./update-test.d.mts').UPDATE_TEST} */
export const UPDATE_TEST = {
  dir: 'src-tauri/target/update-test',
  port: 9335,
  version: '9.9.9',
  portable: 'floawty-portable.exe',
  installed: 'floawty-installed.exe',
  payload: 'setup.exe',
};

const UNKNOWN = Buffer.from('__TAURI_BUNDLE_TYPE_VAR_UNK');
const NSIS = Buffer.from('__TAURI_BUNDLE_TYPE_VAR_NSS');

/** @type {import('./update-test.d.mts').patchBundleType} */
export function patchBundleType(exe) {
  const at = exe.indexOf(UNKNOWN);
  if (at < 0 || exe.indexOf(UNKNOWN, at + 1) >= 0) {
    throw new Error('the exe must hold the unpatched bundle-type marker exactly once');
  }
  const patched = Buffer.from(exe);
  NSIS.copy(patched, at);
  return patched;
}
