import { describe, expect, it } from 'vitest';
import { messages, pickLanguage, resolveLanguage, t } from './i18n';

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

describe('resolveLanguage', () => {
  it('follows the system only when the user has not chosen', () => {
    expect(resolveLanguage('system', ['de-DE'])).toBe('de');
    expect(resolveLanguage('en', ['de-DE'])).toBe('en');
    expect(resolveLanguage('de', ['en-US'])).toBe('de');
  });

  it('has the same placeholders in both languages', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort();
    for (const key of Object.keys(messages.en) as (keyof typeof messages.en)[]) {
      expect(placeholders(messages.de[key]), key).toEqual(placeholders(messages.en[key]));
    }
  });
});
