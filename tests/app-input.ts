// Cursor, click and foreground of a running floawty: in a hidden run through the launcher,
// in a visible one through real input (`visibleInput` in real-input.ts).
import type { Page } from '@playwright/test';
import { windowRect } from './desktop';
import type { ForegroundName, MouseButton } from './launcher-lines';
import { awayPoint, screenPoint, type Point } from './screen-point';

export interface AppInput {
  /** The cursor at a fraction of floawty's window, e.g. (0.5, 0.6) for the video's middle. */
  point: (fx: number, fy: number) => Promise<void>;
  /** The cursor 200 px above and left of floawty's window. */
  pointAway: () => Promise<void>;
  /** A left click at a fraction of floawty's window. */
  click: (fx: number, fy: number) => Promise<void>;
  /** Puts another window or none in front; floawty's own states only exist in a hidden run. */
  foreground: (name: ForegroundName) => Promise<void>;
  /**
   * Holds the left button down on a page at a point of that page, with the cursor already set by
   * `point`; hidden runs only. `release` lets it go again.
   */
  press: (page: Page, x: number, y: number) => Promise<void>;
  release: () => Promise<void>;
  /** Ends what the input started. */
  stop: () => void;
}

/** What the hidden launcher offers floawty's cursor, buttons and foreground. */
export interface LauncherInput {
  cursor: (point: Point | null) => Promise<void>;
  button: (button: MouseButton, down: boolean) => Promise<void>;
  foreground: (name: ForegroundName) => Promise<void>;
}

const APP_PAGES = 'tauri.localhost';

/**
 * The page that fills the window: the service if one is open, else the home page. Only the
 * frameless floaty view makes a page fraction equal the window fraction; window mode adds a title
 * bar and the bar strip, and an open sign-in page would count as the service.
 */
function filling(pages: () => Page[], home: Page): Page {
  const service = pages().find(
    (page) => /^https?:/.test(page.url()) && !page.url().includes(APP_PAGES),
  );
  return service ?? home;
}

// The click is dispatched into the page over CDP; a capture listener proves it arrived.
async function clickPage(page: Page, fx: number, fy: number): Promise<void> {
  const [width, height] = await page.evaluate(() => [innerWidth, innerHeight] as const);
  await page.evaluate(() => {
    const seen = window as unknown as { __floawtyDown: boolean };
    seen.__floawtyDown = false;
    addEventListener(
      'pointerdown',
      () => {
        seen.__floawtyDown = true;
      },
      { capture: true, once: true },
    );
  });
  await page.mouse.click(fx * width, fy * height);
  const arrived = await page.evaluate(
    () => (window as unknown as { __floawtyDown: boolean }).__floawtyDown,
  );
  if (!arrived) throw new Error('no pointerdown arrived');
}

/** The cursor floawty itself sees in a hidden run; pages see the mouse only over CDP. */
function launcherPointer(
  pid: number,
  launcher: LauncherInput,
): Pick<AppInput, 'point' | 'pointAway'> {
  return {
    point: async (fx, fy) => launcher.cursor(screenPoint(windowRect(pid), fx, fy)),
    pointAway: async () => launcher.cursor(awayPoint(windowRect(pid))),
  };
}

export function hiddenInput(
  pid: number,
  launcher: LauncherInput,
  pages: () => Page[],
  home: Page,
): AppInput {
  const where = (fx: number, fy: number) => screenPoint(windowRect(pid), fx, fy);
  let pressed: Page | undefined;
  return {
    ...launcherPointer(pid, launcher),
    click: async (fx, fy) => {
      const point = where(fx, fy);
      const page = filling(pages, home);
      await launcher.cursor(point);
      await launcher.button('left', true);
      try {
        await clickPage(page, fx, fy);
      } catch (error) {
        const cause = (error as Error).message;
        const at = `(${point.x}, ${point.y})`;
        throw new Error(`the click at ${at} did not reach the page ${page.url()}: ${cause}`, {
          cause: error,
        });
      } finally {
        await launcher.button('left', false);
      }
    },
    press: async (page, x, y) => {
      await launcher.button('left', true);
      pressed = page;
      await page.mouse.move(x, y);
      await page.mouse.down();
    },
    release: async () => {
      const page = pressed;
      if (!page) return;
      pressed = undefined;
      try {
        await page.mouse.up();
      } finally {
        await launcher.button('left', false);
      }
    },
    foreground: launcher.foreground,
    stop: () => undefined,
  };
}
