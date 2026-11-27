// Export and import of the settings file: the shell asks for the file, checks and applies it.
import { invoke } from '@tauri-apps/api/core';
import { t, type Language, type MessageKey } from './i18n';

const TEXTS: [string, MessageKey][] = [
  ['transfer-explain', 'transferExplain'],
  ['export-settings', 'exportSettings'],
  ['import-settings', 'importSettings'],
  ['import-question', 'importQuestion'],
  ['import-no', 'cancel'],
  ['import-yes', 'importConfirm'],
];

// The shell's error codes for a refused file.
const PROBLEMS = new Map<string, MessageKey>([
  ['broken', 'importBroken'],
  ['notExport', 'importNotExport'],
  ['newerVersion', 'importNewer'],
  ['invalidHotkey', 'importInvalidHotkey'],
  ['invalidTile', 'importInvalidTile'],
]);

// An import reloads the page; this entry carries what the new page still has to show.
const IMPORTED_KEY = 'floawty-imported';

export interface ImportPreview {
  restartNeeded: boolean;
  graphicsAcceleration: boolean;
}

interface ImportMarker {
  /** The file's graphics acceleration while the restart question is open, else null. */
  askRestart: boolean | null;
}

function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function problemText(language: Language, error: unknown): string {
  return t(language, PROBLEMS.get(String(error)) ?? 'transferFile');
}

export function importMarker(preview: ImportPreview): string {
  const askRestart = preview.restartNeeded ? preview.graphicsAcceleration : null;
  return JSON.stringify({ askRestart } satisfies ImportMarker);
}

export function readImportMarker(text: string | null): ImportMarker | null {
  if (!text) return null;
  try {
    const { askRestart } = JSON.parse(text) as Partial<ImportMarker>;
    return askRestart === null || typeof askRestart === 'boolean' ? { askRestart } : null;
  } catch {
    return null;
  }
}

function takeMarker(): ImportMarker | null {
  try {
    const marker = readImportMarker(sessionStorage.getItem(IMPORTED_KEY));
    sessionStorage.removeItem(IMPORTED_KEY);
    return marker;
  } catch {
    return null;
  }
}

function storeMarker(marker: string | null): void {
  try {
    if (marker === null) sessionStorage.removeItem(IMPORTED_KEY);
    else sessionStorage.setItem(IMPORTED_KEY, marker);
  } catch {
    // Without storage the page still reloads; it only misses the note.
  }
}

/**
 * `askRestart` shows the restart question with the file's graphics acceleration choice.
 * Returns what the panel runs once after its first view, when the page follows an import.
 */
export function startSettingsTransfer(
  language: Language,
  askRestart: (graphicsAcceleration: boolean) => void,
): () => void {
  for (const [id, key] of TEXTS) element(id).textContent = t(language, key);
  const status = element('transfer-status');
  const confirm = element('import-confirm');
  const fail = (error: unknown) => void (status.textContent = problemText(language, error));

  element('export-settings').addEventListener('click', () => {
    status.textContent = '';
    void invoke<boolean>('export_settings_file').then((saved) => {
      if (saved) status.textContent = t(language, 'exportDone');
    }, fail);
  });
  element('import-settings').addEventListener('click', () => {
    status.textContent = '';
    confirm.hidden = true;
    void invoke<ImportPreview | null>('import_settings_file').then((checked) => {
      confirm.hidden = !checked;
      if (checked) element('import-no').focus();
    }, fail);
  });
  element('import-no').addEventListener('click', () => {
    confirm.hidden = true;
    void invoke('discard_import');
    element('import-settings').focus();
  });
  element('import-yes').addEventListener('click', () => {
    confirm.hidden = true;
    // The new page learns from this entry; the import may change the language and reload at once.
    void invoke<ImportPreview>('pending_import')
      .then((preview) => {
        storeMarker(importMarker(preview));
        return invoke('apply_import');
      })
      .then(
        () => location.reload(),
        (error: unknown) => {
          storeMarker(null);
          fail(error);
        },
      );
  });

  let after = takeMarker();
  return () => {
    if (!after) return;
    status.textContent = t(language, 'importDone');
    if (typeof after.askRestart === 'boolean') askRestart(after.askRestart);
    after = null;
  };
}
