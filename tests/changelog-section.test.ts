import { expect, test } from 'vitest';
import { changelogSection } from '../scripts/changelog-section.mjs';

const changelog = `# Changelog

## [Unreleased]

- Not released yet.

## [0.1.0] - 2026-12-01

- First line.
- Second line.

## [0.1.0-rc.1]

- Candidate.

## [0.0.9]

- Old.

## [10.1.0]

- Far future.
`;

test('the section is the text between its heading and the next one', () => {
  expect(changelogSection(changelog, '0.1.0')).toBe('- First line.\n- Second line.');
});

test('a heading without a date suffix works', () => {
  expect(changelogSection(changelog, '0.1.0-rc.1')).toBe('- Candidate.');
});

test('the last section runs to the end of the file', () => {
  expect(changelogSection(changelog, '10.1.0')).toBe('- Far future.');
});

test('a version without a heading throws and names the version', () => {
  expect(() => changelogSection(changelog, '0.2.0')).toThrow(/0\.2\.0/);
});

test('an empty section throws and names the version', () => {
  expect(() => changelogSection('## [0.1.0]\n\n## [0.0.9]\n\n- Old.\n', '0.1.0')).toThrow(
    /0\.1\.0/,
  );
});

test('a version and its release candidate never match each other', () => {
  expect(() => changelogSection('## [0.1.0-rc.1]\n\n- Candidate.\n', '0.1.0')).toThrow(/0\.1\.0/);
  expect(() => changelogSection('## [0.1.0]\n\n- Final.\n', '0.1.0-rc.1')).toThrow(/0\.1\.0-rc\.1/);
});

test('0.1.0 does not match inside 10.1.0', () => {
  expect(() => changelogSection('## [10.1.0]\n\n- Far future.\n', '0.1.0')).toThrow(/0\.1\.0/);
});

test('the Unreleased content is never returned for a version', () => {
  expect(() => changelogSection('## [Unreleased]\n\n- Not yet.\n', 'Unreleased')).toThrow();
  expect(changelogSection(changelog, '0.0.9')).not.toContain('Not released yet');
});
