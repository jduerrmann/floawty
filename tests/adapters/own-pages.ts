// floawty's own pages from their sources: real markup and styles, no scripts, no app.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

const read = (file: string): string =>
  readFileSync(path.join(import.meta.dirname, '..', '..', 'src', file), 'utf8');

async function showOwnPage(page: Page, markup: string, styles: string[]): Promise<void> {
  await page.setContent(read(markup).replace(/<link[^>]*>|<script.*<\/script>/g, ''));
  for (const file of styles) await page.addStyleTag({ content: read(file) });
}

/** The home page with tiles as tiles.ts builds them for own pages. */
export async function showHome(
  page: Page,
  width: number,
  height: number,
  count: number,
): Promise<void> {
  await page.setViewportSize({ width, height });
  await showOwnPage(page, 'index.html', ['tokens.css', 'style.css', 'tiles.css', 'settings.css']);
  await page
    .locator('#tiles')
    .evaluate((list, tiles) => (list.innerHTML = tiles), TILE.repeat(count));
}

export async function showBar(page: Page): Promise<void> {
  await showOwnPage(page, 'bar.html', ['tokens.css', 'bar.css']);
}

const TILE =
  '<li><button class="tile"><span class="tile-face"><span class="tile-symbol"></span>' +
  '<span class="tile-name">Tile</span></span></button><button class="tile-more"></button></li>';
