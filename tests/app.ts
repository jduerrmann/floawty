// Starts the build under test with its own empty data folders and connects over CDP.
// A hidden run (FLOAWTY_TEST_HIDDEN=1) starts floawty through the test-input launcher.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect, type Browser, type Page } from '@playwright/test';
import { startOnFreePort } from './debug-port';
import {
  LineQueue,
  parseChildren,
  parseCounts,
  parsePidLine,
  parseReply,
  type Counts,
} from './launcher-lines';
import { pressKeys } from './real-input';
import { sendKeysFor } from './send-keys';
import { EXE } from './tested-exe';

const CDP_PORT = 9334;
// The environment variable replaces the app's own WebView2 arguments, so repeat them.
const BROWSER_ARGS = [
  '--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection',
  '--disable-background-networking',
  // Tests run on the maintainer's PC; videos stay silent.
  '--mute-audio',
  `--remote-debugging-port=${CDP_PORT}`,
].join(' ');
const LAUNCHER = path.join(
  import.meta.dirname,
  '..',
  'tools',
  'test-input',
  'target',
  'release',
  'test-input.exe',
);
const LAUNCHER_QUIT_MS = 10_000;

export interface Profile {
  dataDir: string;
  webviewDir: string;
}

/** A started floawty: in a hidden run behind the launcher, otherwise a plain child process. */
export interface Floawty {
  pid: number;
  stop: () => Promise<void>;
  /** Presses floawty's hotkey text, e.g. "Ctrl+Alt+Shift+T". */
  hotkey: (text: string) => Promise<void>;
  /** What the launcher swallowed from floawty; `null` when no launcher is in between. */
  counts: () => Promise<Counts | null>;
  /** The floawtys this one started by restarting itself; `stop` ends them too. */
  children: () => Promise<number[]>;
}

export interface RunningApp {
  browser: Browser;
  home: Page;
  bar: Page;
  pid: number;
  pages: () => Page[];
  hotkey: (text: string) => Promise<void>;
  children: () => Promise<number[]>;
  stop: () => Promise<void>;
}

export function freshProfile(): Profile {
  const root = mkdtempSync(path.join(tmpdir(), 'floawty-test-'));
  return { dataDir: path.join(root, 'data'), webviewDir: path.join(root, 'webview') };
}

function exited(app: ChildProcess): Promise<void> {
  return new Promise((resolve) =>
    app.exitCode !== null ? resolve() : app.once('exit', () => resolve()),
  );
}

function childrenOf(pid: number): number[] {
  const query = `(Get-CimInstance Win32_Process -Filter "ParentProcessId=${pid} AND Name='${path.basename(EXE)}'").ProcessId`;
  const output = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', query]);
  return output.toString().split(/\s+/).filter(Boolean).map(Number);
}

function killIfAlive(pid: number): void {
  try {
    process.kill(pid);
  } catch {
    // Already ended.
  }
}

function startVisible(env: NodeJS.ProcessEnv, args: string[]): Floawty {
  const app = spawn(EXE, args, { env });
  const pid = app.pid ?? 0;
  // Only children a test asked for are ended, so a stop needs no process query.
  const seen = new Set<number>();
  return {
    pid,
    stop: async () => {
      app.kill();
      await exited(app);
      seen.forEach(killIfAlive);
    },
    hotkey: async (text) => pressKeys(sendKeysFor(text)),
    counts: async () => null,
    children: async () => {
      const pids = childrenOf(pid);
      pids.forEach((child) => seen.add(child));
      return pids;
    },
  };
}

async function startHidden(env: NodeJS.ProcessEnv, args: string[]): Promise<Floawty> {
  const launcher = spawn(LAUNCHER, ['floawty', EXE, ...args], {
    env,
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  const lines = new LineQueue();
  const reader = createInterface({ input: launcher.stdout });
  reader.on('line', (line) => lines.push(line));
  reader.on('close', () => lines.close());
  launcher.once('error', () => lines.close());
  // A launcher that ended already must not turn a late write into an unhandled error.
  launcher.stdin.on('error', () => undefined);
  const ask = async (command: string): Promise<string> => {
    launcher.stdin.write(`${command}\n`);
    return parseReply(await lines.next());
  };
  let pid: number;
  try {
    pid = parsePidLine(await lines.next());
  } catch (error) {
    launcher.kill();
    throw new Error(`floawty did not start: ${(error as Error).message}`, { cause: error });
  }
  const counts = async () => parseCounts((await ask('counts')).trim());
  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    let opened = 0;
    const quit = async () => {
      opened = (await counts().catch(() => null))?.shellExecute ?? 0;
      await ask('quit').catch(() => undefined);
      launcher.stdin.end();
      await exited(launcher);
    };
    // A stuck launcher is killed; its kill-on-close job then ends floawty too.
    await Promise.race([quit(), delay(LAUNCHER_QUIT_MS)]);
    if (launcher.exitCode === null) launcher.kill();
    if (opened > 0) throw new Error(`floawty tried to open ${opened} page(s) outside floawty`);
  };
  return {
    pid,
    stop,
    hotkey: async (text) => void (await ask(`hotkey ${text}`)),
    counts,
    children: async () => parseChildren((await ask('children')).trim()),
  };
}

/** Every start of the tested exe goes through here, so a hidden run never starts one directly. */
export async function startFloawty(env: NodeJS.ProcessEnv, args: string[] = []): Promise<Floawty> {
  return env.FLOAWTY_TEST_HIDDEN === '1' ? startHidden(env, args) : startVisible(env, args);
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

export async function launch(profile: Profile): Promise<RunningApp> {
  const env = {
    ...process.env,
    FLOAWTY_DATA_DIR: profile.dataDir,
    WEBVIEW2_USER_DATA_FOLDER: profile.webviewDir,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: BROWSER_ARGS,
  };
  const floawty = await startOnFreePort(CDP_PORT, () => startFloawty(env));
  const browser = await connect();
  const pages = () => browser.contexts().flatMap((context) => context.pages());
  const find = (file: string) =>
    pages().find(
      (page) => new URL(page.url()).pathname === file && page.url().includes('tauri.localhost'),
    );
  await expect.poll(() => Boolean(find('/') && find('/bar.html'))).toBe(true);
  const stop = async () => {
    try {
      await browser.close();
    } finally {
      await floawty.stop();
    }
  };
  const [home, bar] = [find('/'), find('/bar.html')] as [Page, Page];
  const { pid, hotkey, children } = floawty;
  return { browser, home, bar, pid, pages, hotkey, children, stop };
}
