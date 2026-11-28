// "Use graphics acceleration": WebView2 gets its arguments from floawty, so this starts the
// app without the test's argument override and reads them from the WebView2 processes.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { freshProfile, startFloawty, type Floawty, type Profile } from './app';

function browserCommandLines(profile: Profile): string[] {
  const query =
    'Get-CimInstance Win32_Process -Filter "Name=\'msedgewebview2.exe\'" | ForEach-Object { $_.CommandLine }';
  const output = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', query]);
  return output
    .toString()
    .split(/\r?\n/)
    .filter((line) => line.includes(profile.webviewDir) && !line.includes('--type='));
}

function writeSettings(profile: Profile, graphicsAcceleration: boolean, url: string): void {
  mkdirSync(profile.dataDir, { recursive: true });
  const lastService = { id: 'local', url, allowedDomains: ['127.0.0.1'] };
  const settings = { version: 1, noticeAccepted: true, lastService, graphicsAcceleration };
  writeFileSync(path.join(profile.dataDir, 'settings.json'), JSON.stringify(settings));
}

function start(profile: Profile): Promise<Floawty> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    FLOAWTY_DATA_DIR: profile.dataDir,
    WEBVIEW2_USER_DATA_FOLDER: profile.webviewDir,
  };
  delete env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS;
  return startFloawty(env);
}

function logOf(profile: Profile): string {
  const file = path.join(profile.dataDir, 'logs', 'floawty.log');
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

/** A local page for the reopened service; its first request shows the service webview exists. */
async function servePage(): Promise<{ url: string; requests: () => number; server: Server }> {
  let count = 0;
  const server = createServer((_request, response) => {
    count += 1;
    response.end('<!doctype html><title>local</title>');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}/`, requests: () => count, server };
}

for (const on of [true, false]) {
  test(`with graphics acceleration ${on ? 'on' : 'off'} all webviews share its arguments`, async () => {
    const profile = freshProfile();
    const page = await servePage();
    writeSettings(profile, on, page.url);
    const app = await start(profile);
    try {
      // The bar comes before the service, and both need the main window's arguments.
      await expect.poll(page.requests, { timeout: 15_000 }).toBeGreaterThan(0);
      const [browser, ...others] = browserCommandLines(profile);
      expect(others).toEqual([]);
      expect(browser).toContain('--disable-background-networking');
      expect(browser?.includes('--disable-gpu')).toBe(!on);
      expect(logOf(profile)).not.toContain('could not');
      expect(logOf(profile).includes('graphics acceleration is off')).toBe(!on);
    } finally {
      await app.stop();
      page.server.close();
    }
  });
}
