// The home page's real markup and styles in headless Edge: hover needs no app and no real mouse.
import { expect, test, type Page } from '@playwright/test';
import { tiltStyle, type Pointer } from '../../src/tilt';
import { showHome } from './own-pages';

// The shipped tiles, then with six own pages, which add rows and scrolling.
const COUNTS = [11, 17];
const SIZES: [number, number][] = [
  [240, 135],
  [320, 180],
  [359, 640],
  [360, 640],
  [480, 270],
  [1280, 720],
  [1740, 994],
  [2560, 1440],
  [3440, 1440],
];
// Just inside every corner, and the middle.
const POINTERS: Pointer[] = [
  { x: 0.02, y: 0.03 },
  { x: 0.98, y: 0.03 },
  { x: 0.5, y: 0.5 },
  { x: 0.02, y: 0.97 },
  { x: 0.98, y: 0.97 },
];
/** Puts the pointer on a tile and tilts it as tiles.ts does. */
async function pointTile(page: Page, index: number, pointer: Pointer): Promise<void> {
  const item = page.locator('#tiles > li').nth(index);
  await item.scrollIntoViewIfNeeded();
  const box = await item.boundingBox();
  if (!box) throw new Error(`tile ${index} has no box`);
  await page.mouse.move(box.x + box.width * pointer.x, box.y + box.height * pointer.y);
  await item.evaluate(
    (element, style) => {
      for (const [name, value] of Object.entries(style)) element.style.setProperty(name, value);
    },
    tiltStyle(pointer, box),
  );
}

function measureArea(page: Page) {
  return page.locator('.tiles-area').evaluate((element) => ({
    sideways: element.scrollWidth > element.clientWidth,
    downwards: element.scrollHeight > element.clientHeight,
  }));
}

for (const [width, height] of SIZES) {
  for (const count of COUNTS) {
    test(`the tilt adds no scrollbar and cuts nothing: ${count} tiles, ${width} × ${height}`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await showHome(page, width, height, count);
      // Without transitions the face is at its final place at once.
      await page.addStyleTag({ content: '* { transition: none !important; }' });
      const resting = await measureArea(page);
      expect(resting.sideways).toBe(false);
      // The room for the glow does not move the grid: 10 px at the side, below the bar.
      const first = await page.locator('#tiles > li').first().boundingBox();
      expect([first?.x, first?.y]).toEqual([10, 40]);
      for (let index = 0; index < count; index += 1) {
        for (const pointer of POINTERS) {
          await pointTile(page, index, pointer);
          const name = `tile ${index} at ${pointer.x}/${pointer.y}`;
          expect(await measureArea(page), name).toEqual(resting);
          const found = await page
            .locator('#tiles > li')
            .nth(index)
            .evaluate((item) => {
              const face = item.querySelector('.tile-face') as Element;
              const box = item.getBoundingClientRect();
              const tilted = face.getBoundingClientRect();
              return {
                hovered: item.matches(':hover'),
                beyond: Math.max(
                  box.left - tilted.left,
                  tilted.right - box.right,
                  box.top - tilted.top,
                  tilted.bottom - box.bottom,
                ),
              };
            });
          expect(found.hovered, name).toBe(true);
          expect(found.beyond, name).toBeLessThanOrEqual(0.05);
        }
      }
    });
  }
}

test('the face tilts, and a click at the edge still lands on the tile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await showHome(page, 1740, 994, 11);
  await page.addStyleTag({ content: '* { transition: none !important; }' });
  const item = page.locator('#tiles > li').nth(5);
  await item.locator('.tile').evaluate((button) => {
    button.addEventListener('click', () => button.setAttribute('data-clicked', ''));
  });
  // At the middle of the right edge: the corners themselves are round.
  await pointTile(page, 5, { x: 0.997, y: 0.5 });
  const transform = (selector: string) =>
    item.locator(selector).evaluate((element) => getComputedStyle(element).transform);
  expect(await transform('.tile-face')).toContain('matrix3d');
  expect(await transform('.tile-more')).toContain('matrix3d');
  await page.mouse.down();
  await page.mouse.up();
  await expect(item.locator('.tile')).toHaveAttribute('data-clicked', '');
});

