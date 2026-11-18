// Adapter test: the Netflix script removes the page scrollbar while a title plays.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const ROOT = path.join(import.meta.dirname, '..', '..');
const ORIGIN = 'https://www.netflix.com';

async function open(page: Page, pathname: string): Promise<void> {
  const script = path.join(ROOT, 'dist', 'page', 'netflix.js');
  if (!existsSync(script)) throw new Error(`${script} is missing: run npm run build:ui`);
  await page.addInitScript({ path: script });
  await page.route(`${ORIGIN}/**`, (route) =>
    route.fulfill({
      path: path.join(ROOT, 'test', 'fixtures', 'netflix', 'page.html'),
      contentType: 'text/html',
    }),
  );
  await page.goto(ORIGIN + pathname);
}

function scrollable(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      getComputedStyle(document.documentElement).overflowY !== 'hidden' &&
      getComputedStyle(document.body).overflowY !== 'hidden',
  );
}

test('a playing title shows no page scrollbar', async ({ page }) => {
  await open(page, '/watch/80100172');
  expect(await scrollable(page)).toBe(false);
});

test('browsing keeps the scrollbar', async ({ page }) => {
  await open(page, '/browse');
  expect(await scrollable(page)).toBe(true);
});

test('moving between browse and watch without a reload follows the page', async ({ page }) => {
  await open(page, '/browse');
  await page.evaluate(() => history.pushState(null, '', '/watch/80100172'));
  await expect.poll(() => scrollable(page)).toBe(false);
  await page.goBack();
  await expect.poll(() => scrollable(page)).toBe(true);
});

test('other hosts are left alone', async ({ page }) => {
  const script = path.join(ROOT, 'dist', 'page', 'netflix.js');
  await page.addInitScript({ path: script });
  await page.route('https://example.com/**', (route) =>
    route.fulfill({
      path: path.join(ROOT, 'test', 'fixtures', 'netflix', 'page.html'),
      contentType: 'text/html',
    }),
  );
  await page.goto('https://example.com/watch/1');
  expect(await scrollable(page)).toBe(true);
});
