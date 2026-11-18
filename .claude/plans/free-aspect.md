---
round: 2
title: Freies Seitenverhältnis
status: freigegeben 2026-11-18
---
# Seitenverhältnis des Overlays
Problem: Das Overlay hält immer 16:9. Ziehst du nur die Höhe, wächst die Breite mit. Ein 21:9-Film zeigt im Overlay Balken oben und unten.
Ziel: Das Overlay bekommt die Form, in der du ein Video sehen willst.
Fertig, wenn:
- [ ] Ein 21:9-Video füllt das Overlay ohne Balken
- [ ] Die Form lässt sich ohne Umweg einstellen und wird gemerkt
- [ ] Shorts drehen weiter hochkant, Budgets bleiben eingehalten

| Video im Overlay | heute | danach |
|---|---|---|
| 16:9-Video, 16:9-Overlay | füllt | füllt |
| Echter 21:9-Film, 21:9-Overlay | Overlay geht nicht | füllt |
| 16:9-Bild mit eingebrannten Balken, 21:9-Overlay | Overlay geht nicht | Zoom schneidet die Balken ab |
| 16:9-Video, 21:9-Overlay | Overlay geht nicht | Zoom schneidet oben und unten Bild ab |
| Echter 21:9-Film, 16:9-Overlay | Balken oben und unten | Balken oben und unten, nie seitlich abgeschnitten |

## Entschieden
- Form: frei ziehen, rastet bei 16:9 und 21:9 innerhalb von etwa 4 % ein (Claude gewählt, Maintainer bestätigt)
- Balken im Bild: Zoom auf die Fläche, immer automatisch, für alle Dienste
- Der Zoom schneidet nur oben und unten, nie seitlich, und wirkt nur im schwebenden Overlay
- Shorts drehen weiter hochkant, die Form wird gespeichert, der Fenstermodus bleibt frei

## Plan
1. Geometrie: freie Form mit Einrasten, Einrasten an Kanten und Shorts-Drehung für jede Form, Tests zuerst
2. Zoom-Skript für alle Dienste mit Fixture-Tests (Entwurf vorher vom advisor geprüft)
3. Live-Prüfung je Dienst mit den Konten des Maintainers, Messung, Doku, unabhängige Prüfung
