---
round: 1
title: mvp-07 Nur Video
status: freigegeben 2026-11-18
---
# mvp-07 – „Nur Video“
Problem: Im kleinen Overlay zeigt YouTube Kopfzeile, Vorschläge und Kommentare; das Video ist nur ein Ausschnitt. Bei Twitch nehmen Chat und Seitenleiste Platz weg.
Ziel: Mit einem Schalter füllt das Video das Overlay, die Steuerung des Dienstes bleibt bedienbar.
Fertig, wenn:
- [ ] YouTube-Video füllt das Overlay, Kopf, Vorschläge und Kommentare sind weg
- [ ] Twitch-Stream füllt das Overlay, Chat und Seitenleiste sind weg
- [ ] Shorts: Like-, Kommentar- und Weiter-Leiste unsichtbar, die Automatik wischt weiter
- [ ] Umschalten per Knopf ▣ oder Strg+Alt+Umschalt+V ohne Neuladen, Play/Pause/Lautstärke des Dienstes gehen weiter
- [ ] Im Fenstermodus erscheint die ganze Seite, zurück im Overlay wieder nur das Video
- [ ] Findet floawty den Player nicht, bleibt die Seite normal, mit Warnpunkt am ▣
- [ ] Netflix, Prime Video, Disney+, RTL+ live geprüft: Wiedergabe zeigt schon nur den Player

Vorher: mock: bar"YouTube-Kopf" col65[ block"Video" line"Titel" line"Kommentare" ] col[ line"Vorschläge" line line line ]
Nachher: mock: block"Video füllt das Overlay"! line"Steuerung des Dienstes"

## Entschieden
- Ansatz: floawty legt den Player per CSS über die Seite; das Vollbild des Dienstes nimmt den ganzen Bildschirm (Test des Maintainers) und scheidet aus
- Verdecken von Werbeflächen neben dem Video ist kein Blockieren (Maintainer); Werbung im Player bleibt unberührt
- Eigene Regeln nur für YouTube und Twitch; Netflix, Prime Video, Disney+, RTL+ zeigen beim Abspielen schon nur den Player (live prüfen)
- Fenstermodus zeigt die ganze Seite; Nur Video gilt nur im schwebenden Overlay
- Schalten per Knopf ▣ in der Leiste und Hotkey Strg+Alt+Umschalt+V, änderbar
- Shorts: Like-, Kommentar- und Weiter-Leiste werden unsichtbar, aber nicht entfernt, damit die Automatik weiter klicken kann
- Ohne Player (Startseite, Suche) bleibt die Seite normal
- Scrollen ist gesperrt, solange Nur Video wirkt
- Anderes Seitenverhältnis gibt schwarze Ränder, das Overlay behält seine Größe
- Ein gespeicherter Schalter für alle Dienste
- Fehlt der Player: normale Seite, Warnpunkt am ▣, eine Log-Zeile ohne URL; Seitenumbauten werden per Fix nachgezogen

## Plan
1. Fixtures (YouTube Watch, Shorts, Twitch, ohne Player) und Playwright-Adapter-Tests zuerst
2. Seitenskript: CSS-Klasse über `__floawty.sync` (`videoOnly` in der Eingabe, `player-missing` im Status), Selektoren je Dienst
3. Rust: Einstellung `videoOnly`, nur im Overlay aktiv, Hotkey, Warnpunkt
4. Knopf ▣ in der Leiste, Hotkey-Liste, EN/DE, Doku, CHANGELOG
5. Twitch als eigener kleiner Schritt
6. `npm run verify`, Live-Prüfung Netflix, Prime, Disney+, RTL+ soweit ohne Konto möglich, unabhängige Prüfung, Live-Test des Maintainers
