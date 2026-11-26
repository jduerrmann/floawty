// The app tiles: one per service, the user's own pages, and "+" to add a page.
import { invoke } from '@tauri-apps/api/core';
import { customTileDomains, type CustomTile } from './custom-tiles';
import { t, type Language } from './i18n';
import moreIcon from './assets/icons/more.svg?url';
import { services } from './services';
import type { ServiceManifest } from './services/manifest';
import { preferencesOf, withShortsAuto, type OverlayState } from './state';
import { CUSTOM_COLOR, labelShade } from './tile-colors';
import { tiltStyle } from './tilt';

const symbolUrls = import.meta.glob<string>(['./assets/logos/*.svg', './assets/symbols/*.svg'], {
  eager: true,
  query: '?url',
  import: 'default',
});

export interface TileHandlers {
  /** Decides whether a click opens: `open` runs only while no tile is opening. */
  onOpen: (id: string, open: () => Promise<unknown>) => void;
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
): Promise<unknown> {
  return invoke('open_service', { service: { id, url, allowedDomains, signInHosts } });
}

async function turnShortsAutoOn(): Promise<void> {
  const state = await invoke<OverlayState>('overlay_state');
  await invoke('set_preferences', { preferences: withShortsAuto(preferencesOf(state)) });
}

// Without a file the symbol is a mask in the text colour ("+"), so it follows the theme.
function tileSymbol(file: string | null): HTMLElement {
  if (!file) {
    const mask = document.createElement('span');
    mask.className = 'tile-symbol';
    return mask;
  }
  const image = document.createElement('img');
  image.className = 'tile-symbol';
  image.src = symbolUrl(file);
  image.alt = '';
  return image;
}

// The button stays still and only its face tilts, so the edge keeps hover and click.
function tileButton(label: string, color: string | null, symbol: string | null): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tile';
  if (color) {
    button.style.setProperty('--tint', color);
    button.style.setProperty('--shade', labelShade(color));
  }
  const face = document.createElement('span');
  face.className = 'tile-face';
  const name = document.createElement('span');
  name.className = 'tile-name';
  name.textContent = label;
  face.append(tileSymbol(symbol), name);
  button.append(face);
  return button;
}

// The light and the tilt follow the pointer; tiles.css draws them only while it is over the tile.
function followPointer(item: HTMLLIElement): void {
  item.addEventListener('pointermove', (event) => {
    if ((event.target as Element).closest('.tile-menu')) return;
    const box = item.getBoundingClientRect();
    const pointer = {
      x: (event.clientX - box.left) / box.width,
      y: (event.clientY - box.top) / box.height,
    };
    for (const [name, value] of Object.entries(tiltStyle(pointer, box))) {
      item.style.setProperty(name, value);
    }
  });
}

function serviceTile(service: ServiceManifest, handlers: TileHandlers): HTMLLIElement {
  const item = document.createElement('li');
  item.dataset.tile = service.id;
  const button = tileButton(service.name, service.brandColor, service.symbol);
  button.addEventListener('click', () =>
    handlers.onOpen(service.id, async () => {
      if (service.startsShortsAuto) await turnShortsAutoOn();
      await openService(service.id, service.startUrl, service.allowedDomains, service.signInHosts);
    }),
  );
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
  item.dataset.tile = tile.id;
  const button = tileButton(tile.name, CUSTOM_COLOR, 'symbols/custom.svg');
  button.addEventListener('click', () =>
    handlers.onOpen(tile.id, () => openService(tile.id, tile.url, customTileDomains(tile))),
  );
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
  const addButton = tileButton(t(language, 'addTile'), null, null);
  addButton.classList.add('tile-add');
  addButton.addEventListener('click', handlers.onAdd);
  add.append(addButton);
  const items = [
    ...services.map((service) => serviceTile(service, handlers)),
    ...customTiles.map((tile) => customTile(language, tile, handlers)),
    add,
  ];
  items.forEach(followPointer);
  list.replaceChildren(...items);
}

/** Marks the tile whose service opens, or none; the others step back meanwhile. */
export function showOpening(list: HTMLElement, language: Language, id: string | null): void {
  list.toggleAttribute('data-opening', id !== null);
  // Renaming or removing the opening tile would leave a mark on nothing, by keyboard too.
  for (const more of list.querySelectorAll<HTMLButtonElement>('.tile-more'))
    more.disabled = id !== null;
  for (const item of list.querySelectorAll<HTMLLIElement>('li')) {
    const button = item.querySelector<HTMLButtonElement>('.tile');
    if (!button) continue;
    const busy = item.querySelector('.tile-busy');
    if (id !== null && item.dataset.tile === id) {
      if (!busy) markBusy(language, item, button);
    } else if (busy) {
      button.removeAttribute('aria-busy');
      button.removeAttribute('aria-describedby');
      item.querySelector('.tile-busy-text')?.remove();
      busy.remove();
    }
  }
}

// The ring is decoration; screen readers get the busy state and a hidden description.
function markBusy(language: Language, item: HTMLLIElement, button: HTMLButtonElement): void {
  const ring = document.createElement('span');
  ring.className = 'tile-busy';
  ring.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  text.className = 'tile-busy-text';
  text.id = `opening-${item.dataset.tile ?? ''}`;
  text.hidden = true;
  const name = button.querySelector('.tile-name')?.textContent ?? '';
  text.textContent = t(language, 'tileOpening', { name });
  button.querySelector('.tile-face')?.append(ring);
  item.append(text);
  button.setAttribute('aria-busy', 'true');
  button.setAttribute('aria-describedby', text.id);
}
