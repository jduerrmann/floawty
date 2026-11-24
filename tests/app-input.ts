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

export function hiddenInput(
  pid: number,
  launcher: LauncherInput,
  pages: () => Page[],
  home: Page,
): AppInput {
  const where = (fx: number, fy: number) => screenPoint(windowRect(pid), fx, fy);
  return {
    point: async (fx, fy) => launcher.cursor(where(fx, fy)),
    pointAway: async () => launcher.cursor(awayPoint(windowRect(pid))),
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
    foreground: launcher.foreground,
    stop: () => undefined,
  };
}
