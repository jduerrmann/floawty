// All visible text in English and German (AGENTS.md rule 13).
export type Language = 'en' | 'de';

const en = {
  clickThroughHint: 'Click-through is on – {hotkey} turns it off',
  clickThroughDot: 'Click-through on',
};

export type MessageKey = keyof typeof en;

const de: Record<MessageKey, string> = {
  clickThroughHint: 'Durchklicken ist an – {hotkey} schaltet es aus',
  clickThroughDot: 'Durchklicken an',
};

export const messages: Record<Language, Record<MessageKey, string>> = { en, de };

export function pickLanguage(preferred: readonly string[]): Language {
  const first = preferred[0]?.toLowerCase() ?? '';
  return first.startsWith('de') ? 'de' : 'en';
}

export function t(
  language: Language,
  key: MessageKey,
  values: Record<string, string> = {},
): string {
  return messages[language][key].replace(
    /\{(\w+)\}/g,
    (match, name: string) => values[name] ?? match,
  );
}
