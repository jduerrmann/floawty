import { describe, expect, it } from 'vitest';
import { messages, pickLanguage, t } from './i18n';

describe('i18n', () => {
  it('has every English text in German too', () => {
    const english = Object.keys(messages.en).sort();
    expect(Object.keys(messages.de).sort()).toEqual(english);
  });

  it('uses German for German systems and English otherwise', () => {
    expect(pickLanguage(['de-AT', 'en'])).toBe('de');
    expect(pickLanguage(['fr-FR'])).toBe('en');
    expect(pickLanguage([])).toBe('en');
  });

  it('fills placeholders', () => {
    expect(t('en', 'clickThroughHint', { hotkey: 'Ctrl+Alt+Shift+D' })).toContain(
      'Ctrl+Alt+Shift+D',
    );
  });
});