test('the ⋯ button stays in place on the face', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await showHome(page, 1740, 994, 11);
  await page.addStyleTag({ content: '* { transition: none !important; }' });
  const item = page.locator('#tiles > li').nth(5);
  // A mark on the face exactly where the button rests.
  await item.locator('.tile-face').evaluate((face) => {
    const mark = document.createElement('i');
    mark.className = 'mark';
    mark.style.cssText = 'position:absolute;top:3px;right:3px;width:22px;height:22px';
    face.append(mark);
  });
  await pointTile(page, 5, { x: 0.9, y: 0.1 });
  const box = (selector: string) => item.locator(selector).boundingBox();
  const [button, mark] = [await box('.tile-more'), await box('.mark')];
  expect(button?.x).toBeCloseTo(mark?.x ?? NaN, 0);
  expect(button?.y).toBeCloseTo(mark?.y ?? NaN, 0);
});

test('reduced motion keeps the glow and drops the tilt', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await showHome(page, 480, 270, 11);
  await pointTile(page, 1, { x: 0.9, y: 0.1 });
  const face = page.locator('.tile-face').nth(1);
  expect(await face.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
  await expect
    .poll(() => face.evaluate((element) => getComputedStyle(element, '::before').opacity))
    .toBe('1');
});

test('keyboard focus glows without a tilt', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await showHome(page, 480, 270, 11);
  await page.keyboard.press('Tab');
  await expect(page.locator('.tile').first()).toBeFocused();
  const face = page.locator('.tile-face').first();
  await expect
    .poll(() => face.evaluate((element) => getComputedStyle(element, '::before').opacity))
    .toBe('1');
  expect(await face.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
});

test('a glowing tile stays above its neighbour while it fades', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await showHome(page, 1740, 994, 11);
  const item = page.locator('#tiles > li').first();
  await item.locator('.tile').hover();
  await page.mouse.move(1, 1);
  const layer = () => item.evaluate((element) => getComputedStyle(element).zIndex);
  expect(await layer()).toBe('1');
  await expect.poll(layer).toBe('0');
});

// The GPU rounds a gradient by a step of 255 between two paints; light would add dozens.
const ROUNDING = 2;

/** How much brighter the brightest changed colour channel got, in steps of 255. */
function rise(page: Page, before: Buffer, after: Buffer): Promise<number> {
  return page.evaluate(
    async (sources) => {
      const read = async (source: string): Promise<Uint8ClampedArray> => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const context = new OffscreenCanvas(image.width, image.height).getContext('2d');
        if (!context) throw new Error('no canvas');
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height).data;
      };
      const [dark, lit] = [await read(sources[0] ?? ''), await read(sources[1] ?? '')];
      return lit.reduce((most, value, index) => Math.max(most, value - (dark[index] ?? 0)), 0);
    },
    [before, after].map((image) => `data:image/png;base64,${image.toString('base64')}`),
  );
}

// The shade under the name is the lightest that reaches AA, so any light on it would break AA.
for (const colorScheme of ['light', 'dark'] as const) {
  for (const [width, height] of [
    [240, 135],
    [480, 270],
    [1740, 994],
  ] as const) {
    test(`the light never reaches the name: ${colorScheme}, ${width} × ${height}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'no-preference' });
      await showHome(page, width, height, 11);
      await page.addStyleTag({
        content:
          '* { transition: none !important; } .tile-face, .tile-symbol { transform: none !important; }' +
          '.tile { --tint: #f47521; --shade: #b05417; } .tile-name { color: transparent; }',
      });
      const name = page.locator('.tile-name').nth(1);
      const clip = await name.boundingBox();
      if (!clip) throw new Error('the name has no box');
      const resting = await page.screenshot({ clip });
      for (const pointer of [...POINTERS, { x: 0.5, y: 0.88 }]) {
        await pointTile(page, 1, pointer);
        const lit = await page.screenshot({ clip });
        expect(
          await rise(page, resting, lit),
          `pointer at ${pointer.x}/${pointer.y}`,
        ).toBeLessThanOrEqual(ROUNDING);
      }
      await page.mouse.move(1, 1);
      // Tile, its options button, then this tile.
      for (let press = 0; press < 3; press += 1) await page.keyboard.press('Tab');
      await expect(page.locator('.tile').nth(1)).toBeFocused();
      const focused = await page.screenshot({ clip });
      expect(await rise(page, resting, focused), 'keyboard focus').toBeLessThanOrEqual(ROUNDING);
    });
  }
}
