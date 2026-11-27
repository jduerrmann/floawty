// Updates by click against a local server, on the update-test build (`npm run build:update-test`).
// The hidden launcher's shim swallows the call that would start the setup or the browser, so
// these tests run hidden only; the real install from one release to the next is rel-07's rc run.
// FLOAWTY_TEST_EXE does not reach them: they always start the current update-test build.
import { readdirSync, readFileSync, mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { latestJson } from '../scripts/latest-json.mjs';
import { UPDATE_TEST } from '../scripts/update-test.mjs';
import { freshProfile, launch, type Profile, type RunningApp } from './app';

const VERSION = (
  JSON.parse(readFileSync(path.join(import.meta.dirname, '..', 'package.json'), 'utf8')) as {
    version: string;
  }
).version;
const DIR = path.join(import.meta.dirname, '..', UPDATE_TEST.dir);
const PAYLOAD = path.join(DIR, UPDATE_TEST.payload);
const BASE = `http://127.0.0.1:${UPDATE_TEST.port}`;
// Long enough for a retry or a request at start to show; nothing waits on it otherwise.
const QUIET_MS = 2000;

type Answer = 'update' | 'other-signature' | 'other-version' | 'unavailable' | 'drop';

const SIGNATURES: Record<string, string> = {
  update: `${PAYLOAD}.sig`,
  'other-signature': path.join(DIR, 'other.exe.sig'),
  'other-version': path.join(DIR, 'other-version.exe.sig'),
};

interface UpdateServer {
  requests: () => number;
  close: () => Promise<void>;
}

function manifest(signatureFile: string): string {
  const signature = readFileSync(signatureFile, 'utf8');
  const url = `${BASE}/${UPDATE_TEST.payload}`;
  const json = latestJson({
    version: UPDATE_TEST.version,
    notes: '',
    pubDate: new Date(),
    signature,
    url,
  });
  return JSON.stringify(json);
}

async function serve(answer: Answer): Promise<UpdateServer> {
  let requests = 0;
  const server: Server = createServer((request, response) => {
    requests += 1;
    if (answer === 'drop') return void request.socket.destroy();
    if (answer === 'unavailable') return void response.writeHead(503).end();
    if (request.url === `/${UPDATE_TEST.payload}`) {
      return void response.writeHead(200).end(readFileSync(PAYLOAD));
    }
    const signature = SIGNATURES[answer] as string;
    response.writeHead(200, { 'content-type': 'application/json' }).end(manifest(signature));
  });
  // A busy port fails here, not as a timeout later.
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(UPDATE_TEST.port, '127.0.0.1', resolve);
  });
  return {
    requests: () => requests,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

function englishProfile(): Profile {
  const profile = freshProfile();
  mkdirSync(profile.dataDir, { recursive: true });
  const settings = { noticeAccepted: true, language: 'en' };
  writeFileSync(path.join(profile.dataDir, 'settings.json'), JSON.stringify(settings));
  return profile;
}

async function start(exe: string, temp: string, allowedOpens = 0): Promise<RunningApp> {
  const env = { TEMP: temp, TMP: temp };
  const app = await launch(englishProfile(), { exe: path.join(DIR, exe), env, allowedOpens });
  await app.bar.locator('#settings').click();
  await expect(app.home.locator('#settings-panel')).toBeVisible();
  return app;
}

const status = (app: RunningApp) => app.home.locator('#update-status');

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Every file below `dir` whose name ends with `installer.exe`, where the updater saves the setup. */
function savedSetups(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('installer.exe'))
    .map((name) => path.join(dir, name));
}

