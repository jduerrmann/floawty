// The app tiles: one per service, the user's own pages, and "+" to add a page.
import { invoke } from '@tauri-apps/api/core';
import { customTileDomains, type CustomTile } from './custom-tiles';
import { t, type Language } from './i18n';
import { services } from './services';
import type { ServiceManifest } from './services/manifest';
import { preferencesOf, withShortsAuto, type OverlayState } from './state';

const symbolUrls = import.meta.glob<string>('./assets/symbols/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const CUSTOM_COLOR = '#37474f';
const ADD_COLOR = '#2a2a2a';

export interface TileHandlers {
  onAdd: () => void;
  onRename: (tile: CustomTile) => void;
  onRemove: (tile: CustomTile) => void;
}

function symbolUrl(file: string): string {
  return symbolUrls[`./assets/symbols/${file}`] ?? '';
}

function openService(id: string, url: string, allowedDomains: string[]): void {
  void invoke('open_service', { service: { id, url, allowedDomains } });
}

async function turnShortsAutoOn(): Promise<void> {
  const state = await invoke<OverlayState>('overlay_state');
  await invoke('set_preferences', { preferences: withShortsAuto(preferencesOf(state)) });
}

function tileButton(label: string, color: string, symbol: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tile';
  button.style.setProperty('--tile-color', color);
  const image = document.createElement('img');
  image.src = symbolUrl(symbol);
  image.alt = '';
  const name = document.createElement('span');
  name.textContent = label;
  button.append(image, name);
  return button;
}

function serviceTile(service: ServiceManifest): HTMLLIElement {
  const item = document.createElement('li');
  const button = tileButton(service.name, service.brandColor, service.symbol);
  button.addEventListener('click', async () => {
    if (service.startsShortsAuto) await turnShortsAutoOn();
    openService(service.id, service.startUrl, service.allowedDomains);
  });
  item.append(button);
  return item;
}

function optionsMenu(language: Language, tile: CustomTile, handlers: TileHandlers): HTMLElement {
  const menu = document.createElement('div');
  menu.className = 'tile-menu';
  menu.hidden = true;
  const actions: [string, () => void][] = [
    [t(language, 'rename'), () => handlers.onRename(tile)],
    [t(language, 'remove'), () => handlers.onRemove(tile)],
  ];
  for (const [label, action] of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', action);
    menu.append(button);
  }
  return menu;
}

function customTile(language: Language, tile: CustomTile, handlers: TileHandlers): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'custom';
  const button = tileButton(tile.name, CUSTOM_COLOR, 'custom.svg');
  button.addEventListener('click', () => openService(tile.id, tile.url, customTileDomains(tile)));
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'tile-more';
  more.textContent = '⋯';
  more.setAttribute('aria-label', t(language, 'tileOptions', { name: tile.name }));
  const menu = optionsMenu(language, tile, handlers);
  more.addEventListener('click', () => (menu.hidden = !menu.hidden));
  item.append(button, more, menu);
  return item;
}

export function renderTiles(
  list: HTMLElement,
  language: Language,
  customTiles: readonly CustomTile[],
  handlers: TileHandlers,
): void {
  list.setAttribute('aria-label', t(language, 'tilesLabel'));
  const add = document.createElement('li');
  const addButton = tileButton(t(language, 'addTile'), ADD_COLOR, 'add.svg');
  addButton.classList.add('tile-add');
  addButton.addEventListener('click', handlers.onAdd);
  add.append(addButton);
  list.replaceChildren(
    ...services.map(serviceTile),
    ...customTiles.map((tile) => customTile(language, tile, handlers)),
    add,
  );
}
