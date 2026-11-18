---
round: 1
status: beantwortet 2026-11-18 (A/A, Voreinstellungen gelten)
title: mvp-11 Grafikbeschleunigung
---
# mvp-11 – Grafikbeschleunigung abschaltbar
Problem: Streamst du Crunchyroll aus floawty über Discord, bleibt das Bild schwarz. In Edge geht es, weil dort die Grafikbeschleunigung aus ist.
Ziel: Wer es braucht, schaltet die Grafikbeschleunigung in floawty aus, wie in Edge.
Fertig, wenn:
- [ ] Eine Einstellung schaltet die Grafikbeschleunigung aus und wieder an
- [ ] Crunchyroll ist dann im Discord-Stream sichtbar
- [ ] Was es kostet, steht beim Schalter; die Budgets gelten weiter mit eingeschalteter Beschleunigung

Vorher: flow: Crunchyroll in floawty -> Discord-Stream -> schwarz
Nachher: flow: Einstellung aus! -> floawty startet neu! -> Discord-Stream zeigt das Bild!

## Was ich annehme

### Ohne Grafikbeschleunigung kostet YouTube 1080p etwa viermal so viel CPU
bars: mit Beschleunigung 0,39 % | ohne 1,63 %!
Beleg: Messung 2026-11-18, je 30 s, Anteil aller 32 Kerne; beide 1080p mit rund 63 fps, RAM ohne 611 MB statt 755 MB.

### Der Schalter wirkt erst nach einem Neustart von floawty
Beleg: Alle Webviews teilen sich eine WebView2-Umgebung, deren Startschalter (`--disable-gpu`) beim Start festliegen. floawty legt das Hauptfenster schon selbst im Setup an (`create: false`), dort kann der Schalter hinein.

## Entscheidungen

### Wie heißt der Schalter in den Einstellungen? {#name}
- [rec] A · Allgemein, wie in Edge | „Grafikbeschleunigung verwenden“ | XS
    mock: bar"Einstellungen" line"Grafikbeschleunigung verwenden"! chip"an" line"Braucht mehr CPU, DRM-Dienste evtl. schlechter"
    + eine bekannte Browser-Einstellung, kein Werkzeug zum Mitschneiden
- B · Mit Zweck | „Für Bildschirmübertragung (Discord)“ | XS
    - wirbt mit dem Teilen geschützter Inhalte, eng an Grundsatz 7

### Du schaltest um. Was passiert? {#neustart}
- [rec] A · Neustart nach Rückfrage | „floawty jetzt neu starten?“ | S
    flow: Schalter -> Rückfrage! -> Neustart -> wirkt
    + sofort wirksam, nichts vergessen
- B · Wirkt beim nächsten Start | Hinweis am Schalter | XS
    - leicht zu vergessen, dann wirkt der Schalter scheinbar nicht

## Voreinstellungen
Gilt, wenn du nicht widersprichst.
- Standard ist „an“ | wie heute, schnell und sparsam {#standard}
- Der Schalter steht nur in den Einstellungen, nicht in der Leiste | selten gebraucht {#ort}
- Die Budgets gelten mit eingeschalteter Beschleunigung | ausgeschaltet nur dokumentiert {#budget}

## Blinde Flecken

### Ohne Beschleunigung könnten Netflix, Prime oder Disney+ schlechter oder gar nicht spielen {impact=hoch}
Netflix 1080p läuft in floawty über den hardwaregeschützten Weg; das prüfst du nach dem Bau mit deinen Konten.

### Transparenz und Leiste ohne Grafikbeschleunigung sind ungeprüft {impact=mittel}
Deckkraft, Durchklicken und die durchsichtige Leiste prüfe ich vorher in einem Probelauf.

## Plan-Skizze nach Freigabe
1. Probelauf ohne Beschleunigung: Deckkraft, Leiste, Durchklicken
2. Einstellung, Startschalter für alle Webviews, Neustart; Tests zuerst
3. Deine Prüfung: Discord-Stream mit Crunchyroll, Netflix & Co. ohne Beschleunigung
4. Entscheidung, Doku, Messung, unabhängige Prüfung
