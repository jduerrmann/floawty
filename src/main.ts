// Entry of floawty's own UI; for now it only shows which versions are running.
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { aboutText } from './about';

async function showAbout(): Promise<void> {
  const element = document.getElementById('about');
  if (!element) return;
  const [appVersion, webviewVersion] = await Promise.all([
    getVersion(),
    invoke<string | null>('webview_version'),
  ]);
  element.textContent = aboutText({ appVersion, webviewVersion });
}

void showAbout();
