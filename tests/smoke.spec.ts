// Smoke test: the release build starts and shows floawty's own page with its versions.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { chromium, expect, test, type Browser, type Page } from '@playwright/test';

const EXE = path.join(import.meta.dirname, '..', 'src-tauri', 'target', 'release', 'floawty.exe');
const CDP_PORT = 9334;
// The environment variable replaces the app's own WebView2 arguments, so repeat them.
const BROWSER_ARGS = [
  '--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection',
  '--disable-background-networking',
  `--remote-debugging-port=${CDP_PORT}`,
].join(' ');

async function connect(): Promise<Browser> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      return await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('WebView2 debug port did not open');
}

function appPage(browser: Browser): Page | undefined {
  const pages = browser.contexts().flatMap((context) => context.pages());
  return pages.find((page) => page.url().includes('tauri.localhost'));
}

test('the app starts and shows its versions', async () => {
  const app = spawn(EXE, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: BROWSER_ARGS },
  });
  try {
    const browser = await connect();
    await expect.poll(() => Boolean(appPage(browser))).toBe(true);
    const page = appPage(browser) as Page;
    await expect(page.locator('#about')).toHaveText(/^floawty \d+\.\d+\.\d+ · WebView2 \d+\./);
    await browser.close();
  } finally {
    app.kill();
  }
});
