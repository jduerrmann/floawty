// The first-start notice over the start page, in every size, language and scheme.
import { expect, test, type Page } from '@playwright/test';
import { t, type Language } from '../../src/i18n';
import { showHome } from './own-pages';

const SIZES: [number, number][] = [
  [240, 135],
  [240, 700],
  [360, 202],
  [480, 270],
  [900, 180],
  [1280, 720],
  [3440, 1440],
];
const BAR_HEIGHT = 40;
// The smallest window has room for four lines beside OK.
const READABLE_LINES = 4;
const AA = 4.5;
// One colour, give or take the rounding of a step of 255.
const FLAT = 1.02;

async function showNotice(page: Page, language: Language): Promise<void> {
  await page.evaluate(
    ([text, ok]) => {
      (document.getElementById('notice-text') as HTMLElement).textContent = text;
      (document.getElementById('notice-ok') as HTMLElement).textContent = ok;
      (document.getElementById('notice') as HTMLElement).hidden = false;
    },
    [t(language, 'noticeText'), t(language, 'noticeOk')] as const,
  );
}

/** Contrast between the lightest and the darkest pixel of a picture. */
function contrast(page: Page, image: Buffer): Promise<number> {
  return page.evaluate(
    async (source) => {
      const picture = new Image();
      picture.src = source;
      await picture.decode();
      const context = new OffscreenCanvas(picture.width, picture.height).getContext('2d');
      if (!context) throw new Error('no canvas');
      context.drawImage(picture, 0, 0);
      const { data } = context.getImageData(0, 0, picture.width, picture.height);
      const linear = (value: number) => {
        const part = value / 255;
        return part <= 0.04045 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4;
      };
      let [darkest, lightest] = [1, 0];
      for (let i = 0; i < data.length; i += 4) {
        const [red = 0, green = 0, blue = 0] = data.subarray(i, i + 3);
        const light = 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
        darkest = Math.min(darkest, light);
        lightest = Math.max(lightest, light);
      }
      return (lightest + 0.05) / (darkest + 0.05);
    },
    `data:image/png;base64,${image.toString('base64')}`,
  );
}

for (const [width, height] of SIZES) {
  for (const language of ['en', 'de'] as const) {
    for (const colorScheme of ['light', 'dark'] as const) {
      test(`the notice lies over the tiles: ${language}, ${colorScheme}, ${width} × ${height}`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme });
        await showHome(page, width, height, 11);
        const tiles = () =>
          page.locator('#tiles > li').evaluateAll((items) =>
            items.map((item) => {
              const { x, y, width, height } = item.getBoundingClientRect();
              return [x, y, width, height];
            }),
          );
        const before = await tiles();
        await showNotice(page, language);
        expect(await tiles()).toEqual(before);

        const ok = await page.locator('#notice-ok').boundingBox();
        if (!ok) throw new Error('OK has no box');
        expect(ok.y).toBeGreaterThanOrEqual(BAR_HEIGHT);
        expect(ok.y + ok.height).toBeLessThanOrEqual(height);
        expect(ok.x + ok.width).toBeLessThanOrEqual(width);

        const text = await page.locator('#notice-text').evaluate((element) => {
          const box = element.getBoundingClientRect();
          return {
            top: box.top,
            bottom: box.bottom,
            lines: element.clientHeight / parseFloat(getComputedStyle(element).lineHeight),
            scrolls: element.scrollHeight > element.clientHeight + 1,
          };
        });
        expect(text.top).toBeGreaterThanOrEqual(BAR_HEIGHT);
        expect(text.bottom).toBeLessThanOrEqual(height);
        // Only the smallest window cannot hold the whole text.
        if (width === 240 && height === 135) {
          expect(text.lines).toBeGreaterThanOrEqual(READABLE_LINES - 0.1);
        } else {
          expect(text.scrolls).toBe(false);
        }

        const picture = await page.locator('#notice-text').screenshot();
        expect(await contrast(page, picture)).toBeGreaterThanOrEqual(AA);

        // Every visible tile lies under the notice or its dimmed ground.
        const uncovered = await page.locator('#tiles > li').evaluateAll(
          (items) =>
            items.filter((item) => {
              const box = item.getBoundingClientRect();
              const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
              const top = document.elementFromPoint(x, y);
              return top !== null && item.contains(top);
            }).length,
        );
        expect(uncovered).toBe(0);

        // Without its text the card is one colour: no tile shines through.
        await page.addStyleTag({
          content: '#notice-text { color: transparent; overflow: hidden; }',
        });
        const card = await page.locator('#notice-text').screenshot();
        expect(await contrast(page, card)).toBeLessThanOrEqual(FLAT);
      });
    }
  }
}
