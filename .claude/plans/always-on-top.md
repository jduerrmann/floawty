---
round: 1
status: beantwortet 2026-11-20 (B/A/A/A, Voreinstellungen gelten, O-Hotkey im Chat geklärt)
title: Immer im Vordergrund – Schalter
---
# Immer im Vordergrund abschaltbar
Problem: Die Floaty-Ansicht liegt immer über allem. Manchmal stört das, und dann hilft nur Verkleinern, Verstecken oder der Fenstermodus.
Ziel: Du legst floawty mit einem Klick oder Hotkey hinter andere Fenster und holst es genauso wieder nach vorn.
Fertig, wenn:
- [ ] Ein Knopf in der Leiste und ein Hotkey schalten „immer im Vordergrund“ sichtbar aus und an
- [ ] Nach einem Neustart gilt der zuletzt gewählte Zustand (gespeichert)
- [ ] Tooltip in EN/DE, Hotkey in den Einstellungen änderbar
- [ ] Tests, Notizen, CHANGELOG nachgezogen, und du hast es live ausprobiert

Vorher: flow: floawty schwebt über dem Editor -> du klickst in den Editor -> floawty bleibt drüber -> nur Verstecken hilft
Nachher: flow: Knopf 🖈 oder Strg+Alt+Umschalt+T! -> Editor kommt beim Klick nach vorn! -> noch mal drücken -> floawty wieder vorn!

## Entschieden
- Neustart merkt sich den Zustand: neues Feld `alwaysOnTop` in settings.json, Standard `true`
- Klick-Durch hält floawty vorn, solange es an ist; danach gilt wieder der Schalter
- Nur die Floaty-Ansicht; im Fenstermodus ist der Knopf ausgegraut und der Hotkey tut nichts
- Symbol: einfarbige Pinnnadel 🖈, direkt hinter Klick-Durch
- Hotkey Strg+Alt+Umschalt+T, änderbar; Tooltip „Immer im Vordergrund“ / „Always on top“, gedrückt heißt an
- Kein eigener Hinweis, wenn der Vordergrund aus ist
- Strg+Alt+Umschalt+O: Ist der Vordergrund aus und floawty nicht das aktive Fenster, holt O es nach vorn statt es zu verstecken
- Angenommen und bestätigt: verdeckt bleibt floawty über Taskleiste und Alt+Tab erreichbar; Ausschalten wirkt beim nächsten Klick in ein anderes Fenster

## Plan
1. Paket `on-top-01` unter `knowledge-base/plans/on-top/`
2. Rust: Feld, Hotkey-Aktion, Befehl, Fensterstil; Unit-Tests zuerst
3. Leiste, Einstellungen, i18n; Playwright-Test für Knopf und Hotkey
4. `npm run verify`, Live-Check, Notizen, Entscheidung, CHANGELOG, Review durch `advisor`
