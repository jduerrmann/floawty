// Live probe: memory and CPU on the tiles with one and three services kept awake, hidden.
// Only on request: FLOAWTY_LIVE_PROBE=1 npm run measure -- keep-awake.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, test } from '@playwright/test';
import { tiktok } from '../../src/services/tiktok/manifest';
import { twitch } from '../../src/services/twitch/manifest';
import type { ServiceManifest } from '../../src/services/manifest';
import { youtube } from '../../src/services/youtube/manifest';
import { freshProfile, launch, type RunningApp } from '../app';

const ROOT = path.join(import.meta.dirname, '..', '..');
const MEASURE = path.join(ROOT, 'spikes', 'measure', 'measure.ps1');
const RESULTS = path.join(ROOT, 'spikes', 'measure', 'results');
const SETTLE_MS = 25_000;
const LOADED_MS = 15_000;

function measure(scenario: string, pid: number): { ramMB: number; cpu: number } {
  const args = ['-App', 'floawty', '-Scenario', scenario, '-ProcessId', String(pid)];
  execFileSync('pwsh', [
    '-NoProfile',
    '-NonInteractive',
    '-File',
    MEASURE,
    ...args,
    '-Seconds',
    '60',
  ]);
  const summary = readFileSync(path.join(RESULTS, `floawty-${scenario}-summary.csv`), 'utf8');
  const median = (metric: string) =>
    Number(new RegExp(`"${metric}","([\\d.]+)"`).exec(summary)?.[1] ?? NaN);
  const result = { ramMB: median('PrivateMB'), cpu: median('CpuPercent') };
  console.log(`${scenario}: RAM ${result.ramMB} MB, CPU ${result.cpu} % (medians)`);
  return result;
}

// Opens a service from its tile data, gives it time to load, and leaves it for the tiles.
async function visit(app: RunningApp, service: ServiceManifest): Promise<void> {
  const { id, startUrl: url, allowedDomains, signInHosts = [] } = service;
  await app.home.evaluate(
    (service) => window.__TAURI_INTERNALS__.invoke('open_service', { service }),
    { id, url, allowedDomains, signInHosts },
  );
  const host = new URL(url).hostname;
  await expect.poll(() => app.pages().some((page) => page.url().includes(host))).toBe(true);
  await delay(LOADED_MS);
  await app.home.evaluate(() => window.__TAURI_INTERNALS__.invoke('close_service'));
}

test('memory and CPU with one and three services kept awake', async () => {
  test.skip(process.env.FLOAWTY_LIVE_PROBE !== '1', 'live probe: asks the maintainer first');
  test.setTimeout(15 * 60_000);
  const profile = freshProfile();
  mkdirSync(profile.dataDir, { recursive: true });
  const settings = { noticeAccepted: true, keepAwake: 'three' };
  writeFileSync(path.join(profile.dataDir, 'settings.json'), JSON.stringify(settings));
  const app = await launch(profile);
  try {
    await visit(app, youtube);
    await delay(SETTLE_MS);
    measure('awake-1', app.pid);
    await visit(app, twitch);
    await visit(app, tiktok);
    await delay(SETTLE_MS);
    measure('awake-3', app.pid);
  } finally {
    await app.stop();
  }
});
