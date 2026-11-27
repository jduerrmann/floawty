// What the update row shows for each state; no DOM access.
import type { MessageKey } from './i18n';

export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'current' }
  | { kind: 'available'; version: string; installed: boolean }
  | { kind: 'installing' }
  | { kind: 'problem'; code: string };

export interface UpdateView {
  status: MessageKey | null;
  vars: Record<string, string>;
  showInstall: boolean;
  showReleasePage: boolean;
  checkDisabled: boolean;
}

const PROBLEMS: Record<string, MessageKey> = {
  offline: 'updateOffline',
  unavailable: 'updateUnavailable',
  signature: 'updateSignature',
};

const quiet: UpdateView = {
  status: null,
  vars: {},
  showInstall: false,
  showReleasePage: false,
  checkDisabled: false,
};

export function updateView(state: UpdateState): UpdateView {
  switch (state.kind) {
    case 'idle':
      return quiet;
    case 'checking':
      return { ...quiet, status: 'updateChecking', checkDisabled: true };
    case 'current':
      return { ...quiet, status: 'updateCurrent' };
    case 'available':
      return {
        ...quiet,
        status: 'updateAvailable',
        vars: { version: state.version },
        showInstall: state.installed,
        showReleasePage: !state.installed,
      };
    case 'installing':
      return { ...quiet, status: 'updateInstalling', checkDisabled: true };
    case 'problem':
      return { ...quiet, status: PROBLEMS[state.code] ?? 'updateFailed' };
  }
}
