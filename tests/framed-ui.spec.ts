// A service page must not reach floawty's commands through a frame with floawty's own origin.
import { expect, test, type Frame, type Page } from '@playwright/test';
import { freshProfile, launch, type RunningApp } from './app';

async function openFramingPage(app: RunningApp, src: string): Promise<Page> {
  await app.home.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke('open_service', {
      service: { id: 'example', url: 'https://example.com/', allowedDomains: ['example.com'] },
    }),
  );
  let found: Page | undefined;
  await expect
    .poll(() => (found = app.pages().find((page) => page.url().startsWith('https://example.com'))))
    .toBeTruthy();
  const page = found as Page;
  await page.route('https://example.com/**', (route) =>
    route.fulfill({
      body: `<title>framing</title><iframe src="${src}"></iframe>`,
      contentType: 'text/html',
    }),
  );
  await page.reload();
  return page;
}

async function childFrame(page: Page): Promise<Frame> {
  let frame: Frame | undefined;
  await expect
    .poll(() => (frame = page.frames().find((candidate) => candidate !== page.mainFrame())))
    .toBeTruthy();
  await (frame as Frame).waitForLoadState();
  return frame as Frame;
}

const noticeAccepted = (app: RunningApp) =>
  app.home.evaluate(() =>
    window.__TAURI_INTERNALS__
      .invoke('tiles_state')
      .then((state) => (state as { noticeAccepted: boolean }).noticeAccepted),
  );

test('floawty’s own pages forbid being framed', async () => {
  const app = await launch(freshProfile());
  try {
    for (const file of ['/', '/bar.html', '/no-such-page']) {
      const csp = await app.home.evaluate(
        (url) => fetch(url).then((response) => response.headers.get('content-security-policy')),
        file,
      );
      expect(csp, file).toContain("frame-ancestors 'none'");
    }
  } finally {
    await app.stop();
  }
});

test('a service page framing floawty gets no floawty page, and its commands do nothing', async () => {
  const app = await launch(freshProfile());
  try {
    const page = await openFramingPage(app, 'http://tauri.localhost/');
    const frame = await childFrame(page);
    await frame
      .evaluate(() => void window.__TAURI_INTERNALS__.invoke('accept_notice'))
      .catch(() => undefined);
    // A command that ran would answer in milliseconds; its effect is read from floawty's home page.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(await noticeAccepted(app)).toBe(false);
    await expect(frame.locator('#tiles')).toHaveCount(0);
  } finally {
    await app.stop();
  }
});
