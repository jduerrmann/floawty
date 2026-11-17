// The bar over the video: back to the tiles, opacity, click-through, Shorts, mode, settings, close.
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { createClickThroughIndicator } from './click-through';
import { t, type Language, type MessageKey } from './i18n';
import { services } from './services';
import { preferencesOf, startWithState, type OverlayState, type StateView } from './state';

const controls = document.getElementById('controls') as HTMLElement;

function button(id: string): HTMLButtonElement {
  return document.getElementById(id) as HTMLButtonElement;
}

function label(element: HTMLElement, language: Language, key: MessageKey): void {
  element.setAttribute('aria-label', t(language, key));
  element.title = t(language, key);
}

function offersShorts(serviceId: string | null): boolean {
  return services.some((service) => service.id === serviceId && service.shortsAutoMode);
}

function wire(language: Language, current: () => OverlayState): void {
  const opacity = document.getElementById('opacity') as HTMLInputElement;
  opacity.addEventListener('input', () => {
    void invoke('set_opacity', { value: Number(opacity.value) / 100 });
  });
  button('back').addEventListener('click', async () => {
    if (current().settingsOpen) await invoke('set_settings_open', { open: false });
    await invoke('close_service');
  });
  button('click-through').addEventListener('click', () => void invoke('toggle_click_through'));
  button('shorts').addEventListener('click', () => {
    const preferences = preferencesOf(current());
    const shorts = { ...preferences.shorts, auto: !preferences.shorts.auto };
    void invoke('set_preferences', { preferences: { ...preferences, shorts } });
  });
  button('mode').addEventListener('click', () => void invoke('toggle_mode'));
  button('settings').addEventListener('click', () => {
    void invoke('set_settings_open', { open: !current().settingsOpen });
  });
  button('quit').addEventListener('click', () => void invoke('quit'));
  label(controls, language, 'barLabel');
  label(opacity, language, 'opacity');
  const labels: [string, MessageKey][] = [
    ['back', 'backToTiles'],
    ['click-through', 'clickThroughOn'],
    ['shorts', 'shortsAuto'],
    ['settings', 'settings'],
    ['quit', 'quit'],
  ];
  for (const [id, key] of labels) label(button(id), language, key);
}

function showControls(language: Language, state: OverlayState): void {
  const floaty = state.mode === 'floaty';
  controls.hidden = state.clickThrough;
  button('back').hidden = state.serviceId === null;
  const opacity = document.getElementById('opacity') as HTMLInputElement;
  opacity.value = String(Math.round(state.opacity * 100));
  opacity.disabled = !floaty;
  button('click-through').disabled = !floaty;
  button('shorts').hidden = !offersShorts(state.serviceId);
  button('shorts').setAttribute('aria-pressed', String(state.shorts.auto));
  label(button('mode'), language, floaty ? 'toWindowMode' : 'toFloatyView');
  button('settings').setAttribute('aria-pressed', String(state.settingsOpen));
}

function startBar(state: OverlayState, language: Language): StateView {
  let latest = state;
  wire(language, () => latest);
  const showClickThrough = createClickThroughIndicator(language);
  return (next) => {
    latest = next;
    showControls(language, next);
    showClickThrough(next);
  };
}

// The shell shows and hides this webview; fading in on each show makes it feel less abrupt.
void listen<boolean>('bar-visible', ({ payload: visible }) => {
  document.body.dataset.visible = String(visible);
  if (!visible) return;
  controls.classList.remove('appear');
  void controls.offsetWidth;
  controls.classList.add('appear');
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'F6' || event.key === 'Escape') {
    event.preventDefault();
    void invoke('move_focus', { toBar: false });
  }
});

void startWithState(startBar);
