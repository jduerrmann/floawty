// Starts the build under test with its own empty data folders and connects over CDP.
// A hidden run (FLOAWTY_TEST_HIDDEN=1) starts floawty through the test-input launcher.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect, type Browser, type Page } from '@playwright/test';
import { hiddenInput, type AppInput, type LauncherInput } from './app-input';
import { startOnFreePort } from './debug-port';
import {
  buttonCommand,
  cursorCommand,
  foregroundCommand,
  LineQueue,
  parseChildren,
  parseCounts,
  parsePidLine,
  parseReply,
  parseStartedLine,
  type Counts,
} from './launcher-lines';
import { pressKeys, visibleInput } from './real-input';
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
  /** Milliseconds from floawty's process start to its visible window; `null` unless asked for and hidden. */
  startMs: number | null;
  stop: () => Promise<void>;
  /** Presses floawty's hotkey text, e.g. "Ctrl+Alt+Shift+T". */
  hotkey: (text: string) => Promise<void>;
  /** What the launcher swallowed from floawty; `null` when no launcher is in between. */
  counts: () => Promise<Counts | null>;
  /** File and parameters of the last swallowed `ShellExecuteW`; `null` without a launcher. */
  lastShell: () => Promise<string | null>;
  /** The floawtys this one started by restarting itself; `stop` ends them too. */
  children: () => Promise<number[]>;
  /** The launcher's cursor, button and foreground; `null` when no launcher is in between. */
  input: LauncherInput | null;
}

export interface RunningApp extends Omit<AppInput, 'stop'> {
  browser: Browser;
  home: Page;
  bar: Page;
  pid: number;
  pages: () => Page[];
  hotkey: (text: string) => Promise<void>;
  children: () => Promise<number[]>;
  /** What the launcher swallowed from floawty; `null` in a visible run. */
  counts: () => Promise<Counts | null>;
  lastShell: () => Promise<string | null>;
  stop: () => Promise<void>;
}

/** Another exe than the tested build, and the pages it may open outside floawty in a hidden run. */
export interface StartOptions {
  exe?: string;
  allowedOpens?: number;
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

function childrenOf(pid: number, exe: string): number[] {
  const query = `(Get-CimInstance Win32_Process -Filter "ParentProcessId=${pid} AND Name='${path.basename(exe)}'").ProcessId`;
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

function startVisible(env: NodeJS.ProcessEnv, args: string[], exe: string): Floawty {
  const app = spawn(exe, args, { env });
  const pid = app.pid ?? 0;
  // Only children a test asked for are ended, so a stop needs no process query.
  const seen = new Set<number>();
  return {
    pid,
    startMs: null,
    stop: async () => {
      app.kill();
      await exited(app);
      seen.forEach(killIfAlive);
    },
    hotkey: async (text) => pressKeys(sendKeysFor(text)),
    counts: async () => null,
    lastShell: async () => null,
    children: async () => {
      const pids = childrenOf(pid, exe);
      pids.forEach((child) => seen.add(child));
      return pids;
    },
    input: null,
  };
}

async function startHidden(
  env: NodeJS.ProcessEnv,
  args: string[],
  reportStart: boolean,
  { exe = EXE, allowedOpens = 0 }: StartOptions,
): Promise<Floawty> {
  const report = reportStart ? ['--report-start'] : [];
  const launcher = spawn(LAUNCHER, ['floawty', ...report, exe, ...args], {
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
  let startMs: number | null = null;
  try {
    pid = parsePidLine(await lines.next());
    if (reportStart) startMs = parseStartedLine(await lines.next());
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
    if (opened > allowedOpens) {
      throw new Error(`floawty tried to open ${opened} page(s) outside floawty`);
    }
  };
  return {
    pid,
    startMs,
    stop,
    hotkey: async (text) => void (await ask(`hotkey ${text}`)),
    counts,
    lastShell: async () => (await ask('last-shell')).trim() || null,
    children: async () => parseChildren((await ask('children')).trim()),
    input: {
      cursor: async (point) => void (await ask(cursorCommand(point))),
      button: async (button, down) => void (await ask(buttonCommand(button, down))),
      foreground: async (name) => void (await ask(foregroundCommand(name))),
    },
  };
}

/**
 * Every start of the tested exe goes through here, so a hidden run never starts one directly.
 * `reportStart` (hidden only) waits for the window and fills `startMs`.
 */
export async function startFloawty(
  env: NodeJS.ProcessEnv,
  args: string[] = [],
  reportStart = false,
  options: StartOptions = {},
): Promise<Floawty> {
  // Set by `test-input run`: a direct `playwright test` would hold no run lock.
  if (env.FLOAWTY_TEST_RUN !== '1') {
    throw new Error(
      'start app tests through npm run smoke:hidden, smoke:real, smoke or measure, which hold the run lock',
    );
  }
  if (env.FLOAWTY_TEST_HIDDEN !== '1') {
    if (reportStart) throw new Error('the start time is measured by the hidden launcher');
    return startVisible(env, args, options.exe ?? EXE);
  }
  return startHidden(env, args, reportStart, options);
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

export async function launch(
  profile: Profile,
  options: StartOptions & { env?: NodeJS.ProcessEnv } = {},
): Promise<RunningApp> {
  const env = {
    ...process.env,
    ...options.env,
    FLOAWTY_DATA_DIR: profile.dataDir,
    WEBVIEW2_USER_DATA_FOLDER: profile.webviewDir,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: BROWSER_ARGS,
  };
  const floawty = await startOnFreePort(CDP_PORT, () => startFloawty(env, [], false, options));
  const browser = await connect();
  const pages = () => browser.contexts().flatMap((context) => context.pages());
  const find = (file: string) =>
    pages().find(
      (page) => new URL(page.url()).pathname === file && page.url().includes('tauri.localhost'),
    );
  await expect.poll(() => Boolean(find('/') && find('/bar.html'))).toBe(true);
  const [home, bar] = [find('/'), find('/bar.html')] as [Page, Page];
  const { pid, hotkey, children } = floawty;
  const input = floawty.input ? hiddenInput(pid, floawty.input, pages, home) : visibleInput(pid);
  const stop = async () => {
    try {
      input.stop();
      await browser.close();
    } finally {
      await floawty.stop();
    }
  };
  const { point, pointAway, click, press, release, foreground } = input;
  return {
    browser,
    home,
    bar,
    pid,
    pages,
    hotkey,
    children,
    stop,
    point,
    pointAway,
    click,
    press,
    release,
    foreground,
    counts: floawty.counts,
    lastShell: floawty.lastShell,
  };
}
