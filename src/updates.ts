// The update row in the settings: shows the version and checks, installs or opens the release page.
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { t, type Language } from './i18n';
import { updateView, type UpdateState } from './update-view';

interface UpdateCheck {
  current: string;
  latest: string | null;
  installed: boolean;
}

function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function startUpdates(language: Language): void {
  const show = (state: UpdateState) => {
    const view = updateView(state);
    element('update-status').textContent = view.status ? t(language, view.status, view.vars) : '';
    element<HTMLButtonElement>('update-check-now').disabled = view.checkDisabled;
    element('update-install').hidden = !view.showInstall;
    element('update-release-page').hidden = !view.showReleasePage;
  };
  const showVersion = (version: string) => {
    element('update-version').textContent = t(language, 'updateVersion', { version });
  };
  const fail = (error: unknown) => show({ kind: 'problem', code: String(error) });

  element('update-check-now').textContent = t(language, 'updateCheckNow');
  element('update-install').textContent = t(language, 'updateInstall');
  element('update-release-page').textContent = t(language, 'updateReleasePage');
  void getVersion().then(showVersion, () => undefined);
  show({ kind: 'idle' });

  element('update-check-now').addEventListener('click', () => {
    show({ kind: 'checking' });
    invoke<UpdateCheck>('check_for_update').then((result) => {
      showVersion(result.current);
      show(
        result.latest === null
          ? { kind: 'current' }
          : { kind: 'available', version: result.latest, installed: result.installed },
      );
    }, fail);
  });
  element('update-install').addEventListener('click', () => {
    show({ kind: 'installing' });
    invoke('install_update').catch(fail);
  });
  element('update-release-page').addEventListener('click', () => {
    void invoke('open_release_page');
  });
}
