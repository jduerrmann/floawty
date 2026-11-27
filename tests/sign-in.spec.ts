// The sign-in window: a listed host's pop-up opens one small owned window; every other pop-up stays denied.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { freshProfile, launch, type RunningApp } from './app';
import { ownedPopups, windowFlags } from './desktop';

const PROVIDER = 'https://www.example.org/';
const SERVICE = {
  service: {
    id: 'example',
    url: 'https://example.com/',
    allowedDomains: ['example.com'],
    signInHosts: ['www.example.org'],
  },
};

interface Target {
  id: string;
  url: string;
  webSocketDebuggerUrl: string;
}

// Playwright does not list the sign-in window as a page; WebView2's debug port does.
async function targets(): Promise<Target[]> {
  return (await (await fetch('http://127.0.0.1:9334/json/list')).json()) as Target[];
}

async function signInTarget(): Promise<Target | undefined> {
  return (await targets()).find((target) => target.url.startsWith(PROVIDER));
}

async function evaluateIn(target: Target, expression: string): Promise<unknown> {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  const answer = new Promise<{ result?: { result?: { value?: unknown } } }>((resolve) => {
    socket.onmessage = (message) => resolve(JSON.parse(String(message.data)));
  });
  socket.send(
    JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression, returnByValue: true, awaitPromise: true },
    }),
  );
  const reply = await answer;
  socket.close();
  return reply.result?.result?.value;
}

// A page-wide button, so a click at any point of the window opens the pop-up.
async function openService(app: RunningApp, opens: string[]): Promise<Page> {
  await app.home.evaluate(
    (args) => window.__TAURI_INTERNALS__.invoke('open_service', args),
    SERVICE,
  );
  let service: Page | undefined;
  await expect
    .poll(
      () => (service = app.pages().find((page) => page.url().startsWith('https://example.com'))),
    )
    .toBeTruthy();
  const page = service as Page;
  await page.setContent(
    `<button id="go" style="position: fixed; inset: 0; width: 100%; height: 100%">Sign in</button>`,
  );
  // Each attempt is counted, so a click that never reached the page cannot pass a test.
  await page.evaluate((urls) => {
    const state = window as unknown as { __tried: number };
    state.__tried = 0;
    // One task per attempt: a click handler does not get past its first window.open.
    document.querySelector('#go')?.addEventListener('click', () => {
      urls.forEach((url, index) =>
        setTimeout(() => {
          state.__tried += 1;
          window.open(url);
        }, index * 500),
      );
    });
  }, opens);
  return page;
}

const tried = (page: Page) =>
  page.evaluate(() => (window as unknown as { __tried: number }).__tried);

const titled = (app: RunningApp, host: string) => () => {
  try {
    return windowFlags(app.pid, `floawty – ${host}`).visible;
  } catch {
    return false;
  }
};

// Only whether a call is allowed; what a command would return is never read.
const TRY_COMMANDS = `Promise.all(['tiles_state', 'open_release_page', 'plugin:app|version', 'plugin:updater|check'].map((command) =>
  window.__TAURI_INTERNALS__.invoke(command).then(() => 'allowed', () => 'refused')))`;

test('a listed sign-in pop-up opens one owned window, without floawty commands', async () => {
  const app = await launch(freshProfile());
  try {
    const page = await openService(app, [PROVIDER, PROVIDER]);
    await app.click(0.5, 0.6);
    await expect.poll(() => ownedPopups(app.pid), { timeout: 10_000 }).toBe(1);
    // A second request while the window is open gets no second window.
    await expect.poll(() => tried(page)).toBe(2);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(ownedPopups(app.pid)).toBe(1);
    await expect.poll(titled(app, 'www.example.org')).toBe(true);
    await expect.poll(signInTarget).toBeTruthy();
    const target = (await signInTarget()) as Target;
    expect(await evaluateIn(target, TRY_COMMANDS)).toEqual([
      'refused',
      'refused',
      'refused',
      'refused',
    ]);
    // The provider closes its page after the sign-in; the window must go with it.
    await evaluateIn(target, 'window.close()');
    await expect.poll(() => ownedPopups(app.pid), { timeout: 5000 }).toBe(0);
  } finally {
    await app.stop();
  }
});

test('the window stays on its hosts, its title follows the page, a page elsewhere is logged by host', async () => {
  const profile = freshProfile();
  const app = await launch(profile);
  try {
    await openService(app, [PROVIDER]);
    await app.click(0.5, 0.6);
    await expect.poll(signInTarget, { timeout: 10_000 }).toBeTruthy();
    const target = (await signInTarget()) as Target;
    await evaluateIn(target, "location.href = 'https://www.iana.org/domains/example'");
    await new Promise((resolve) => setTimeout(resolve, 2500));
    expect((await targets()).some((t) => t.url.includes('iana.org'))).toBe(false);
    const log = readFileSync(path.join(profile.dataDir, 'logs', 'floawty.log'), 'utf8');
    expect(log).toContain('sign-in window stayed off: www.iana.org');
    expect(log).not.toContain('domains/example');
    // The service's own domain is allowed; the title then names it.
    await evaluateIn(target, "location.href = 'https://example.com/'");
    await expect.poll(titled(app, 'example.com'), { timeout: 10_000 }).toBe(true);
  } finally {
    await app.stop();
  }
});

test('a pop-up of an unlisted host opens nothing', async () => {
  const app = await launch(freshProfile());
  try {
    const page = await openService(app, ['https://www.iana.org/']);
    await app.click(0.5, 0.6);
    await expect.poll(() => tried(page)).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    expect(ownedPopups(app.pid)).toBe(0);
    expect((await targets()).some((target) => target.url.includes('iana.org'))).toBe(false);
  } finally {
    await app.stop();
  }
});

test('a sign-in pop-up while floawty is in the background opens nothing', async () => {
  // A visible run starts a WinForms window and calls PowerShell several times.
  test.slow();
  const app = await launch(freshProfile());
  try {
    const page = await openService(app, [PROVIDER]);
    await app.foreground('other');
    await page.evaluate((url) => void window.open(url), PROVIDER);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    expect(ownedPopups(app.pid)).toBe(0);
  } finally {
    await app.stop();
  }
});

test('closing the service or hiding floawty closes its sign-in window', async () => {
  const app = await launch(freshProfile());
  try {
    await openService(app, [PROVIDER]);
    await app.click(0.5, 0.6);
    await expect.poll(() => ownedPopups(app.pid), { timeout: 10_000 }).toBe(1);
    await app.home.evaluate(() => window.__TAURI_INTERNALS__.invoke('close_service'));
    await expect.poll(() => ownedPopups(app.pid), { timeout: 5000 }).toBe(0);
    await openService(app, [PROVIDER]);
    await app.click(0.5, 0.6);
    await expect.poll(() => ownedPopups(app.pid), { timeout: 10_000 }).toBe(1);
    await app.hotkey('Ctrl+Alt+Shift+O');
    await expect.poll(() => windowFlags(app.pid).visible).toBe(false);
    expect(ownedPopups(app.pid)).toBe(0);
  } finally {
    await app.stop();
  }
});
