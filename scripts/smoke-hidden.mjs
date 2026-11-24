// Runs the app tests that need no real input on a hidden desktop, through the test-input launcher.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const toolDir = path.join(root, 'tools', 'test-input', 'target', 'release');
const launcher = path.join(toolDir, 'test-input.exe');
const exe =
  process.env.FLOAWTY_TEST_EXE ?? path.join(root, 'src-tauri', 'target', 'release', 'floawty.exe');
const playwright = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');

const needed = [
  [launcher, 'npm run build:test-input'],
  [path.join(toolDir, 'floawty_test_shim.dll'), 'npm run build:test-input'],
  [exe, 'npm run build'],
];
const missing = needed.filter(([file]) => !existsSync(file));
for (const [file, step] of missing) {
  process.stderr.write(`missing ${file}: run "${step}" first\n`);
}
if (missing.length > 0) process.exit(1);

// These would open a window or a browser on the real desktop, or bring the @real tests back.
const refused = /^--(ui|debug|headed|reporter|grep-invert|project)\b/;
const extra = process.argv.slice(2);
const bad = extra.filter((arg) => refused.test(arg));
if (bad.length > 0) {
  process.stderr.write(`smoke:hidden does not take ${bad.join(', ')}\n`);
  process.exit(2);
}

process.stdout.write('hidden run: nothing appears on your screen\n');
const result = spawnSync(
  launcher,
  [
    'run',
    '--timeout-s',
    '1800',
    '--',
    process.execPath,
    playwright,
    'test',
    '--project=app',
    '--grep-invert',
    '@real',
    ...extra,
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, FLOAWTY_TEST_HIDDEN: '1', PLAYWRIGHT_HTML_OPEN: 'never' },
  },
);
if (result.error) process.stderr.write(`could not start ${launcher}: ${result.error.message}\n`);
process.exit(result.status ?? 1);
