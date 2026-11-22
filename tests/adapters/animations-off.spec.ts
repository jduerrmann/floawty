// Animations switched off: floawty's own pages stand still like under reduced motion.
import { expect, test, type Page } from '@playwright/test';
import { showBar, showHome } from './own-pages';

const switchOff = (page: Page) =>
  page.evaluate(() => document.documentElement.setAttribute('data-still', ''));
const switchOn = (page: Page) =>
  page.evaluate(() => document.documentElement.removeAttribute('data-still'));

const style = (page: Page, selector: string, property: string, pseudo?: string) =>
  page
    .locator(selector)
    .first()
    .evaluate(
      (element, [name, part]) =>
        getComputedStyle(element, part || undefined).getPropertyValue(name),
      [property, pseudo ?? ''] as const,
    );

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('switched off, a tile keeps the glow and stands still', async ({ page }) => {
  await showHome(page, 480, 270, 11);
  await switchOff(page);
  await page.locator('#tiles > li').first().hover();
  await page
    .locator('#tiles > li')
    .first()
    .evaluate((item) => item.style.setProperty('--light-x', '90%'));
  expect(await style(page, '.tile-face', 'opacity', '::before')).toBe('1');
  for (const part of ['.tile-face', '.tile-symbol', '.tile-more']) {
    expect(await style(page, part, 'transform'), part).toBe('none');
    expect(await style(page, part, 'transition-duration'), part).toBe('0s');
  }
  expect(await style(page, '.tile-face', '--light-x')).toBe('50%');
});

test('switched on again, a tile tilts again', async ({ page }) => {
  await showHome(page, 480, 270, 11);
  await switchOff(page);
  await page.addStyleTag({ content: '* { transition: none !important; }' });
  await page.locator('#tiles > li').first().hover();
  expect(await style(page, '.tile-face', 'transform')).toBe('none');
  await switchOn(page);
  expect(await style(page, '.tile-face', 'transform')).not.toBe('none');
});

test('switched off, switches move without a slide', async ({ page }) => {
  await showHome(page, 480, 270, 0);
  await switchOff(page);
  expect(await style(page, '.switch', 'transition-duration', '::before')).toBe('0s');
});

test('switched off, the bar does not fade in', async ({ page }) => {
  await showBar(page);
  await page.locator('#controls').evaluate((controls) => controls.classList.add('appear'));
  expect(await style(page, '#controls', 'animation-name')).toBe('appear');
  await switchOff(page);
  expect(await style(page, '#controls', 'animation-name')).toBe('none');
});
