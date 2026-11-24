import { expect, test } from 'vitest';
import { awayPoint, screenPoint } from './screen-point';

const RECT = { left: 100, top: 50, right: 740, bottom: 410 };

test('a fraction of the window is a screen point inside it', () => {
  expect(screenPoint(RECT, 0, 0)).toEqual({ x: 100, y: 50 });
  expect(screenPoint(RECT, 0.5, 0.6)).toEqual({ x: 420, y: 266 });
  expect(screenPoint(RECT, 1, 1)).toEqual({ x: 740, y: 410 });
});

test('a fraction that lands between pixels is rounded', () => {
  expect(screenPoint(RECT, 0.3333, 0.3333)).toEqual({ x: 313, y: 170 });
});

test('away is 200 pixels above and left of the window, even off the screen', () => {
  expect(awayPoint(RECT)).toEqual({ x: -100, y: -150 });
});
