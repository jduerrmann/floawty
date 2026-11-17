---
round: 1
title: floawty – Auswertung Testprototyp
---
# Auswertung Testprototyp
Problem: Zwei Prototypen sind gebaut und gemessen. Ohne Entscheidung darf kein App-Code nach main.
Ziel: Stack, Ressourcenbudgets und Umgang mit Fremdverbindungen stehen fest, damit der MVP-Plan starten kann.
Fertig, wenn:
- [x] Stack-Entscheidung mit Zahlen festgehalten
- [x] Budgets für Größe, Start, RAM, CPU gesetzt
- [x] Datenschutz-Versprechen passt zum gewählten Stack

| Kriterium | Tauri (WebView2) | Electron (castlabs) |
|---|---|---|
| Netflix | + 1080p, Hardware-DRM | - Fehler E100 |
| Prime, Disney+, RTL+ | + laufen | o nicht getestet |
| Google-Login | + klappt | o nicht getestet |
| Download | + 4,2 MiB | - 105 MiB |
| Start | + 46 ms | o 110 ms |
| Keine Fremdverbindung | - 1× Microsoft pro Start | + keine |

## Entschieden
- Stack: Tauri 2 auf WebView2, nur Windows 10/11
- Microsoft-Verbindung: Hinweis beim ersten Start, dazu in PRIVACY.md und README
- Anmeldungen: ein gemeinsames Profil im MVP, Profile je Dienst sobald Tauri sie anbietet
- Kacheln: jeder getestete Dienst, also auch RTL+; Apple TV+ und Crunchyroll nach Test
- Budgets: Download ≤ 10 MiB, Start ≤ 200 ms, RAM Leerlauf ≤ 250 MB, RAM YouTube 1080p ≤ 850 MB, CPU Leerlauf/ausgeblendet ≈ 0
- WebView2 immer mit `--disable-background-networking`
- Spike-Code bleibt auf den spike-Branches, das Messskript kommt nach main
- Risiken „unstable“-Feature und WebView2-Updates: Tauri-Version fixieren, Smoke-Test und Live-Checks vor jedem Release, Runtime-Version loggen

## Plan
1. Entscheidung in stack-by-spike festhalten, Budgets in die Engineering Standards – erledigt
2. AGENTS.md, PRIVACY.md und README angepasst – erledigt
3. DRM-Recherche-Notiz und Ergebnisnotiz aktualisiert – erledigt
4. Messskript auf den Branch decision/stack-tauri, Spike-Plan archiviert – erledigt
5. MVP-Planung als nächste Planungsseite
