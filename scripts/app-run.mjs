// Runs the app tests (or the measurements) through the test-input launcher, which holds the
// machine-wide run lock: `node scripts/app-run.mjs hidden|real|visible|measure [playwright args]`.
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { planRun } from './app-run-plan.mjs';
import { UPDATE_TEST } from './update-test.mjs';

const root = path.resolve(import.meta.dirname, '..');
const toolDir = path.join(root, 'tools', 'test-input', 'target', 'release');
const launcher = path.join(toolDir, 'test-input.exe');
const build = path.join(root, 'src-tauri', 'target', 'release', 'floawty.exe');
const exe = process.env.FLOAWTY_TEST_EXE ?? build;
const updateTest = path.join(root, UPDATE_TEST.dir, UPDATE_TEST.installed);
const playwright = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');

const [mode = '', ...extra] = process.argv.slice(2);
const plan = planRun(mode, extra);
if ('refused' in plan) {
  process.stderr.write(`${mode || 'app-run'} does not take ${plan.refused.join(', ')}\n`);
  process.exit(2);
}

const needed = [
  [launcher, 'npm run build:test-input'],
  [path.join(toolDir, 'floawty_test_shim.dll'), 'npm run build:test-input'],
  [exe, 'npm run build'],
];
// Only a hidden run reaches tests/update.spec.ts.
if (mode === 'hidden') needed.push([updateTest, 'npm run build:update-test']);
const missing = needed.filter(([file]) => !existsSync(file));
for (const [file, step] of missing) {
  process.stderr.write(`missing ${file}: run "${step}" first\n`);
}
if (missing.length > 0) process.exit(1);
// Otherwise the update tests would pass on the code of an older build.
const stale = () => existsSync(build) && statSync(updateTest).mtimeMs < statSync(build).mtimeMs;
if (mode === 'hidden' && stale()) {
  process.stderr.write(
    'the update-test build is older than the build: run "npm run build:update-test"\n',
  );
  process.exit(1);
}

const env = { ...process.env, PLAYWRIGHT_HTML_OPEN: 'never' };
if (plan.hiddenDesktop) env.FLOAWTY_TEST_HIDDEN = '1';
else delete env.FLOAWTY_TEST_HIDDEN;

process.stdout.write(`${plan.banner}\n`);
const result = spawnSync(
  launcher,
  [
    'run',
    ...(plan.hiddenDesktop ? [] : ['--visible']),
    '--timeout-s',
    String(plan.timeoutS),
    '--',
    process.execPath,
    playwright,
    ...plan.playwrightArgs,
  ],
  { cwd: root, stdio: 'inherit', env },
);
if (result.error) process.stderr.write(`could not start ${launcher}: ${result.error.message}\n`);
process.exit(result.status ?? 1);
