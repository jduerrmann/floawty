import { expect, test } from 'vitest';
import { patchBundleType } from '../scripts/update-test.mjs';

const exe = (...parts: string[]) => Buffer.from(parts.join(''));

test('the bundle-type marker becomes the NSIS one and nothing else changes', () => {
  const patched = patchBundleType(exe('MZ..', '__TAURI_BUNDLE_TYPE_VAR_UNK', '..end'));
  expect(patched.toString()).toBe('MZ..__TAURI_BUNDLE_TYPE_VAR_NSS..end');
});

test('an exe without the marker or with it twice is refused', () => {
  expect(() => patchBundleType(exe('MZ..'))).toThrow(/exactly once/);
  const twice = exe('__TAURI_BUNDLE_TYPE_VAR_UNK', '__TAURI_BUNDLE_TYPE_VAR_UNK');
  expect(() => patchBundleType(twice)).toThrow(/exactly once/);
});

test('the input stays as it was', () => {
  const input = exe('__TAURI_BUNDLE_TYPE_VAR_UNK');
  patchBundleType(input);
  expect(input.toString()).toBe('__TAURI_BUNDLE_TYPE_VAR_UNK');
});
