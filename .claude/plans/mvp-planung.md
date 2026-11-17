---
round: 2
title: floawty – MVP-Planung
---
# MVP-Planung
Problem: Der Stack steht, aber es gibt noch keine App, nur zwei Wegwerf-Prototypen.
Ziel: Ein erstes floawty, das du täglich nutzen kannst, als kleine Arbeitspakete geplant.
Fertig, wenn:
- [x] Umfang des MVP steht fest
- [x] Leiste, Kacheln und erster Start sind als Mockup entschieden
- [x] MVP liegt als Plan mit Paketen in der Knowledge Base

flow: floawty starten! -> Hinweis wie Cookie-Banner (1×) -> App-Kacheln mit Logos! -> Fenstermodus zum Anmelden! -> Floaty View mit Leiste
mock: col[ block"Deine Arbeit" ] col30[ line bar"◀ ◐ ⇄ ▶ ⧉ ⚙ ✕"! img"Video" ]

## Entschieden
- Umfang: Overlay, alle Kacheln, Shorts-Auto-Modus und „nur Video“; Phase 4 entfällt
- Reihenfolge: Overlay und Kacheln, dann Shorts, dann „nur Video“ (zuerst YouTube und Netflix)
- Leiste liegt über dem Video
- App-Kacheln mit mitgelieferten offiziellen Logos, eigene URLs als eigene Kachel
- Erster Start: Hinweis über den Kacheln, wie ein Cookie-Banner
- Fenstermodus ↔ Floaty View per Knopf ⧉ und Hotkey, jeder Modus merkt sich Größe und Ort
- Durchklicken: kleiner Punkt in der Ecke, anfangs mit Hinweis zum Beenden
- Hotkeys mit Strg+Alt+Umschalt, in den Einstellungen änderbar
- Vite + TypeScript ohne Framework, Fensterlogik in Rust mit Tests, npm, Einrasten, Einstellungen im Overlay
- Risiko „nur Video“: fällt eine Regel aus, zeigt floawty die normale Seite

## Plan
1. mvp-01 App-Gerüst: Tauri + Vite + TypeScript, Tests, Lint, Smoke-Test
2. mvp-02 Overlay-Fenster: Größe, Ort, Einrasten, Transparenz, Durchklicken mit Punkt, Einstellungsdatei
3. mvp-03 Fenstermodus ↔ Floaty View
4. mvp-04 App-Kacheln, eigene Kacheln, erster Start
5. mvp-05 Leiste, Einstellungen mit Hotkeys, Deutsch und Englisch
6. mvp-06 Shorts-Auto-Modus
7. mvp-07 „Nur Video“ für YouTube und Netflix, dann die anderen
8. mvp-08 Messen gegen die Budgets, Dienste-Tests
