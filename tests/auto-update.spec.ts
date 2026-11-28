// "Update automatically" against a local server, on the update-test build (tests/update-server.ts).
// Hidden only: the shim swallows the setup start and records its arguments.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { UPDATE_TEST } from '../scripts/update-test.mjs';
import {
  alive,
  hiddenOnly,
  newTemp,
  openSettings,
  PAYLOAD,
  QUIET_MS,
  savedSetups,
  serve,
  startUpdateTest,
  status,
} from './update-server';
import { closeWindow } from './desktop';

const ON_QUIT = `${UPDATE_TEST.version} installs when you quit floawty.`;

test.describe('updates automatically', () => {
  test.skip(Boolean(hiddenOnly()), hiddenOnly() || '');

  test('switched off, floawty asks for nothing on its own', async () => {
    const server = await serve('update');
    const app = await startUpdateTest({ exe: UPDATE_TEST.installed, updateCheck: false });
    try {
      await app.home.waitForTimeout(QUIET_MS);
      expect(server.requests()).toBe(0);
    } finally {
      await app.stop();
      await server.close();
    }
  });

  test('switched on, a found update downloads at start and installs on quit, without a restart', async () => {
    const server = await serve('update');
    const temp = newTemp();
    const app = await startUpdateTest({
      exe: UPDATE_TEST.installed,
      temp,
      updateCheck: true,
      allowedOpens: 1,
    });
    try {
      await expect(status(app)).toHaveText(ON_QUIT, { timeout: 15_000 });
      // One manifest and one download.
      expect(server.requests()).toBe(2);
      expect(savedSetups(temp)).toHaveLength(0);
      await app.bar.locator('#quit').click();
      await expect.poll(() => alive(app.pid), { timeout: 30_000 }).toBe(false);
      expect((await app.counts())?.shellExecute).toBe(1);
      const call = (await app.lastShell()) ?? '';
      expect(call).toMatch(/installer\.exe \/P \/UPDATE( |$)/);
      expect(call).not.toMatch(/\/R( |$)/);
      const saved = savedSetups(temp);
      expect(saved).toHaveLength(1);
      expect(readFileSync(saved[0] as string).equals(readFileSync(PAYLOAD))).toBe(true);
    } finally {
      await app.stop();
      await server.close();
    }
  });

  test("floawty's own restart for reset does not install the waiting update", async () => {
    const server = await serve('update');
    const temp = newTemp();
    const app = await startUpdateTest({ exe: UPDATE_TEST.installed, temp, updateCheck: true });
    try {
      await expect(status(app)).toHaveText(ON_QUIT, { timeout: 15_000 });
      await app.home.locator('#reset').click();
      await app.home.locator('#reset-yes').click();
      await expect.poll(() => app.children(), { timeout: 15_000 }).toHaveLength(1);
      expect((await app.counts())?.shellExecute).toBe(0);
      expect(savedSetups(temp)).toHaveLength(0);
    } finally {
      await app.stop();
      await server.close();
    }
  });

  test('closing the window is a quit too and installs the waiting update', async () => {
    const server = await serve('update');
    const temp = newTemp();
    const app = await startUpdateTest({
      exe: UPDATE_TEST.installed,
      temp,
      updateCheck: true,
      allowedOpens: 1,
    });
    try {
      await expect(status(app)).toHaveText(ON_QUIT, { timeout: 15_000 });
      closeWindow(app.pid);
      await expect.poll(() => alive(app.pid), { timeout: 30_000 }).toBe(false);
      expect((await app.counts())?.shellExecute).toBe(1);
      expect(savedSetups(temp)).toHaveLength(1);
    } finally {
      await app.stop();
      await server.close();
    }
  });

  test('switched off again, the downloaded update does not install on quit', async () => {
    const server = await serve('update');
    const temp = newTemp();
    const app = await startUpdateTest({ exe: UPDATE_TEST.installed, temp, updateCheck: true });
    try {
      await expect(status(app)).toHaveText(ON_QUIT, { timeout: 15_000 });
      await app.home.locator('#update-check').click();
      await expect(status(app)).not.toHaveText(ON_QUIT);
      await app.bar.locator('#quit').click();
      await expect.poll(() => alive(app.pid), { timeout: 30_000 }).toBe(false);
      expect((await app.counts())?.shellExecute).toBe(0);
      expect(savedSetups(temp)).toHaveLength(0);
    } finally {
      await app.stop();
      await server.close();
    }
  });

  test('turning the switch on checks at once', async () => {
    const server = await serve('update');
    const app = await startUpdateTest({ exe: UPDATE_TEST.installed, updateCheck: false });
    try {
      await app.home.locator('#update-check').click();
      await expect(status(app)).toHaveText(ON_QUIT, { timeout: 15_000 });
      expect(server.requests()).toBe(2);
    } finally {
      await app.stop();
      await server.close();
    }
  });

  test('the portable build marks the settings button and offers the release page', async () => {
    const server = await serve('update');
    const app = await startUpdateTest({
      exe: UPDATE_TEST.portable,
      updateCheck: true,
      settings: false,
    });
    try {
      await expect(app.bar.locator('#settings')).toHaveClass(/update-found/, { timeout: 15_000 });
      // Nothing to install, so nothing is downloaded.
      expect(server.requests()).toBe(1);
      await openSettings(app);
      await expect(status(app)).toHaveText(`${UPDATE_TEST.version} is available.`);
      await expect(app.home.locator('#update-release-page')).toBeVisible();
      await expect(app.home.locator('#update-install')).toBeHidden();
    } finally {
      await app.stop();
      await server.close();
    }
  });
});
