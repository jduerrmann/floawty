---
round: 2
title: floawty – Projektplanung
---
# floawty – Projektplanung
Problem: Wer nebenbei ein Video schaut, jongliert mit Browserfenstern oder Bild-im-Bild: nicht durchsichtig, nicht durchklickbar, Shorts wischt man selbst weiter.
Ziel: Produkt und Technik sind so weit geklärt, dass Testprototyp und MVP ohne Raten gebaut werden.
Fertig, wenn:
- [x] Bedienkonzept des Overlays steht als Mockup
- [x] Dienste für das erste Release stehen fest
- [x] Testprototyp hat Messpunkte und eine Entscheidungsregel
- [ ] MVP liegt als Arbeitspakete in der Knowledge Base (nach der Auswertung des Testprototyps)

Vorher: flow: Browser öffnen -> Video suchen -> Fenster verdeckt die Arbeit -> Shorts von Hand wischen
Nachher: flow: floawty starten! -> letzter Dienst läuft -> Overlay unten rechts -> Leiste beim Drüberfahren! -> Hotkey: durchklicken
mock: col[ block"Deine Arbeit: Editor, Spiel, Mails" ] col30[ line bar"◀ · ◐ 70 % · ⇄ · ▶ Auto · ⚙ · ✕"! img"Video, 70 % sichtbar" ]

## Entschieden
- Steuerung: Leiste beim Drüberfahren (nach 300 ms) mit Dienst wechseln, Transparenz, Durchklicken, Shorts-Auto, Einstellungen, Schließen; dazu Hotkeys
- Hotkeys auf Basis Strg+Umschalt, im MVP fest
- Dienstauswahl als Kacheln im Overlay selbst
- Kleines Einstellungsfeld: Sprache, Hotkeys anzeigen, Shorts-Pause, Update-Prüfung, alle Daten löschen
- Dienste im ersten Release: alle, auch Netflix, Prime Video, Disney+
- Shorts: nächster Short nach dem ersten Durchlauf, kurze einstellbare Pause
- Durchklicken beenden: nur per Hotkey
- Ausblenden pausiert das Video
- Nur Windows 10/11, ein Overlay, Start unten rechts 480 × 270, letzter Dienst, Seitenverhältnis bleibt
- Google-Login ist Pflicht: erst ehrlich als floawty testen, bei Sperre als Chrome melden
- DRM-Modul lädt erst beim ersten DRM-Dienst, nach Hinweis
- Signatur: erst unsigniert mit Anleitung, dann SignPath Foundation
- Testprototyp: Electron und Tauri vollständig, mit Zahlen belegt

## Plan
1. Testprototyp nach `knowledge-base/plans/stack-spike/`: Messskript, Electron-Prototyp, Tauri-Prototyp
2. Auswertung als Planungsrunde mit den gemessenen Zahlen: Stack, Budgets
3. MVP als Arbeitspakete: Fenster, Leiste, Hotkeys, Dienstauswahl, Einstellungen, YouTube
4. Danach Shorts-Auto-Modus, DRM-Dienste, Release-Pipeline
