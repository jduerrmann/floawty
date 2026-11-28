import { expect, test } from 'vitest';
import { releaseProblems } from '../scripts/release-check.mjs';

function files(version: string) {
  return {
    packageJson: JSON.stringify({ name: 'floawty', version }),
    packageLock: JSON.stringify({
      name: 'floawty',
      version,
      packages: { '': { name: 'floawty', version } },
    }),
    cargoToml: `[package]\nname = "floawty"\nversion = "${version}"\nedition = "2021"\n\n[dependencies]\nserde = { version = "2" }\nversion = "2"\n`,
    cargoLock: `[[package]]\nname = "other"\nversion = "9.9.9"\n\n[[package]]\nname = "floawty"\nversion = "${version}"\n`,
    tauriConf: JSON.stringify({ version, plugins: { updater: { pubkey: 'dW50cnVzdGVk' } } }),
    changelog: `# Changelog\n\n## [Unreleased]\n\n- Next.\n\n## [${version}] - 2026-12-01\n\n- Released.\n`,
  };
}

const input = (tag: string, version = tag.slice(1)) => ({ tag, ...files(version) });

test('consistent files for a release tag have no problems', () => {
  expect(releaseProblems(input('v0.1.0'))).toEqual([]);
});

test('consistent files for a release candidate have no problems', () => {
  expect(releaseProblems(input('v0.1.0-rc.1'))).toEqual([]);
});

test.each(['0.1.0', 'v0.1', 'v0.1.0-beta.1'])(
  'the tag %s is one problem and nothing else',
  (tag) => {
    const problems = releaseProblems({ ...files('0.1.0'), tag });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(tag);
  },
);

test('a package.json version that differs names the file and the found version', () => {
  const problems = releaseProblems({ ...input('v0.1.0'), packageJson: files('0.0.9').packageJson });
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain('package.json');
  expect(problems[0]).toContain('0.0.9');
});

test('both versions in package-lock.json are checked', () => {
  const stale = JSON.parse(files('0.1.0').packageLock);
  stale.version = '0.0.8';
  stale.packages[''].version = '0.0.7';
  const problems = releaseProblems({ ...input('v0.1.0'), packageLock: JSON.stringify(stale) });
  expect(problems).toHaveLength(2);
  expect(problems.join('\n')).toContain('0.0.8');
  expect(problems.join('\n')).toContain('0.0.7');
});

test('a later dependencies table does not shadow the package version in Cargo.toml', () => {
  expect(releaseProblems(input('v0.1.0'))).toEqual([]);
  const problems = releaseProblems({ ...input('v0.1.0'), cargoToml: files('0.0.9').cargoToml });
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain('Cargo.toml');
  expect(problems[0]).toContain('0.0.9');
});

test('a table before [package] does not stand in for the package version', () => {
  const cargoToml = `[workspace.package]\nversion = "9.9.9"\n\n${files('0.1.0').cargoToml}`;
  expect(releaseProblems({ ...input('v0.1.0'), cargoToml })).toEqual([]);
});

test('Cargo.lock is read from the floawty package, not the first one', () => {
  const problems = releaseProblems({ ...input('v0.1.0'), cargoLock: files('0.0.9').cargoLock });
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain('Cargo.lock');
  expect(problems[0]).toContain('0.0.9');
});

test('a tauri.conf.json version that differs is a problem', () => {
  const problems = releaseProblems({ ...input('v0.1.0'), tauriConf: files('0.0.9').tauriConf });
  expect(problems.join('\n')).toContain('tauri.conf.json');
  expect(problems.join('\n')).toContain('0.0.9');
});

test('an empty updater key is a problem', () => {
  const conf = { version: '0.1.0', plugins: { updater: { pubkey: '  ' } } };
  const problems = releaseProblems({ ...input('v0.1.0'), tauriConf: JSON.stringify(conf) });
  expect(problems).toEqual([
    'plugins.updater.pubkey in src-tauri/tauri.conf.json is empty: the release could not be updated',
  ]);
});

test('a missing CHANGELOG section is a problem', () => {
  const problems = releaseProblems({
    ...input('v0.1.0'),
    changelog: '## [Unreleased]\n\n- Next.\n',
  });
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain('CHANGELOG');
  expect(problems[0]).toContain('0.1.0');
});
