---
round: 2
status: beantwortet 2026-11-20 (Runden 1–2, Export ohne Anmeldungen im Chat geklärt)
title: Phase 3 – Release-Pipeline
---
# Phase 3 – Release-Pipeline
Problem: floawty läuft nur auf deinem Rechner. Es gibt keinen Download, kein CI und keine Update-Prüfung.
Ziel: Jeder lädt floawty von GitHub Releases, startet es ohne Adminrechte, kann den Download prüfen und bekommt Updates bequem, wenn er will.
Fertig, wenn:
- [ ] Ein Tag `v0.1.0` baut auf GitHub Portable, Installer und Prüfsummen
- [ ] Beide starten auf einem frischen Windows ohne Adminrechte
- [ ] Jeder Pull Request wird von GitHub geprüft
- [ ] Updates kommen per Klick oder automatisch, nur wenn du es willst
- [ ] Einstellungen, eigene Kacheln und Tasten lassen sich exportieren und importieren

Vorher: flow: Code auf main -> Build auf deinem Laptop -> kein Download
Nachher: flow: lokal prüfen -> Tag v0.1.0! -> GitHub baut! -> sofort öffentlich! -> floawty aktualisiert sich auf Wunsch!

## Entschieden
- GitHub prüft jeden Pull Request wie `npm run verify`; ein wackliger Smoke-Test fällt dort weg und läuft vor jedem Release lokal
- Release: lokal `npm run verify` und Live-Check, dann Tag, dann sofort öffentlich; Tag und Versionsnummer müssen passen
- Dateien: floawty-X.Y.Z-setup.exe (NSIS, ohne Admin, EN/DE, lädt WebView2 nach), floawty-X.Y.Z-portable.exe, SHA256SUMS.txt; nur x64; Text aus dem CHANGELOG; erste Version 0.1.0
- Portable speichert im Benutzerordner und erklärt fehlendes WebView2 mit Link
- Updates mit `tauri-plugin-updater` (freigegeben): „Nach Updates suchen“ mit Versionsanzeige; Automatik aus per Voreinstellung, sonst Prüfung beim Start und alle 24 Stunden, Installation beim Beenden; Portable zeigt nur einen Hinweis mit Link
- Update-Schlüssel und Passwort im Passwort-Manager und als GitHub-Secret
- Export und Import schon in 0.1.0: Einstellungen, eigene Kacheln, Tasten; nie Anmeldungen (auf anderem PC ohnehin unbrauchbar, Regel 8)
- Signieren: 0.1.0 unsigniert, danach Antrag bei SignPath Foundation
- README nennt die gemessene Downloadgröße

## Plan
1. rel-01 CI für Pull Requests
2. rel-02 Installer und Portable, WebView2-Hinweis
3. rel-03 Updates per Klick und automatisch
4. rel-04 Export und Import der Einstellungen
5. rel-05 Release-Workflow mit Prüfsummen und latest.json
6. rel-06 Erstes Release 0.1.0 nach Probe auf frischem Windows
7. rel-07 Signieren über SignPath
