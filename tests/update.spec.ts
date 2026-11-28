// Updates by click against a local server, on the update-test build (tests/update-server.ts).
// The hidden launcher's shim swallows the call that would start the setup or the browser, so
// these tests run hidden only; the real install from one release to the next is rel-07's rc run.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { UPDATE_TEST } from '../scripts/update-test.mjs';
import type { RunningApp } from './app';
import {
  alive,
  hiddenOnly,
  newTemp,
  PAYLOAD,
  QUIET_MS,
  savedSetups,
  serve,
  startUpdateTest,
  status,
  VERSION,
} from './update-server';

const start = (exe: string, temp = newTemp(), allowedOpens = 0): Promise<RunningApp> =>
  startUpdateTest({ exe, temp, allowedOpens });

test.describe('updates by click', () => {
  test.skip(Boolean(hiddenOnly()), hiddenOnly() || '');

  test('nothing asks for updates before the click; a found update installs and floawty ends', async () => {
    const server = await serve('update');
    const temp = newTemp();
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
      // The saved setup, passive, as an update, and floawty restarts afterwards.
      expect(await app.lastShell()).toMatch(/installer\.exe \/P \/UPDATE \/R( |$)/);
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
      const temp = newTemp();
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
    const app = await start(UPDATE_TEST.installed, newTemp());
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
    const app = await start(UPDATE_TEST.installed, newTemp());
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
    const app = await start(UPDATE_TEST.installed, newTemp());
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
    const app = await start(UPDATE_TEST.portable, newTemp(), 1);
    try {
      await app.home.locator('#update-check-now').click();
      await expect(status(app)).toHaveText(`${UPDATE_TEST.version} is available.`);
      await expect(app.home.locator('#update-install')).toBeHidden();
      await app.home.locator('#update-release-page').click();
      await expect.poll(async () => (await app.counts())?.shellExecute).toBe(1);
      expect(await app.lastShell()).toBe('https://github.com/jduerrmann/floawty/releases/latest');
      expect(alive(app.pid)).toBe(true);
    } finally {
      await app.stop();
      await server.close();
    }
  });
});
