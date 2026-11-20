---
round: 4
title: Shorts-Scrollen und TikTok
---
# Shorts-Scrollen und TikTok – Spulen in „Video only“
Problem: In „Video only“ gibt es bei Shorts keinen Balken, um an eine Stelle im Video zu springen. YouTubes eigener Fortschrittsbalken liegt unter dem Player und ist verdeckt.
Ziel: In Shorts (und TikTok) kann man in floawty an jede Stelle des Videos springen.
Fertig, wenn:
- [ ] In „Video only“ ist bei Shorts ein Balken zum Spulen sichtbar und bedienbar
- [ ] Werbung lässt sich nicht überspringen, wenn YouTube es nicht erlaubt
- [ ] Tests, Notizen, CHANGELOG; du hast es live getestet

Vorher: mock: block"Short füllt das Fenster" line"(kein Balken)"
Nachher: mock: block"Short füllt das Fenster" bar"━━━━●──────"!

## Geändert seit Runde 3
- Mausrad bei Shorts gebaut und live geprüft; es scrollt YouTubes Liste (deine Wahl).
- Neu: dein Wunsch nach einem Spul-Balken; diese Runde klärt nur ihn.
- Fehler „Seite taucht beim Scrollen auf“ klären wir im Chat, er hängt nicht von dieser Runde ab.

## Entschieden
- Mausrad scrollt YouTubes Shorts-Liste um einen Short, beide Richtungen, nur in „Video only“
- Alles Weitere aus Runde 1–3 gilt unverändert

## Was ich annehme
### YouTube hat bei Shorts einen eigenen Spul-Balken, der in „Video only“ verdeckt ist {#assume-yt-bar}
flow: Short in „Video only“ -> Player liegt fest über der Seite -> YouTubes Balken liegt darunter, unsichtbar
Live 20.11.: `yt-progress-bar` liegt im Short außerhalb von `#shorts-player`, unter dem Video (y = 626 bei 586 px Fensterhöhe). Er gehört zu YouTube und folgt YouTubes Regeln, auch bei Werbung.

## Entscheidungen
### Welcher Balken soll das Spulen in Shorts übernehmen? {#which-bar}
- [rec] A · YouTubes eigener Balken | floawty holt ihn über das Video | S
    mock: block"Short" bar"━━━━●────── (YouTubes Balken)"!
    + YouTube entscheidet selbst, was bei Werbung geht (Grundsatz 7)
    + kein eigenes Spulen in floawty
    - sieht aus wie bei YouTube, hängt an YouTubes Seitenaufbau
    Technik: CSS hebt `yt-progress-bar` des aktiven Shorts fest an den unteren Rand, über den Player
- B · Eigener Regler in floawtys Leiste | gleich für alle Dienste | M
    mock: bar"◀ ━━●━━ ▶ ▣ ⚙ ✕"! block"Short"
    + gleiche Bedienung überall
    - floawty spult selbst und muss Werbung erkennen und sperren
    - mehr Code, Risiko für Grundsatz 7

### Wann ist der Balken zu sehen? {#when-visible}
- [rec] A · Wenn die Maus über floawty ist | wie floawtys Leiste | S
    flow: Maus über floawty -> Balken erscheint unten -> Maus weg -> nur das Video
    + das Video bleibt sonst frei
    - zum Spulen erst die Maus aufs Fenster
- B · Immer | dünne Linie am unteren Rand | S
    flow: Short läuft -> Balken immer sichtbar
    + man sieht stets, wie weit der Short ist
    - liegt dauerhaft über dem Bild

### Soll TikTok den Spul-Balken auch bekommen? {#tiktok-bar}
- [rec] A · Ja, im TikTok-Paket | auf dieselbe Art | S
    flow: TikTok in „Video only“ -> TikToks eigener Balken sichtbar
    Technik: in sf-03; vorher prüfen, ob TikToks Balken im Player liegt
- B · Nur Shorts | TikTok bleibt ohne | XS

## Voreinstellungen
Gilt, wenn du nicht widersprichst.
- Eigenes Paket sf-05 nach sf-01 | sf-01 bleibt klein und wird zuerst committet {#package}
- Bei Werbung tut floawty nichts Eigenes | YouTubes Balken bestimmt, ob man spulen kann {#ads}

## Blinde Flecken
### YouTube zeigt seinen Balken eventuell nur beim Überfahren seiner eigenen Fläche {#risk-hover impact=mittel}
Diese Fläche liegt in „Video only“ unter dem Player. Dann muss floawty den Balken selbst einblenden; das prüfe ich zuerst live.

## Plan-Skizze nach Freigabe
1. sf-01 committen (nach deinem Live-Test und der Klärung des Scroll-Fehlers)
2. sf-05: YouTubes Spul-Balken in „Video only“, Test zuerst
3. TikTok-Balken in sf-03 mitnehmen
