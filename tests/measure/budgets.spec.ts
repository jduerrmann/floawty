// Measures floawty against the budgets of engineering standards §7 with spikes/measure, hidden:
// every floawty starts through the test-input launcher (`npm run measure`).
// Start and idle run without the debug port; YouTube and hidden are set up over it, muted.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, test, type Page } from '@playwright/test';
import { youtube } from '../../src/services/youtube/manifest';
import { freshProfile, launch, startFloawty, type Profile, type RunningApp } from '../app';
import { EXE } from '../tested-exe';

const ROOT = path.join(import.meta.dirname, '..', '..');
const MEASURE = path.join(ROOT, 'spikes', 'measure', 'measure.ps1');
const RESULTS = path.join(ROOT, 'spikes', 'measure', 'results');
const APP = 'floawty';
const SETTLE_MS = 25_000;
const SECONDS = 60;
const START_RUNS = 5;
// Big Buck Bunny 60 fps 4K (Blender Foundation, CC BY 3.0), the spike's test video.
const TEST_VIDEO = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
const BUDGET = { downloadMiB: 10, startMs: 400, idleMB: 260, youtubeMB: 850, idleCpu: 0.1 };

interface YoutubePlayer {
  setPlaybackQualityRange: (min: string, max: string) => void;
  playVideo: () => void;
}

interface Playback {
  height: number;
  frames: number;
  dropped: number;
  paused: boolean;
  ad: boolean;
}

function pwsh(args: string[], env?: NodeJS.ProcessEnv): string {
  return execFileSync('pwsh', ['-NoProfile', '-NonInteractive', ...args], {
    env,
    encoding: 'utf8',
  });
}

// Fresh data folders with the first-start notice already accepted.
function acceptedProfile(settings: object = {}): Profile {
  const profile: Profile = freshProfile();
  mkdirSync(profile.dataDir, { recursive: true });
  const text = JSON.stringify({ noticeAccepted: true, ...settings });
  writeFileSync(path.join(profile.dataDir, 'settings.json'), text);
  return profile;
}

// A normal start without the debug port.
function plainStart(settings: object = {}): NodeJS.ProcessEnv {
  const profile = acceptedProfile(settings);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    FLOAWTY_DATA_DIR: profile.dataDir,
    WEBVIEW2_USER_DATA_FOLDER: profile.webviewDir,
  };
  delete env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS;
  return env;
}

