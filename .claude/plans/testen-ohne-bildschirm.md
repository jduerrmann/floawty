---
round: 4
title: Testen ohne deinen Bildschirm
---
# Testen ohne deinen Bildschirm
Problem: Jeder App-Test übernimmt Maus, Tastatur und Bildschirm und braucht dein Ja.
Ziel: Die App-Tests laufen lokal und unsichtbar, ohne Push, Neustart, Installation oder neue Lizenz.
Fertig, wenn:
- [ ] 45 der 48 App-Tests laufen unsichtbar, dreimal hintereinander grün
- [ ] Claude startet sie ohne Rückfrage und sagt Bescheid
- [ ] Ein Stopp beendet den Lauf restlos
- [ ] Die ausgelieferte Exe enthält keinen Test-Haken
- [ ] Kein Test fällt weg, `verify` prüft weiter alles

Vorher: flow: Änderung -> dein Ja -> 48 Tests mit deiner Maus -> Ergebnis
Nachher: flow: Änderung -> 45 Tests unsichtbar, lokal! -> Ergebnis -> vor Releases 3 Tests sichtbar, 20 s

| Tests | Anzahl | Weg | Grundlage |
|---|---:|---|---|
| ohne echte Eingabe | 35 | unsichtbarer Desktop, echte Exe | mit WebView2 erprobt |
| globale Hotkeys | 2 | Hotkey als Fenster-Nachricht, echte Exe | erprobt |
| Hover-Leiste, Anmelde-Fenster | 8 | Klick als Fenster-Nachricht, Test-Build | Klick erprobt, Test-Build offen |
| Ziehen, Vorschlagsliste, Vordergrund | 3 | Ersatztest je Paket, echt vor Releases | unsichtbar nicht möglich oder nicht belegt |

## Geändert seit Runde 3
- Deine Frage: auch die 15 Maus-Tests lokal, ohne Push.
- Erprobt: Klick, Tippen und Hotkeys gehen per Fenster-Nachricht.
- Korrigiert: 2 der 15 brauchten die Maus nur beim Aufräumen.

## Entschieden
- Keine neue Windows-Lizenz
- Läufe ohne deinen Bildschirm starten ohne Frage, mit Ansage
- Ein fehlgeschlagener Testklick nennt seine Ursache
- Ein App-Lauf gleichzeitig
- gl-05 wartet auf die Testumgebung

## Plan (wartet auf Freigabe)
1. Probelauf mit floawty: die 35 Tests unverändert auf dem unsichtbaren Desktop
2. Starter und Helfer für Klick, Tippen, Hotkey, Tests zuerst
3. Test-Build: Cargo-Feature nur für Zeiger und Vordergrund, ein Test beweist, dass die Release-Exe ihn nicht enthält
4. Dreimal 45 grün, sonst melden statt weiterbasteln
5. Regel 10, Entscheidung, unabhängiges Review
6. gl-05 abschließen, RAM als Vergleich zum Vorgänger

## Falls die drei auch unsichtbar sein sollen
Windows Sandbox mit einmaligem Einschalten. Ob ihr Fenster unsichtbar bleiben kann, ist ungeprüft.
