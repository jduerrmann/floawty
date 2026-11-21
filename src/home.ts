// floawty's home page: the WebView2 notice, the tiles and the form for own pages.
import { invoke } from '@tauri-apps/api/core';
import { createCustomTile, type CustomTile } from './custom-tiles';
import { t, type Language } from './i18n';
import { renderTiles } from './tiles';

interface TilesState {
  noticeAccepted: boolean;
  customTiles: CustomTile[];
}

function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function showNotice(language: Language, accepted: boolean): void {
  const notice = element('notice');
  notice.hidden = accepted;
  element('notice-text').textContent = t(language, 'noticeText');
  const ok = element<HTMLButtonElement>('notice-ok');
  ok.textContent = t(language, 'noticeOk');
  ok.onclick = () => {
    notice.hidden = true;
    void invoke('accept_notice');
  };
}

function labelForm(language: Language): void {
  element('tile-name-label').textContent = t(language, 'tileName');
  element('tile-url-label').textContent = t(language, 'tileUrl');
  element('tile-save').textContent = t(language, 'save');
  element('tile-cancel').textContent = t(language, 'cancel');
}

export async function startHome(language: Language): Promise<void> {
  const state = await invoke<TilesState>('tiles_state');
  let tiles = state.customTiles;
  const list = element('tiles');
  const form = element<HTMLFormElement>('tile-form');
  const name = element<HTMLInputElement>('tile-name');
  const url = element<HTMLInputElement>('tile-url');
  const error = element('tile-error');
  let renaming: CustomTile | null = null;

  const save = (next: CustomTile[]) => {
    tiles = next;
    void invoke('set_custom_tiles', { tiles });
    render();
  };
  const openForm = (tile: CustomTile | null) => {
    renaming = tile;
    name.value = tile?.name ?? '';
    url.value = tile?.url ?? '';
    url.disabled = tile !== null;
    error.textContent = '';
    form.hidden = false;
    name.focus();
    form.scrollIntoView({ block: 'end' });
  };
  const render = () =>
    renderTiles(list, language, tiles, {
      onAdd: () => openForm(null),
      onRename: (tile) => openForm(tile),
      onRemove: (tile) => save(tiles.filter((other) => other.id !== tile.id)),
    });

  form.onsubmit = (event) => {
    event.preventDefault();
    const others = tiles.filter((tile) => tile.id !== renaming?.id);
    const result = createCustomTile(name.value, url.value, others);
    if (!result.ok) {
      error.textContent = t(language, result.problem);
      return;
    }
    const tile = renaming ? { ...renaming, name: result.tile.name } : result.tile;
    form.hidden = true;
    save(renaming ? tiles.map((other) => (other.id === tile.id ? tile : other)) : [...tiles, tile]);
  };
  element('tile-cancel').onclick = () => (form.hidden = true);

  showNotice(language, state.noticeAccepted);
  labelForm(language);
  render();
}
