// A local update endpoint and the update-test build (`npm run build:update-test`), for the
// update specs. FLOAWTY_TEST_EXE does not reach them: they always start the update-test build.
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect } from '@playwright/test';
import { latestJson } from '../scripts/latest-json.mjs';
import { UPDATE_TEST } from '../scripts/update-test.mjs';
import { freshProfile, launch, type Profile, type RunningApp } from './app';

export const VERSION = (
  JSON.parse(readFileSync(path.join(import.meta.dirname, '..', 'package.json'), 'utf8')) as {
    version: string;
  }
).version;
export const DIR = path.join(import.meta.dirname, '..', UPDATE_TEST.dir);
export const PAYLOAD = path.join(DIR, UPDATE_TEST.payload);
const BASE = `http://127.0.0.1:${UPDATE_TEST.port}`;
// Long enough for a retry or a request at start to show; nothing waits on it otherwise.
export const QUIET_MS = 2000;

export type Answer = 'update' | 'other-signature' | 'other-version' | 'unavailable' | 'drop';

const SIGNATURES: Record<string, string> = {
  update: `${PAYLOAD}.sig`,
  'other-signature': path.join(DIR, 'other.exe.sig'),
  'other-version': path.join(DIR, 'other-version.exe.sig'),
};

export interface UpdateServer {
  /** Every request, the manifest and the download alike. */
  requests: () => number;
  close: () => Promise<void>;
}

function manifest(signatureFile: string): string {
  const signature = readFileSync(signatureFile, 'utf8');
  const url = `${BASE}/${UPDATE_TEST.payload}`;
  const json = latestJson({
    version: UPDATE_TEST.version,
    notes: '',
    pubDate: new Date(),
    signature,
    url,
  });
  return JSON.stringify(json);
}

export async function serve(answer: Answer): Promise<UpdateServer> {
  let requests = 0;
  const server: Server = createServer((request, response) => {
    requests += 1;
    if (answer === 'drop') return void request.socket.destroy();
    if (answer === 'unavailable') return void response.writeHead(503).end();
    if (request.url === `/${UPDATE_TEST.payload}`) {
      return void response.writeHead(200).end(readFileSync(PAYLOAD));
    }
    const signature = SIGNATURES[answer] as string;
    response.writeHead(200, { 'content-type': 'application/json' }).end(manifest(signature));
  });
  // A busy port fails here, not as a timeout later.
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(UPDATE_TEST.port, '127.0.0.1', resolve);
  });
  return {
    requests: () => requests,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

function englishProfile(updateCheck: boolean): Profile {
  const profile = freshProfile();
  mkdirSync(profile.dataDir, { recursive: true });
  const settings = { noticeAccepted: true, language: 'en', updateCheck };
  writeFileSync(path.join(profile.dataDir, 'settings.json'), JSON.stringify(settings));
  return profile;
}

export interface StartOptions {
  exe: string;
  /** Where the updater saves the setup. */
  temp?: string;
  allowedOpens?: number;
  updateCheck?: boolean;
  /** Opens the settings once floawty runs. */
  settings?: boolean;
}

export async function startUpdateTest(options: StartOptions): Promise<RunningApp> {
  const temp = options.temp ?? newTemp();
  const app = await launch(englishProfile(options.updateCheck ?? false), {
    exe: path.join(DIR, options.exe),
    env: { TEMP: temp, TMP: temp },
    allowedOpens: options.allowedOpens ?? 0,
  });
  if (options.settings ?? true) await openSettings(app);
  return app;
}

export async function openSettings(app: RunningApp): Promise<void> {
  await app.bar.locator('#settings').click();
  await expect(app.home.locator('#settings-panel')).toBeVisible();
}

export const newTemp = () => mkdtempSync(path.join(tmpdir(), 'floawty-update-'));

export const status = (app: RunningApp) => app.home.locator('#update-status');

export function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Every file below `dir` whose name ends with `installer.exe`, where the updater saves the setup. */
export function savedSetups(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('installer.exe'))
    .map((name) => path.join(dir, name));
}

export const hiddenOnly = () =>
  process.env.FLOAWTY_TEST_HIDDEN !== '1' &&
  'needs the hidden launcher, which swallows the setup start and the browser';
