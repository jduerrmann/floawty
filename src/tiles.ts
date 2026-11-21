// The app tiles: one per service, the user's own pages, and "+" to add a page.
import { invoke } from '@tauri-apps/api/core';
import { customTileDomains, type CustomTile } from './custom-tiles';
import { t, type Language } from './i18n';
import moreIcon from './assets/icons/more.svg?url';
import { services } from './services';
import type { ServiceManifest } from './services/manifest';
import { preferencesOf, withShortsAuto, type OverlayState } from './state';
import { CUSTOM_COLOR, labelShade } from './tile-colors';

const symbolUrls = import.meta.glob<string>(['./assets/logos/*.svg', './assets/symbols/*.svg'], {
  eager: true,
  query: '?url',
  import: 'default',
});

export interface TileHandlers {
  onAdd: () => void;
  onRename: (tile: CustomTile) => void;
  onRemove: (tile: CustomTile) => void;
}

function symbolUrl(file: string): string {
  return symbolUrls[`./assets/${file}`] ?? '';
}

function openService(
  id: string,
  url: string,
  allowedDomains: string[],
  signInHosts: readonly string[] = [],
): void {
  void invoke('open_service', { service: { id, url, allowedDomains, signInHosts } });
}

async function turnShortsAutoOn(): Promise<void> {
  const state = await invoke<OverlayState>('overlay_state');
  await invoke('set_preferences', { preferences: withShortsAuto(preferencesOf(state)) });
}

function tileButton(label: string, color: string | null, symbol: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tile';
  if (color) {
    button.style.setProperty('--tint', color);
    button.style.setProperty('--shade', labelShade(color));
  }
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
    openService(service.id, service.startUrl, service.allowedDomains, service.signInHosts);
  });
  item.append(button);
  return item;
}

function optionsMenu(language: Language, tile: CustomTile, handlers: TileHandlers): HTMLElement {
  const menu = document.createElement('div');
  menu.className = 'tile-menu';
  menu.popover = 'auto';
  const actions: [string, () => void][] = [
    [t(language, 'rename'), () => handlers.onRename(tile)],
    [t(language, 'remove'), () => handlers.onRemove(tile)],
  ];
  for (const [label, action] of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {
      menu.hidePopover();
      action();
    });
    menu.append(button);
  }
  return menu;
}

const MENU_GAP = 4;

// Below the ⋯ button, right-aligned to it, flipped or shifted to stay inside the window.
function placeMenu(menu: HTMLElement, anchor: HTMLElement): void {
  const button = anchor.getBoundingClientRect();
  const { width, height } = menu.getBoundingClientRect();
  const maxLeft = innerWidth - width - MENU_GAP;
  const left = Math.max(MENU_GAP, Math.min(button.right - width, maxLeft));
  const below = button.bottom + MENU_GAP;
  const top = below + height <= innerHeight ? below : button.top - height - MENU_GAP;
  menu.style.left = `${left}px`;
  menu.style.top = `${Math.max(MENU_GAP, top)}px`;
}

function customTile(language: Language, tile: CustomTile, handlers: TileHandlers): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'custom';
  const button = tileButton(tile.name, CUSTOM_COLOR, 'symbols/custom.svg');
  button.addEventListener('click', () => openService(tile.id, tile.url, customTileDomains(tile)));
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'tile-more';
  const dots = document.createElement('img');
  dots.src = moreIcon;
  dots.alt = '';
  more.append(dots);
  more.setAttribute('aria-label', t(language, 'tileOptions', { name: tile.name }));
  const menu = optionsMenu(language, tile, handlers);
  more.popoverTargetElement = menu;
  // The toggle event comes a task later; until it is placed the open menu stays invisible.
  menu.addEventListener('beforetoggle', (event) => {
    if ((event as ToggleEvent).newState === 'open') menu.dataset.placing = '';
  });
  menu.addEventListener('toggle', (event) => {
    if ((event as ToggleEvent).newState !== 'open') return;
    placeMenu(menu, more);
    delete menu.dataset.placing;
  });
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
  const addButton = tileButton(t(language, 'addTile'), null, 'symbols/add.svg');
  addButton.classList.add('tile-add');
  addButton.addEventListener('click', handlers.onAdd);
  add.append(addButton);
  list.replaceChildren(
    ...services.map(serviceTile),
    ...customTiles.map((tile) => customTile(language, tile, handlers)),
    add,
  );
}
