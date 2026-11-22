import path from 'node:path';
import { expect, test } from 'vitest';
import { testedExe } from './tested-exe';

test('tests the release build by default', () => {
  expect(testedExe({})).toContain(path.join('src-tauri', 'target', 'release', 'floawty.exe'));
});

test('tests a named build, so a failing spec can run on the last good one', () => {
  expect(testedExe({ FLOAWTY_TEST_EXE: 'C:/builds/last-good.exe' })).toBe(
    'C:/builds/last-good.exe',
  );
});
