// Probe: how long YouTube takes to open in floawty against Chrome, fresh profiles, hidden.
// A live probe, so only on request: FLOAWTY_LIVE_PROBE=1 npm run measure -- open-compare.
// Results go to OPEN_COMPARE_OUT (JSON) and the console.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect, test, type Browser, type Page } from '@playwright/test';
import { freshProfile, startFloawty } from '../app';
import { startOnFreePort } from '../debug-port';

const URL = 'https://www.youtube.com/';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FLOAWTY_PORT = 9334;
const CHROME_PORT = 9335;
const REPEATS = 3;
const FLOAWTY_ARGS = [
  '--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection',
  '--disable-background-networking',
  '--mute-audio',
  `--remote-debugging-port=${FLOAWTY_PORT}`,
];

interface Timing {
  case: string;
  repeat: number;
  navStartMs: number;
  fcpMs: number | null;
  lcpMs: number | null;
  domReadyMs: number;
  loadMs: number;
  visibility: string;
  host: string;
}

const results: Timing[] = [];

async function connect(port: number): Promise<Browser> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      return await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    } catch {
      await delay(250);
    }
  }
  throw new Error(`debug port ${port} did not open`);
}

function allPages(browser: Browser): Page[] {
  return browser.contexts().flatMap((context) => context.pages());
}

async function youtubePage(browser: Browser, except: Page[] = []): Promise<Page> {
  let found: Page | undefined;
  await expect
    .poll(
      () => {
        found = allPages(browser).find(
          (page) => page.url().includes('youtube.com') && !except.includes(page),
        );
        return Boolean(found);
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  return found as Page;
}

// Epoch times from the page's own clock, taken after load plus a settle for late paints.
async function timingsOf(page: Page, startEpoch: number, label: string, repeat: number) {
  await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 30_000 });
  await delay(2500);
  const raw = await page.evaluate(
    () =>
      new Promise<{
        origin: number;
        fcp: number | null;
        lcp: number | null;
        domReady: number;
        load: number;
        visibility: string;
        host: string;
      }>((resolve) => {
        let lcp: number | null = null;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) lcp = entry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => {
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const fcp = performance.getEntriesByName('first-contentful-paint')[0];
          resolve({
            origin: performance.timeOrigin,
            fcp: fcp ? fcp.startTime : null,
            lcp,
            domReady: nav.domContentLoadedEventEnd,
            load: nav.loadEventEnd,
            visibility: document.visibilityState,
            host: location.host,
          });
        }, 200);
      }),
  );
  const since = (ms: number | null) =>
    ms === null ? null : Math.round(raw.origin + ms - startEpoch);
  const timing: Timing = {
    case: label,
    repeat,
    navStartMs: Math.round(raw.origin - startEpoch),
    fcpMs: since(raw.fcp),
    lcpMs: since(raw.lcp),
    domReadyMs: since(raw.domReady) ?? 0,
    loadMs: since(raw.load) ?? 0,
    visibility: raw.visibility,
    host: raw.host,
  };
  results.push(timing);
  console.log(JSON.stringify(timing));
}

async function floawtyRun(repeat: number, gpu: boolean): Promise<void> {
  const profile = freshProfile();
  mkdirSync(profile.dataDir, { recursive: true });
  const settings = { noticeAccepted: true, graphicsAcceleration: gpu };
  writeFileSync(path.join(profile.dataDir, 'settings.json'), JSON.stringify(settings));
  const args = gpu ? FLOAWTY_ARGS : [...FLOAWTY_ARGS, '--disable-gpu'];
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    FLOAWTY_DATA_DIR: profile.dataDir,
    WEBVIEW2_USER_DATA_FOLDER: profile.webviewDir,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: args.join(' '),
  };
  const app = await startOnFreePort(FLOAWTY_PORT, () => startFloawty(env));
  const browser = await connect(FLOAWTY_PORT);
  try {
    let home: Page | undefined;
    await expect
      .poll(() => {
        home = allPages(browser).find((page) => /tauri\.localhost\/$/.test(page.url()));
        return Boolean(home);
      })
      .toBe(true);
    const tile = (home as Page).getByRole('button', { name: 'YouTube', exact: true });
    await tile.waitFor();
    await delay(3000);
    const label = gpu ? 'floawty' : 'floawty, GPU off';
    for (const visit of ['cold', 'warm']) {
      const handle = await tile.elementHandle();
      const start = Date.now();
      await handle?.evaluate((button: HTMLElement) => button.click());
      const page = await youtubePage(browser);
      await timingsOf(page, start, `${label} tile ${visit}`, repeat);
      await (home as Page).evaluate(() => window.__TAURI_INTERNALS__.invoke('close_service'));
      await delay(3000);
    }
  } finally {
    await browser.close();
    await app.stop();
  }
}

async function chromeRun(repeat: number, way: 'new tab' | 'same tab'): Promise<void> {
  const dir = mkdtempSync(path.join(tmpdir(), 'floawty-chrome-'));
  const chrome = spawn(CHROME, [
    `--user-data-dir=${dir}`,
    `--remote-debugging-port=${CHROME_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    '--window-size=1280,720',
    // The hidden desktop must not count as an occluded window.
    '--disable-features=CalculateNativeWinOcclusion',
    '--disable-backgrounding-occluded-windows',
    'about:blank',
  ]);
  const browser = await connect(CHROME_PORT);
  try {
    await delay(3000);
    const blank = allPages(browser)[0] as Page;
    const cdp = await browser.newBrowserCDPSession();
    for (const visit of ['cold', 'warm']) {
      const before = allPages(browser);
      const start = Date.now();
      if (way === 'new tab') {
        await cdp.send('Target.createTarget', { url: URL });
        const page = await youtubePage(browser, before);
        await timingsOf(page, start, `Chrome new tab ${visit}`, repeat);
        await page.close();
      } else {
        await blank.evaluate((url) => (location.href = url), URL);
        await timingsOf(blank, start, `Chrome same tab ${visit}`, repeat);
        await blank.goto('about:blank');
      }
      await delay(3000);
    }
  } finally {
    await browser.close().catch(() => undefined);
    chrome.kill();
    await delay(1000);
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  }
}

test('YouTube opens in floawty and in Chrome', async () => {
  test.skip(process.env.FLOAWTY_LIVE_PROBE !== '1', 'live probe: asks the maintainer first');
  test.setTimeout(20 * 60_000);
  for (let repeat = 1; repeat <= REPEATS; repeat += 1) {
    await floawtyRun(repeat, true);
    await floawtyRun(repeat, false);
    await chromeRun(repeat, 'new tab');
    await chromeRun(repeat, 'same tab');
  }
  const out = process.env.OPEN_COMPARE_OUT ?? path.join(tmpdir(), 'open-compare.json');
  writeFileSync(out, JSON.stringify(results, null, 2));
});
