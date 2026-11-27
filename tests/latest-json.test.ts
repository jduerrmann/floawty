import { expect, test } from 'vitest';
import { latestJson } from '../scripts/latest-json.mjs';

const release = {
  version: '0.1.1',
  notes: '- A fix.',
  pubDate: new Date('2026-11-27T20:00:00Z'),
  signature: 'dW50cnVzdGVkIGNvbW1lbnQ=\n',
  url: 'https://github.com/jduerrmann/floawty/releases/download/v0.1.1/floawty-0.1.1-setup.exe',
};

test('latest.json names the version, notes, date and the setup with its signature', () => {
  expect(latestJson(release)).toEqual({
    version: '0.1.1',
    notes: '- A fix.',
    pub_date: '2026-11-27T20:00:00.000Z',
    platforms: {
      'windows-x86_64': {
        signature: 'dW50cnVzdGVkIGNvbW1lbnQ=',
        url: 'https://github.com/jduerrmann/floawty/releases/download/v0.1.1/floawty-0.1.1-setup.exe',
      },
    },
  });
});

test('a release candidate version is accepted', () => {
  expect(latestJson({ ...release, version: '0.1.0-rc.2' }).version).toBe('0.1.0-rc.2');
});

test('a version with a leading v or without three numbers is refused', () => {
  expect(() => latestJson({ ...release, version: 'v0.1.1' })).toThrow(/version/);
  expect(() => latestJson({ ...release, version: '0.1' })).toThrow(/version/);
});

test('an empty signature is refused', () => {
  expect(() => latestJson({ ...release, signature: ' \n' })).toThrow(/signature/);
});

test('a setup address that is not a URL is refused', () => {
  expect(() => latestJson({ ...release, url: 'floawty-0.1.1-setup.exe' })).toThrow(/url/);
});
