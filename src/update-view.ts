// What the update row shows for each state; no DOM access.
import type { MessageKey } from './i18n';

export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'current' }
  | { kind: 'available'; version: string; installed: boolean }
  | { kind: 'onQuit'; version: string }
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
    case 'onQuit':
      return { ...quiet, status: 'updateOnQuit', vars: { version: state.version } };
    case 'installing':
      return { ...quiet, status: 'updateInstalling', checkDisabled: true };
    case 'problem':
      return { ...quiet, status: PROBLEMS[state.code] ?? 'updateFailed' };
  }
}

interface AutomaticUpdate {
  updateFound: string | null;
  updateReady: boolean;
  portable: boolean;
}

/** What the update row shows for an update the automatic check found; null if it found none to show. */
export function automaticUpdate(state: AutomaticUpdate): UpdateState | null {
  if (state.updateFound === null) return null;
  if (state.portable) return { kind: 'available', version: state.updateFound, installed: false };
  return state.updateReady ? { kind: 'onQuit', version: state.updateFound } : null;
}

/** The portable build cannot install by itself, so the settings button points out the found update. */
export function updateDot(state: Pick<AutomaticUpdate, 'updateFound' | 'portable'>): boolean {
  return state.updateFound !== null && state.portable;
}
