---
round: 1
title: Release 0.1.0 – der Rest
status: approved 2026-11-27
---
# Release 0.1.0 – rel-03 bis rel-08
Ziel: floawty 0.1.0 steht öffentlich auf GitHub, aktualisiert sich selbst und nimmt Einstellungen auf einen anderen PC mit.

Fertig, wenn:
- [ ] Update per Klick und automatisch ist von rc.1 auf rc.2 bewiesen
- [ ] Export, Zurücksetzen, Import bringt Einstellungen, Kacheln und Hotkeys zurück
- [ ] Ein Tag baut, prüft und veröffentlicht das Release ohne Handarbeit
- [ ] 0.1.0 startet auf frischem Windows ohne Admin

Vorher: flow: Code auf main -> Build nur lokal -> ~Release~ -> niemand kann laden
Nachher: flow: Tag v0.1.0 -> GitHub baut und prüft! -> Setup, Portable, Prüfsummen! -> Updates per Klick oder automatisch!

## Entschieden
- Zweiter Start: das offene Fenster kommt nach vorn, das zweite floawty endet ([[one-running-floawty]])
- Dafür `tauri-plugin-single-instance` (Abhängigkeit freigegeben)
- Update beim Beenden: floawty bleibt zu, der nächste Start ist die neue Version
- Portable mit gefundenem Update: Punkt am Zahnrad, Zeile in „Allgemein“
- Release-Job: erst ein sichtbarer Smoke-Test auf dem Runner, sonst lokale Prüfung des rc-Setups vor dem stabilen Tag
- Frisches Windows: Windows Sandbox mit Standardkonto per Anmeldeskript
- Reihenfolge rel-03, rel-05, rel-04, rel-06, rel-07; rel-08 nach 0.1.0
- Nach jedem Paket ein Commit nach deinem OK
- Dateidialog über `windows-sys`, keine neue Abhängigkeit
- Import ersetzt eigene Kacheln und Hotkeys ganz
- Echter Update-Schlüssel erst in rel-06; rel-03 testet mit Wegwerf-Schlüssel
- rc.1 und rc.2 erscheinen öffentlich als Pre-Release
- Risiko Schlüsselverlust: Schlüssel und Passwort in den Passwortmanager, mit Sicherung

## Plan
1. rel-03 Update per Klick, Advisor prüft den Plan vorher (Abhängigkeit, IPC)
2. rel-05 Einstellungen exportieren und importieren
3. rel-04 automatische Updates, nur ein floawty
4. rel-06 Release-Workflow; der Maintainer erzeugt den Schlüssel und legt das Secret an
5. rel-07 rc.1, rc.2, frisches Windows, Live-Checks, dann v0.1.0 auf sein Wort
6. rel-08 nach 0.1.0: Signing-Policy schreiben, der Maintainer stellt den Antrag bei SignPath
