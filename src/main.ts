// Entry of floawty's own page: home with tiles, versions and the settings panel.
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { aboutText } from './about';
import { startHome } from './home';
import { startSettingsPanel } from './settings-panel';
import { startWithState } from './state';

async function showAbout(): Promise<void> {
  const element = document.getElementById('about');
  if (!element) return;
  const [appVersion, webviewVersion] = await Promise.all([
    getVersion(),
    invoke<string | null>('webview_version'),
  ]);
  element.textContent = aboutText({ appVersion, webviewVersion });
}

// The bar is its own webview; F6 is the usual key to move between such parts.
document.addEventListener('keydown', (event) => {
  if (event.key !== 'F6') return;
  event.preventDefault();
  void invoke('move_focus', { toBar: true });
});

void showAbout();
void startWithState((state, language) => {
  const showHome = startHome(language);
  const showPanel = startSettingsPanel(state, language);
  return (next) => {
    showHome(next);
    showPanel(next);
  };
});
