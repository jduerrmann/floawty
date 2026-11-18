---
round: 3
title: mvp-06 Shorts-Auto-Modus
status: freigegeben 2026-11-17
---
# mvp-06 – Shorts-Auto-Modus
Problem: Shorts laufen in floawty in Endlosschleife. Wer nebenbei arbeitet, muss zum Weiterwischen jedes Mal ins Overlay greifen.
Ziel: Mit ▶ an läuft jeder Short einmal ganz durch, dann kommt nach kurzer Pause der nächste – im Hochformat und ohne Werbung zu überspringen.
Fertig, wenn:
- [ ] 10 Shorts hintereinander laufen je genau einmal, dann geht es weiter
- [ ] Werbung zwischen Shorts läuft einmal ganz und wird nie übersprungen
- [ ] Maus über floawty hält die Automatik an, weiter geht es am Ende des Durchlaufs
- [ ] Ändert YouTube die Seite, bleibt sie normal bedienbar, mit Warnpunkt am ▶
- [ ] Hochkant-Größe in den Einstellungen: „eine Größe, gedreht“ oder „zwei Größen getrennt“

Nachher: flow: Short oder Werbung läuft -> einmal durch -> 1 s Anfangsbild -> YouTubes „Nächstes Video“ -> Overlay bleibt hochkant

## Entschieden
- Werbe-Short läuft einmal ganz, dann weiter; Werbung direkt überspringen nein (Grundprinzip 7)
- Werbung läuft im selben Player und springt wie ein Short an den Anfang; die URL bleibt dabei stehen
- Weiter über YouTubes Knopf „Nächstes Video“ (`#navigation-button-down`), Ende am Rücksprung erkannt
- Hochformat: Seiten tauschen (480 × 270 → 270 × 480), bei jedem Short, auch mit ▶ aus; im Fenstermodus keine Änderung
- Hochkant-Größe als Einstellung mit zwei Modi, Standard „eine Größe, gedreht“
- Eingerastet bleibt beim Drehen die Ecke, frei schwebend die Mitte
- Maus weg: weiter am Ende des laufenden Durchlaufs; „Bei Maus anhalten“ ist abschaltbar (Standard an); im Durchklick-Modus hält die Maus nichts an
- Während der Pause steht der Short auf dem Anfangsbild; selbst gewischt beginnt der Durchlauf neu; pausiertes Video springt nie; ▶ mitten im Short wirkt an dessen Ende
- Auf normalen YouTube-Videos tut ▶ nichts
- Fehler: Warnpunkt am ▶ in der Leiste, eine Log-Zeile ohne URL
- Kanal: Seitentitel-Ereignis weckt floawty (Titel verworfen), floawty fragt das Seitenskript ab; youtube.com bekommt keine IPC (Advisor gestützt)
- Seitenskript generisch per Dienst-ID aus dem Build, ohne YouTube-Sonderfall im Kern
- Gleich nach dem Öffnen: Klappt das Weiter nicht, wartet floawty auf deinen ersten Klick in der Seite
- Werbe-Check ohne Anmeldung macht Claude, der Maintainer hat Premium

## Plan
1. Zustandsmaschine mit Tests zuerst
2. Seitenskript, Selektoren, Fixtures, Build als IIFE je Dienst
3. Rust: Einbindung per ID, Titel-Wecker, Abfrage, Hochformat und Rückweg
4. Einstellungen (Bei Maus anhalten, Hochkant-Größe), Warnpunkt, EN/DE, Doku, CHANGELOG
5. `npm run verify`, Werbe-Check ohne Anmeldung, unabhängige Prüfung, Live-Test des Maintainers
