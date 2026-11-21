---
round: 5
title: Shorts-Scrollen und TikTok
---
# Lautstärke und Spulen in „Video only“
Problem: In „Video only“ blendet floawty bei Shorts alle Knöpfe neben dem Video aus, auch YouTubes Lautstärkeregler und den Fortschrittsbalken. Man kann weder die Lautstärke einstellen noch an eine Stelle springen.
Ziel: Lautstärke und Spulen gehen in „Video only“ bei YouTube Shorts und TikTok, ohne dass die Knöpfe ständig im Bild sind.
Fertig, wenn:
- [ ] Lautsprecher-Knopf, der beim Darüberfahren einen Regler aufklappt
- [ ] Ein Balken zum Spulen
- [ ] Beides nur sichtbar, solange die Maus über dem Video ist
- [ ] Nichts überlagert floawtys eigene Leiste

Vorher: mock: block"Short füllt das Fenster" line"(keine Knöpfe)"
Nachher: mock: bar"floawty-Leiste (bei Hover)" block"Short" bar"▶  🔊━━●   ⋮"! bar"━━━━●──────"!

![YouTubes eigene Leiste, in „Video only“ wieder sichtbar (Probe im eingebauten Browser)](shots/yt-controls.jpg)

## Geändert seit Runde 4
- Shorts füllen jetzt mit YouTubes eigener Liste das Fenster; dabei waren alle Knöpfe ausgeblendet.
- Neu: dein Wunsch nach einem Lautstärkeregler. Runde 4 (Spulen) ist hier aufgegangen.
- Probe: YouTubes eigene Leiste lässt sich wieder zeigen – mit Abspielen, Lautsprecher (Regler klappt bei Hover auf) und „⋮ Mehr Aktionen“.

## Entschieden
- Shorts in „Video only“: YouTubes Liste füllt das Fenster, YouTube wischt selbst
- TikTok-Kachel mit Automodus ist aufgenommen (dein Test)

## Was ich annehme
### YouTubes Leiste sitzt oben im Video, genau unter floawtys eigener Leiste {#assume-overlap}
flow: Maus über floawty -> floawty-Leiste oben (40 px) -> YouTubes Knöpfe bei 16–64 px darunter
floawtys Leiste ist 40 px hoch (\`bar.rs\`); YouTubes Abspiel- und Lautsprecher-Knopf liegen bei y = 16–64 px. Beide erscheinen bei Hover.

## Entscheidungen
### Welcher Lautstärkeregler soll es sein? {#which-volume}
- [rec] A · YouTubes und TikToks eigener | floawty lässt ihn durch | S
    mock: bar"▶  🔊━━●   ⋮"! block"Short"
    + genau der Regler aus deinem Bild, klappt bei Hover auf
    + Lautstärke bleibt beim Dienst gespeichert
    - sieht bei YouTube und TikTok etwas verschieden aus
    Technik: Ausnahme für \`.player-controls\` in der Ausblend-Regel
- B · floawtys eigener in der Leiste | gleich für alle Dienste | M
    mock: bar"◀ 🔊━● ▶ ▣ ⚙ ✕"! block"Short"
    + gleiche Bedienung überall
    - floawty muss die Lautstärke selbst setzen und abgleichen
    - die Leiste wird noch breiter

### Wo sitzt YouTubes Leiste in „Video only“? {#where-controls}
- [rec] A · Unten, über dem Spul-Balken | nichts überlagert floawtys Leiste | S
    mock: bar"floawty-Leiste" block"Short" bar"▶  🔊━━●   ⋮"! bar"━━━●────"
    Technik: CSS setzt \`.player-controls\` an den unteren Rand
- B · Oben, wie bei YouTube | floawtys Leiste liegt bei Hover darüber | XS
    mock: bar"floawty-Leiste über ▶ 🔊"! block"Short"
    - Abspielen und Lautstärke oft verdeckt

### Soll der Spul-Balken mitkommen? {#seek-bar}
- [rec] A · Ja, YouTubes eigener | dünn unten, wird bei Hover dicker | S
    mock: block"Short" bar"━━━━●──────"!
    + YouTube entscheidet, ob man bei Werbung spulen darf
- B · Nein, nur Lautstärke | XS

## Voreinstellungen
Gilt, wenn du nicht widersprichst.
- „⋮ Mehr Aktionen“ und Abspielen kommen mit | gehören zu YouTubes Leiste {#more-actions}
- TikTok bekommt dasselbe im Paket sf-03 | TikToks eigener Regler und Balken {#tiktok}
- Eigenes Paket sf-05 für YouTube | sf-02 wird vorher committet {#package}

## Blinde Flecken
### Die Leiste blendet YouTube selbst ein und aus {#risk-hover impact=gering}
YouTube zeigt sie nur bei Hover über dem Video. Klappt das unter „Video only“ nicht zuverlässig, blendet floawty sie bei Hover über floawty ein.

## Plan-Skizze nach Freigabe
1. sf-02 abschließen: Prüfung, App-Lauf, Commit
2. sf-05: YouTubes Leiste und Spul-Balken in „Video only“, Test zuerst
3. TikToks Regler und Balken in sf-03
