import type { Page } from '@playwright/test';
import { expect, test, vi } from 'vitest';
import { hiddenInput, type LauncherInput } from './app-input';

vi.mock('./desktop', () => ({
  windowRect: () => ({ left: 100, top: 50, right: 580, bottom: 320 }),
}));

/** A page whose listener reports whether a pointerdown arrived. */
function fakePage(arrives: boolean): Page {
  const answers: unknown[] = [[480, 270], undefined, arrives];
  return {
    url: () => 'https://example.com/',
    evaluate: async () => answers.shift(),
    mouse: { click: async () => undefined },
  } as unknown as Page;
}

function fakeLauncher(said: string[]): LauncherInput {
  return {
    cursor: async (point) => void said.push(point ? `cursor ${point.x} ${point.y}` : 'cursor none'),
    button: async (button, down) => void said.push(`button ${button} ${down ? 'down' : 'up'}`),
    foreground: async (name) => void said.push(`foreground ${name}`),
  };
}

test('a hidden click sets cursor and button around a click that reached the page', async () => {
  const said: string[] = [];
  const page = fakePage(true);
  await hiddenInput(1, fakeLauncher(said), () => [page], page).click(0.5, 0.6);
  expect(said).toEqual(['cursor 340 212', 'button left down', 'button left up']);
});

test('a click that does not reach the page fails with the point and page, and lets go', async () => {
  const said: string[] = [];
  const page = fakePage(false);
  const click = hiddenInput(1, fakeLauncher(said), () => [page], page).click(0.5, 0.6);
  await expect(click).rejects.toThrow(
    'the click at (340, 212) did not reach the page https://example.com/: no pointerdown arrived',
  );
  expect(said.at(-1)).toBe('button left up');
});

/** A page that records the mouse the way the launcher records its own lines. */
function mousePage(said: string[]): Page {
  return {
    mouse: {
      move: async (x: number, y: number) => void said.push(`move ${x} ${y}`),
      down: async () => void said.push('mouse down'),
      up: async () => void said.push('mouse up'),
    },
  } as unknown as Page;
}

test('a press holds the button down, moves into the page and presses there', async () => {
  const said: string[] = [];
  const page = mousePage(said);
  const input = hiddenInput(1, fakeLauncher(said), () => [page], page);
  await input.press(page, 12, 7);
  expect(said).toEqual(['button left down', 'move 12 7', 'mouse down']);
});

test('a release lets the page and the launcher button go, and does nothing twice', async () => {
  const said: string[] = [];
  const page = mousePage(said);
  const input = hiddenInput(1, fakeLauncher(said), () => [page], page);
  await input.press(page, 1, 2);
  said.length = 0;
  await input.release();
  await input.release();
  expect(said).toEqual(['mouse up', 'button left up']);
});
