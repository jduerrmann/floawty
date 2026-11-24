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
