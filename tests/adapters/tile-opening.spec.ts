// The opening mark on the home page's real markup and styles: ring, faded neighbours, stillness.
import { expect, test, type Page } from '@playwright/test';
import { showHome } from './own-pages';

// The first tile marked as `showOpening` in tiles.ts marks it.
async function markFirstTile(page: Page): Promise<void> {
  await page.locator('#tiles').evaluate((list) => {
    list.toggleAttribute('data-opening', true);
    const button = list.querySelector('.tile');
    button?.setAttribute('aria-busy', 'true');
    const ring = document.createElement('span');
    ring.className = 'tile-busy';
    button?.querySelector('.tile-face')?.append(ring);
  });
}

const opacityOf = (page: Page, index: number) =>
  page
    .locator('#tiles > li .tile')
    .nth(index)
    .evaluate((tile) => getComputedStyle(tile).opacity);

const ringTurns = (page: Page) =>
  page.locator('.tile-busy').evaluate((ring) => ring.getAnimations().length > 0);

test('the opening tile keeps its colour while the others step back', async ({ page }) => {
  await showHome(page, 480, 270, 11);
  await markFirstTile(page);
  await expect.poll(() => opacityOf(page, 1)).toBe('0.4');
  expect(await opacityOf(page, 0)).toBe('1');
  await expect(page.locator('.tile-busy')).toBeVisible();
});

test('the ring turns, unless animations are off or motion is reduced', async ({ page }) => {
  await showHome(page, 480, 270, 11);
  await markFirstTile(page);
  expect(await ringTurns(page)).toBe(true);
  await page.evaluate(() => document.documentElement.toggleAttribute('data-still', true));
  expect(await ringTurns(page)).toBe(false);
  await page.evaluate(() => document.documentElement.toggleAttribute('data-still', false));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await ringTurns(page)).toBe(false);
});
