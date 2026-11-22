---
round: 3
title: Hell/Dunkel und Hover-Effekt
---
# Hell/Dunkel und Hover-Effekt
Problem: floawty ist nur so hell oder dunkel wie Windows, und die Kacheln reagieren kaum.
Ziel: floawty hat ein eigenes Hell/Dunkel und ein lebendiges Menü.
Fertig, wenn:
- [ ] Ohne eigene Wahl folgt floawty Windows, auch live
- [ ] Hell oder Dunkel gilt sofort, auch beim Start ohne falsches Aufblitzen
- [ ] Hover erzeugt keinen Scrollbalken und schneidet nichts ab
- [ ] RAM ist in der App gemessen, im Menü und beim Video, und von dir abgenommen

| Windows steht auf | floawty: Wie Windows (Standard) | floawty: Hell | floawty: Dunkel |
|---|---|---|---|
| Hell | hell | hell | dunkel |
| Dunkel | dunkel | hell | dunkel |

## Entschieden
- Standard folgt Windows; Hell und Dunkel nur für floawty
- Dreifach-Schalter unter der Sprache: Wie Windows, Hell, Dunkel
- Gilt für Kacheln, Einstellungen und Leiste; Dienste folgen weiter Windows
- Über einem Dienst bleibt die Leiste dunkel
- Titelleiste im Fenstermodus: wie floawty
- Hover: Lichtkegel und 3D-Kippen gemischt, sanft (7°), volle Fassung
- ⋯-Knopf eigener Kacheln kippt mit
- Tab leuchtet ohne Bewegung; bei reduzierter Bewegung bleibt das Leuchten
- Tooltips der Leiste bleiben in Windows-Farbe
- „Alle Daten löschen“ stellt auf Wie Windows
- Startseite bleibt unter dem Dienst wach: Ausblenden spart am echten WebView2 nur etwa 3 MB (gestrichen am 22.11.2026)
- Scrollbalken-Fix kommt mit dem Effekt in einen App-Lauf und einen Commit

## Plan (freigegeben am 22.11.2026)
1. Paket gl-03: Hell/Dunkel, Titelleiste, Hover-Effekt
2. Review, dann App-Lauf mit Messung nach deinem Ja