test.describe('updates by click', () => {
  test.skip(
    process.env.FLOAWTY_TEST_HIDDEN !== '1',
    'needs the hidden launcher, which swallows the setup start and the browser',
  );

  test('nothing asks for updates before the click; a found update installs and floawty ends', async () => {
    const server = await serve('update');
    const temp = mkdtempSync(path.join(tmpdir(), 'floawty-update-'));
    const app = await start(UPDATE_TEST.installed, temp, 1);
    try {
      await expect(app.home.locator('#update-version')).toHaveText(`Version ${VERSION}`);
      await app.home.waitForTimeout(QUIET_MS);
      expect(server.requests()).toBe(0);
      await app.home.locator('#update-check-now').click();
      await expect(status(app)).toHaveText(`${UPDATE_TEST.version} is available.`);
      await expect(app.home.locator('#update-release-page')).toBeHidden();
      await app.home.locator('#update-install').click();
      await expect.poll(() => alive(app.pid), { timeout: 30_000 }).toBe(false);
      expect((await app.counts())?.shellExecute).toBe(1);
      const saved = savedSetups(temp);
      expect(saved).toHaveLength(1);
      expect(readFileSync(saved[0] as string).equals(readFileSync(PAYLOAD))).toBe(true);
    } finally {
      await app.stop();
      await server.close();
    }
  });

  const REJECTED = [
    ['other-signature', 'signed over other bytes'],
    ['other-version', 'signed for another version than announced'],
  ] as const;
  for (const [answer, what] of REJECTED) {
    test(`an update ${what} is not installed and floawty keeps running`, async () => {
      const server = await serve(answer);
      const temp = mkdtempSync(path.join(tmpdir(), 'floawty-update-'));
      const app = await start(UPDATE_TEST.installed, temp);
      try {
        await app.home.locator('#update-check-now').click();
        await expect(status(app)).toHaveText(`${UPDATE_TEST.version} is available.`);
        await app.home.locator('#update-install').click();
        await expect(status(app)).toHaveText(
          'The update is not signed correctly and was not installed.',
        );
        expect(alive(app.pid)).toBe(true);
        expect((await app.counts())?.shellExecute).toBe(0);
        expect(savedSetups(temp)).toHaveLength(0);
      } finally {
        await app.stop();
        await server.close();
      }
    });
  }

  test('a dropped connection says GitHub cannot be reached and asks only once', async () => {
    const server = await serve('drop');
    const app = await start(UPDATE_TEST.installed, mkdtempSync(path.join(tmpdir(), 'floawty-')));
    try {
      await app.home.locator('#update-check-now').click();
      await expect(status(app)).toHaveText('GitHub cannot be reached. Try again later.');
      await app.home.waitForTimeout(QUIET_MS);
      expect(server.requests()).toBe(1);
      await expect(app.home.locator('#update-check-now')).toBeEnabled();
    } finally {
      await app.stop();
      await server.close();
    }
  });

  test('an answer without update information says so', async () => {
    const server = await serve('unavailable');
    const app = await start(UPDATE_TEST.installed, mkdtempSync(path.join(tmpdir(), 'floawty-')));
    try {
      await app.home.locator('#update-check-now').click();
      await expect(status(app)).toHaveText('GitHub has no update information right now.');
      expect(server.requests()).toBe(1);
    } finally {
      await app.stop();
      await server.close();
    }
  });

  test("floawty's own page cannot call the updater plugin directly", async () => {
    const server = await serve('update');
    const app = await start(UPDATE_TEST.installed, mkdtempSync(path.join(tmpdir(), 'floawty-')));
    try {
      const answer = await app.home.evaluate(() =>
        (
          window as unknown as { __TAURI_INTERNALS__: { invoke: (c: string) => Promise<unknown> } }
        ).__TAURI_INTERNALS__
          .invoke('plugin:updater|check')
          .then(
            () => 'allowed',
            () => 'refused',
          ),
      );
      expect(answer).toBe('refused');
      expect(server.requests()).toBe(0);
    } finally {
      await app.stop();
      await server.close();
    }
  });

  test('the portable build shows the new version and opens the release page instead', async () => {
    const server = await serve('update');
    const app = await start(UPDATE_TEST.portable, mkdtempSync(path.join(tmpdir(), 'floawty-')), 1);
    try {
      await app.home.locator('#update-check-now').click();
      await expect(status(app)).toHaveText(`${UPDATE_TEST.version} is available.`);
      await expect(app.home.locator('#update-install')).toBeHidden();
      await app.home.locator('#update-release-page').click();
      await expect.poll(async () => (await app.counts())?.shellExecute).toBe(1);
      expect(alive(app.pid)).toBe(true);
    } finally {
      await app.stop();
      await server.close();
    }
  });
});
