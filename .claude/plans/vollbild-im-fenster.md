---
round: 1
title: Vollbild im Fenster
status: approved 2026-11-26
---
# Vollbild füllt nur das Fenster
Problem: Klickst du in floawty den Vollbild-Knopf einer Seite, springt das Fenster auf den ganzen Bildschirm. Das Overlay ist weg, nebenher arbeiten geht nicht mehr.
Ziel: Der Vollbild-Knopf jeder Seite füllt auf Wunsch nur das floawty-Fenster.
Fertig, wenn:
- [ ] Vollbild auf YouTube, Twitch und einer eigenen URL-Kachel füllt nur das Fenster
- [ ] Größe, Position und gespeicherte Geometrie bleiben dabei unverändert
- [ ] kein sichtbares Aufblitzen auf Bildschirmgröße
- [ ] Schalter aus: echtes Vollbild wie heute

Vorher: flow: Vollbild-Knopf -> Fenster füllt den Bildschirm -> Overlay weg
Nachher: flow: Vollbild-Knopf -> Video füllt das floawty-Fenster! -> Fenster bleibt, wo es ist!

## Entschieden
- Schalter ist nach dem Installieren an.
- Gilt im Overlay und im Fenstermodus gleich (dort unter Titelleiste und floawty-Leiste).
- Schalter steht in der Karte „Allgemein“, kein Leistenknopf, kein Hotkey.
- Text: „Vollbild der Seiten bleibt im Fenster“ / „Page fullscreen stays in the window“.
- Die Hover-Leiste erscheint im Fenster-Vollbild wie sonst.
- Esc und der Knopf der Seite beenden das Vollbild.
- Aufblitzen ist relevant: Der Spike muss zeigen, dass das Fenster nie auf Bildschirmgröße geht.

## Plan
1. Spike: eigener Vollbild-Handler, Aufblitzen und Geometrie prüfen
2. Einstellung speichern (Standard an), Schalter in „Allgemein“, EN und DE
3. Handler: Schalter an hält das Fenster, aus lässt echtes Vollbild zu
4. Verdeckter App-Test mit einer Testseite, die Vollbild anfordert
5. Tech-Notiz, Entscheidung, CHANGELOG, unabhängiges Review