/** Samples the process tree for SECONDS and returns the medians of the summary. */
function measure(scenario: string, pid: number): { ramMB: number; cpu: number } {
  const args = ['-App', APP, '-Scenario', scenario, '-ProcessId', String(pid)];
  pwsh(['-File', MEASURE, ...args, '-Seconds', String(SECONDS)]);
  const summary = readFileSync(path.join(RESULTS, `${APP}-${scenario}-summary.csv`), 'utf8');
  const median = (metric: string) =>
    Number(new RegExp(`"${metric}","([\\d.]+)"`).exec(summary)?.[1] ?? NaN);
  const result = { ramMB: median('PrivateMB'), cpu: median('CpuPercent') };
  console.log(`${scenario}: RAM ${result.ramMB} MB, CPU ${result.cpu} % (medians)`);
  return result;
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[values.length >> 1] ?? NaN;

function playback(page: Page): Promise<Playback> {
  return page.evaluate(() => {
    const player = document.getElementById('movie_player');
    const video = player?.querySelector('video');
    const quality = video?.getVideoPlaybackQuality();
    return {
      height: video?.videoHeight ?? 0,
      frames: quality?.totalVideoFrames ?? 0,
      dropped: quality?.droppedVideoFrames ?? 0,
      paused: video?.paused ?? true,
      ad: player?.classList.contains('ad-showing') ?? false,
    };
  });
}

async function openTestVideo(app: RunningApp): Promise<Page> {
  await app.bar.evaluate(
    (service) => window.__TAURI_INTERNALS__.invoke('open_service', { service }),
    { id: youtube.id, url: TEST_VIDEO, allowedDomains: youtube.allowedDomains },
  );
  let found: Page | undefined;
  await expect
    .poll(() => (found = app.pages().find((page) => page.url().includes('youtube.com'))))
    .toBeTruthy();
  const page = found as Page;
  // A fresh profile asks for cookie consent first; the measurement always rejects. The
  // buttons carry long aria-labels, so they are found by their visible text.
  const reject = page.locator('button', { hasText: /^\s*(Reject all|Alle ablehnen)\s*$/ }).first();
  await reject.click({ timeout: 20_000 }).catch(() => console.log('no cookie banner shown'));
  await page.waitForURL(/www\.youtube\.com\/watch/, { timeout: 30_000 });
  return page;
}

// Ads play in full; quality is requested only once the video itself runs.
async function playAt1080(page: Page): Promise<void> {
  await expect.poll(async () => (await playback(page)).ad, { timeout: 180_000 }).toBe(false);
  await page.waitForFunction(
    () => 'setPlaybackQualityRange' in (document.getElementById('movie_player') ?? {}),
  );
  await page.evaluate(() => {
    const player = document.getElementById('movie_player') as unknown as YoutubePlayer;
    player.setPlaybackQualityRange('hd1080', 'hd1080');
    player.playVideo();
  });
  await expect.poll(async () => (await playback(page)).height, { timeout: 60_000 }).toBe(1080);
  await expect.poll(async () => (await playback(page)).paused, { timeout: 30_000 }).toBe(false);
}

// From floawty's process start (shim loading included) to its visible window, as the launcher sees it.
async function startTimes(env: NodeJS.ProcessEnv): Promise<number[]> {
  const times: number[] = [];
  for (let run = 1; run <= START_RUNS; run += 1) {
    const floawty = await startFloawty(env, [], true);
    try {
      times.push(floawty.startMs ?? NaN);
    } finally {
      await floawty.stop();
    }
    // Let the OS release the previous instance before the next start.
    await delay(2000);
  }
  return times;
}

test('download size and start time', async () => {
  const mib = statSync(EXE).size / 2 ** 20;
  console.log(`download (portable exe): ${mib.toFixed(1)} MiB`);
  expect(mib).toBeLessThanOrEqual(BUDGET.downloadMiB);
  const times = await startTimes(plainStart());
  mkdirSync(RESULTS, { recursive: true });
  const rows = times.map((ms, index) => `"${index + 1}","${ms}"`);
  writeFileSync(path.join(RESULTS, `${APP}-start.csv`), ['"Run","StartMs"', ...rows].join('\n'));
  const ms = median(times);
  console.log(`start to visible window: ${ms} ms (median of ${START_RUNS}: ${times.join(', ')})`);
  expect(ms).toBeLessThanOrEqual(BUDGET.startMs);
});

test('idle on the tiles, without the debug port', async () => {
  const app = await startFloawty(plainStart());
  try {
    await delay(SETTLE_MS);
    const idle = measure('idle', app.pid);
    console.log(readFileSync(path.join(RESULTS, `${APP}-idle-hosts.txt`), 'utf8'));
    expect(idle.ramMB).toBeLessThanOrEqual(BUDGET.idleMB);
    expect(idle.cpu).toBeLessThan(BUDGET.idleCpu);
  } finally {
    await app.stop();
  }
});

test('idle after pointing at every tile', async () => {
  await measureAfterHover('idle-after-hover');
});

test('idle after pointing with animations off', async () => {
  await measureAfterHover('idle-after-hover-still', { animations: false });
});

// Over the debug port: a hidden page sees the mouse only through it, and the tiles tilt under it.
async function measureAfterHover(scenario: string, settings?: object): Promise<void> {
  const app = await launch(acceptedProfile(settings));
  try {
    await delay(SETTLE_MS);
    const [width, height] = await app.home.evaluate(() => [innerWidth, innerHeight] as const);
    // Four columns in three rows at the default 480 × 270, below the bar.
    for (const y of [0.25, 0.5, 0.75]) {
      for (const x of [0.125, 0.375, 0.625, 0.875]) {
        await app.point(x, y);
        await app.home.mouse.move(x * width, y * height, { steps: 5 });
      }
    }
    await app.pointAway();
    await app.home.mouse.move(-10, -10);
    await delay(SETTLE_MS);
    // The idle budget is for untouched tiles; this RAM is reported for the maintainer to judge.
    const idle = measure(scenario, app.pid);
    expect(idle.cpu).toBeLessThan(BUDGET.idleCpu);
  } finally {
    await app.stop();
  }
}

test('YouTube 1080p at 70 % opacity, then hidden and paused', async () => {
  const app = await launch(freshProfile());
  try {
    await app.bar.evaluate(() => window.__TAURI_INTERNALS__.invoke('set_opacity', { value: 0.7 }));
    const page = await openTestVideo(app);
    await playAt1080(page);
    await app.pointAway();
    await page.waitForTimeout(SETTLE_MS);
    const before = await playback(page);
    const playing = measure('youtube-1080p', app.pid);
    const after = await playback(page);
    const fps = (after.frames - before.frames) / SECONDS;
    console.log(
      `played ${after.height}p at ${fps.toFixed(1)} fps, ${after.dropped - before.dropped} frames dropped`,
    );
    expect(after.height).toBe(1080);
    expect(fps).toBeGreaterThan(50);
    expect(playing.ramMB).toBeLessThanOrEqual(BUDGET.youtubeMB);

    await app.hotkey('Ctrl+Alt+Shift+O');
    await expect.poll(async () => (await playback(page)).paused).toBe(true);
    await page.waitForTimeout(10_000);
    const hidden = measure('hidden', app.pid);
    expect(hidden.cpu).toBeLessThan(BUDGET.idleCpu);
  } finally {
    await app.stop();
  }
});
