// The bar over the video: back to the tiles, opacity, click-through, Shorts, video only, zoom, mode, settings, close.
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

function offersVideoOnly(serviceId: string | null): boolean {
  return services.some((service) => service.id === serviceId && service.videoOnly);
}

// A pointer click leaves the keyboard with the page, as a browser toolbar does; keyboard users
// keep it in the bar.
function keysBack(event: MouseEvent, done: Promise<unknown>): void {
  if (event.detail > 0) void done.then(() => invoke('move_focus', { toBar: false }));
}

function wire(language: Language, current: () => OverlayState): void {
  const opacity = document.getElementById('opacity') as HTMLInputElement;
  opacity.addEventListener('input', () => {
    void invoke('set_opacity', { value: Number(opacity.value) / 100 });
  });
  const closeService = async () => {
    if (current().settingsOpen) await invoke('set_settings_open', { open: false });
    await invoke('close_service');
  };
  button('back').addEventListener('click', (event) => keysBack(event, closeService()));
  button('click-through').addEventListener('click', (event) =>
    keysBack(event, invoke('toggle_click_through')),
  );
  button('shorts').addEventListener('click', (event) => {
    const preferences = preferencesOf(current());
    const shorts = { ...preferences.shorts, auto: !preferences.shorts.auto };
    keysBack(event, invoke('set_preferences', { preferences: { ...preferences, shorts } }));
  });
  button('video-only').addEventListener('click', (event) =>
    keysBack(event, invoke('toggle_video_only')),
  );
  button('zoom').addEventListener('click', (event) => keysBack(event, invoke('toggle_zoom')));
  button('mode').addEventListener('click', (event) => keysBack(event, invoke('toggle_mode')));
  button('settings').addEventListener('click', (event) =>
    keysBack(event, invoke('set_settings_open', { open: !current().settingsOpen })),
  );
  button('quit').addEventListener('click', () => void invoke('quit'));
  label(controls, language, 'barLabel');
  label(opacity, language, 'opacity');
  const labels: [string, MessageKey][] = [
    ['back', 'backToTiles'],
    ['click-through', 'clickThroughOn'],
    ['shorts', 'shortsAuto'],
    ['video-only', 'videoOnly'],
    ['zoom', 'zoom'],
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
  const controlsMissing = state.pageProblems.includes('controls-missing');
  button('shorts').classList.toggle('problem', controlsMissing);
  label(button('shorts'), language, controlsMissing ? 'shortsProblem' : 'shortsAuto');
  const playerMissing = state.pageProblems.includes('player-missing');
  button('video-only').hidden = !offersVideoOnly(state.serviceId);
  button('video-only').setAttribute('aria-pressed', String(state.videoOnly));
  button('video-only').classList.toggle('problem', playerMissing);
  label(button('video-only'), language, playerMissing ? 'videoOnlyProblem' : 'videoOnly');
  button('zoom').hidden = state.serviceId === null;
  button('zoom').setAttribute('aria-pressed', String(state.zoom));
  label(button('mode'), language, floaty ? 'toWindowMode' : 'toFloatyView');
  button('settings').setAttribute('aria-pressed', String(state.settingsOpen));
}

let reportedWidth = 0;

// The shell sizes the bar to its controls over a service, so the page around them stays clickable.
function reportWidth(): void {
  controls.classList.add('measuring');
  const width = Math.ceil(controls.getBoundingClientRect().width);
  controls.classList.remove('measuring');
  fitControls();
  if (width === 0 || width === reportedWidth) return;
  reportedWidth = width;
  void invoke('set_bar_width', { width });
}

function fitControls(): void {
  controls.classList.remove('compact');
  controls.classList.toggle('compact', controls.scrollWidth > controls.clientWidth);
}

addEventListener('resize', fitControls);

function startBar(state: OverlayState, language: Language): StateView {
  let latest = state;
  wire(language, () => latest);
  const showClickThrough = createClickThroughIndicator(language);
  return (next) => {
    latest = next;
    showControls(language, next);
    showClickThrough(next);
    document.body.classList.toggle('docked', next.mode === 'window');
    reportWidth();
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
