import { describe, expect, it } from 'vitest';
import { t } from './i18n';
import { importMarker, problemText, readImportMarker } from './settings-transfer';

describe('problemText', () => {
  it('names each problem of a settings file in the chosen language', () => {
    expect(problemText('en', 'broken')).toBe(t('en', 'importBroken'));
    expect(problemText('de', 'notExport')).toBe(t('de', 'importNotExport'));
    expect(problemText('en', 'newerVersion')).toBe(t('en', 'importNewer'));
    expect(problemText('de', 'invalidHotkey')).toBe(t('de', 'importInvalidHotkey'));
    expect(problemText('en', 'invalidTile')).toBe(t('en', 'importInvalidTile'));
  });

  it('says the file could not be read or written for everything else', () => {
    for (const error of ['file', 'unknown', 'constructor', 7, undefined, new Error('x')]) {
      expect(problemText('en', error)).toBe(t('en', 'transferFile'));
    }
  });
});

describe('the import marker kept over the reload', () => {
  it('remembers the restart question only when the file changes graphics acceleration', () => {
    const marker = (restartNeeded: boolean, graphicsAcceleration: boolean) =>
      readImportMarker(importMarker({ restartNeeded, graphicsAcceleration }));
    expect(marker(true, false)).toEqual({ askRestart: false });
    expect(marker(true, true)).toEqual({ askRestart: true });
    expect(marker(false, true)).toEqual({ askRestart: null });
  });

  it('reads nothing from a missing or damaged entry', () => {
    for (const text of [null, '', 'x', '[]', '{}', '{"askRestart":"yes"}', 'null']) {
      expect(readImportMarker(text), String(text)).toBeNull();
    }
  });
});
