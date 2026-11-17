// Entry of floawty's own UI: versions for now, and the click-through indicator.
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { aboutText } from './about';
import { createClickThroughIndicator, type OverlayState } from './click-through';
import { pickLanguage } from './i18n';

const language = pickLanguage(navigator.languages);

async function showAbout(): Promise<void> {
  const element = document.getElementById('about');
  if (!element) return;
  const [appVersion, webviewVersion] = await Promise.all([
    getVersion(),
    invoke<string | null>('webview_version'),
  ]);
  element.textContent = aboutText({ appVersion, webviewVersion });
}

async function followOverlayState(): Promise<void> {
  const showClickThrough = createClickThroughIndicator(language);
  showClickThrough(await invoke<OverlayState>('overlay_state'));
  await listen<OverlayState>('overlay-state', (event) => showClickThrough(event.payload));
}

document.documentElement.lang = language;
void showAbout();
void followOverlayState();
