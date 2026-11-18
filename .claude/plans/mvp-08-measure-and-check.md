---
round: 2
status: freigegeben 2026-11-18 (Runde 2)
title: mvp-08 Messen und Prüfen
---
# mvp-08 – Messen und Dienste prüfen
Problem: Messung fertig, alle Budgets gehalten. Deine Prüfung zeigt: Twitch und Apple TV+ lassen sich nicht anmelden, RTL+ schickt die Amazon-Anmeldung nach draußen, dazu Scrollleiste, Passkey-Fenster und zu kleine Kacheln.
Ziel: Jeder Dienst lässt sich anmelden und spielt, ohne dass floawty im Weg ist.
Fertig, wenn:
- [x] Budgets gemessen, Netzwerk im Leerlauf offengelegt
- [ ] Twitch, Apple TV+ und RTL+ melden sich an (deine Nachprüfung)
- [ ] Gewählte Fixes und Kacheln gebaut, `npm run verify` grün
- [ ] Ergebnisnotiz mit allen Diensten

| Dienst | spielt | Anmeldung | Befund |
|---|---|---|---|
| YouTube, Shorts, Disney+ | + | + | – |
| Netflix | + | + | Scrollleiste beim Abspielen |
| Prime Video | + | + | Passkey-Fenster bei Passworteingabe |
| Crunchyroll | + | + | Größe springt zurück, kein Nur Video |
| Twitch, Apple TV+ | ? | - | Leiste verdeckt „Anmelden“ |
| RTL+ | ? | - | Amazon-Anmeldung öffnet den Standardbrowser |

## Geändert seit Runde 1
- Messung fertig: 3,3 MiB, 46 ms, 224 MB idle, 734 MB bei YouTube 1080p, CPU 0 %
- Updater-Verbindung von WebView2 bleibt und ist offengelegt (deine Wahl)

## Entschieden
- Testskript misst über den Debug-Port, Start und Leerlauf ohne Port
- Checkliste als Seite, kleine Fixes in mvp-08, größere als eigenes Paket
- Updater-Verbindung von WebView2 bleibt und wird offengelegt
- Leiste: im Fenstermodus über der Seite (Seite beginnt darunter); im Overlay nur so breit wie die Knopf-Pille, damit oben links und rechts geklickt werden kann
- Netflix: Scrollleiste nur beim Abspielen weg (eigene Regel)
- Crunchyroll: Kachel mit eigenem Symbol und Nur Video
- Prime-Passkey-Fenster: eigenes Paket zum Untersuchen
- Kacheln: immer 4 pro Reihe, wachsen mit, unter 360 px 3
- RTL+ darf amazon.de und amazon.com zum Anmelden öffnen
- Ziehst du nur die Höhe, gilt die Höhe
- Apple TV+: Nachprüfung nach dem Leisten-Fix, Kachel erst, wenn es spielt

## Plan
1. Leiste, RTL+-Domains, Größen-Fix, Kacheln
2. Netflix-Regel, Crunchyroll-Kachel mit Nur Video
3. Nachprüfung Twitch, Apple TV+, RTL+ durch den Maintainer; Apple-TV+-Kachel, wenn es spielt
4. Ergebnisnotiz, Doku, npm run verify, unabhängige Prüfung
