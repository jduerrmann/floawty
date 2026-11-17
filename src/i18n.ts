// All visible text in English and German (AGENTS.md rule 13).
export type Language = 'en' | 'de';

const en = {
  clickThroughHint: 'Click-through is on – {hotkey} turns it off',
  clickThroughDot: 'Click-through on',
  noticeText:
    'floawty shows the services through Microsoft Edge WebView2, a part of Windows that sends diagnostic data to Microsoft. floawty itself collects nothing.',
  noticeOk: 'OK',
  tilesLabel: 'Services',
  addTile: 'Add page',
  tileName: 'Name',
  tileUrl: 'Web address',
  save: 'Save',
  cancel: 'Cancel',
  tileOptions: 'Options for {name}',
  rename: 'Rename',
  remove: 'Remove',
  nameEmpty: 'Please enter a name.',
  nameTooLong: 'The name is too long.',
  urlInvalid: 'This is not a web address.',
  urlDuplicate: 'This page already has a tile.',
};

export type MessageKey = keyof typeof en;

const de: Record<MessageKey, string> = {
  clickThroughHint: 'Durchklicken ist an – {hotkey} schaltet es aus',
  clickThroughDot: 'Durchklicken an',
  noticeText:
    'floawty zeigt die Dienste mit Microsoft Edge WebView2 an, einem Teil von Windows, der Diagnosedaten an Microsoft sendet. floawty selbst sammelt nichts.',
  noticeOk: 'OK',
  tilesLabel: 'Dienste',
  addTile: 'Seite hinzufügen',
  tileName: 'Name',
  tileUrl: 'Webadresse',
  save: 'Speichern',
  cancel: 'Abbrechen',
  tileOptions: 'Optionen für {name}',
  rename: 'Umbenennen',
  remove: 'Entfernen',
  nameEmpty: 'Bitte gib einen Namen ein.',
  nameTooLong: 'Der Name ist zu lang.',
  urlInvalid: 'Das ist keine Webadresse.',
  urlDuplicate: 'Für diese Seite gibt es schon eine Kachel.',
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
