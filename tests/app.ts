// Starts the release build with its own empty data folders and connects over CDP.
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium, expect, type Browser, type Page } from '@playwright/test';

const EXE = path.join(import.meta.dirname, '..', 'src-tauri', 'target', 'release', 'floawty.exe');
const CDP_PORT = 9334;
// The environment variable replaces the app's own WebView2 arguments, so repeat them.
const BROWSER_ARGS = [
  '--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection',
  '--disable-background-networking',
  `--remote-debugging-port=${CDP_PORT}`,
].join(' ');

export interface Profile {
  dataDir: string;
  webviewDir: string;
}

export interface RunningApp {
  browser: Browser;
  home: Page;
  bar: Page;
  pid: number;
  pages: () => Page[];
  stop: () => Promise<void>;
}

export function freshProfile(): Profile {
  const root = mkdtempSync(path.join(tmpdir(), 'floawty-test-'));
  return { dataDir: path.join(root, 'data'), webviewDir: path.join(root, 'webview') };
}

async function connect(): Promise<Browser> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      return await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('WebView2 debug port did not open');
}

function exited(app: ChildProcess): Promise<void> {
  return new Promise((resolve) =>
    app.exitCode !== null ? resolve() : app.once('exit', () => resolve()),
  );
}

export async function launch(profile: Profile): Promise<RunningApp> {
  const app = spawn(EXE, [], {
    env: {
      ...process.env,
      FLOAWTY_DATA_DIR: profile.dataDir,
      WEBVIEW2_USER_DATA_FOLDER: profile.webviewDir,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: BROWSER_ARGS,
    },
  });
  const browser = await connect();
  const pages = () => browser.contexts().flatMap((context) => context.pages());
  const find = (file: string) =>
    pages().find(
      (page) => new URL(page.url()).pathname === file && page.url().includes('tauri.localhost'),
    );
  await expect.poll(() => Boolean(find('/') && find('/bar.html'))).toBe(true);
  const stop = async () => {
    await browser.close();
    app.kill();
    await exited(app);
  };
  const [home, bar] = [find('/'), find('/bar.html')] as [Page, Page];
  return { browser, home, bar, pid: app.pid ?? 0, pages, stop };
}
