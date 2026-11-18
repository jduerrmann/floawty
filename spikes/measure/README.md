# Spike measurement

`measure.ps1` measures any app the same way, so the Electron and Tauri prototypes
can be compared ([sp-01](../../knowledge-base/archive/plans/stack-spike/sp-01-measurement.md)).
It needs PowerShell 7 (`pwsh`) on Windows.

## What it measures

| Metric | How | Note |
|---|---|---|
| Start time | process start → first visible main window | runs `-Runs` times; run 1 is the coldest |
| RAM (`PrivateMB`) | sum of private bytes over the whole process tree | same as Task Manager's "Commit size" column, not its "Memory" column |
| CPU (`CpuPercent`) | processor time of the tree per second, share of all cores | 100 % = every core busy |
| Processes | size of the process tree | includes helpers such as `msedgewebview2.exe` |
| Remote hosts | established TCP connections of the tree, every 5 s | QUIC (UDP) is not visible; names via DNS cache or reverse DNS |

The tree is every process started by the root process, recursively.

## Procedure

Use the same machine, power plan and display for both stacks, close other heavy
apps, and wait a minute after login before measuring.

1. **Start time** – the script starts and stops the app itself:

   ```powershell
   pwsh ./measure.ps1 -App electron -Exe ..\electron\out\floawty-spike.exe -Runs 5
   ```

2. **Scenarios** – start the app, set up the scenario, then measure its root
   process (`Get-Process <name> | Sort-Object StartTime | Select-Object -First 1`):

   | Scenario | Setup |
   |---|---|
   | `idle` | overlay open on a blank page, no video |
   | `youtube-1080p` | the fixed test video below, 1080p, playing, overlay at 70 % opacity |
   | `hidden` | overlay hidden with its hotkey, video paused |

   ```powershell
   pwsh ./measure.ps1 -App electron -Scenario idle -ProcessId 12345 -Seconds 60
   ```

   Test video: Big Buck Bunny 60 fps 4K (Blender Foundation, CC BY 3.0),
   `https://www.youtube.com/watch?v=aqz-KE-bpKQ`, quality fixed to 1080p.

   **floawty itself** is measured with `npm run measure` after `npm run build`: a
   Playwright driver (`tests/measure/`) starts the release build with fresh data
   folders, measures start and `idle` without the debug port, sets up
   `youtube-1080p` and `hidden` over it and checks what really played. The app has
   no `--scenario` switch.

   `run-scenarios.ps1` does this for all scenarios when the app supports
   `--scenario=<name>` (it starts the app, waits 25 s, measures 60 s, stops it):

   ```powershell
   pwsh ./run-scenarios.ps1 -App electron -Exe ..\electron\out\win-unpacked\floawty-spike-electron.exe
   ```

   The app must log what really plays (resolution, frames); YouTube can ignore a
   requested quality or be stopped by its cookie banner.

3. **Package size** – size of the portable build file, recorded by hand.

## Output

`results/` (git-ignored, except `sample.csv`):

- `<app>-start.csv` – one row per start run.
- `<app>-<scenario>.csv` – one row per second.
- `<app>-<scenario>-summary.csv` – median, p95 and max per metric.
- `<app>-<scenario>-hosts.txt` – remote hosts. Can contain local network device
  names, so it is never committed.

## Checked against

Chrome with 30 processes: `PrivateMB` within ~3 % of the WMI performance counters,
CPU in the same range. Start mode tested with Character Map; process exit during a
run and an unknown process id end with a clear message.
