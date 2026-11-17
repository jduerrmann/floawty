<#
.SYNOPSIS
Measures start time, RAM, CPU and remote hosts of an app's whole process tree.

.EXAMPLE
./measure.ps1 -App electron -Exe ..\electron\out\floawty-spike.exe -Runs 5

.EXAMPLE
./measure.ps1 -App electron -Scenario idle -ProcessId 12345 -Seconds 60
#>
#Requires -Version 7
[CmdletBinding(DefaultParameterSetName = 'Sample')]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string] $App,

    [Parameter(Mandatory, ParameterSetName = 'Start')]
    [string] $Exe,

    [Parameter(ParameterSetName = 'Start')]
    [string[]] $Arguments = @(),

    [Parameter(ParameterSetName = 'Start')]
    [ValidateRange(1, 20)]
    [int] $Runs = 5,

    [Parameter(Mandatory, ParameterSetName = 'Sample')]
    [int] $ProcessId,

    [Parameter(Mandatory, ParameterSetName = 'Sample')]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string] $Scenario,

    [Parameter(ParameterSetName = 'Sample')]
    [ValidateRange(5, 3600)]
    [int] $Seconds = 60
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
# Results must read the same on every machine, so numbers use '.' as decimal separator.
[System.Threading.Thread]::CurrentThread.CurrentCulture = [cultureinfo]::InvariantCulture

$ResultsDir = Join-Path $PSScriptRoot 'results'
$StartTimeoutSeconds = 30
$HostScanEverySeconds = 5
$MegaByte = 1MB

function Get-ProcessTreeIds([int] $RootId) {
    $all = Get-CimInstance Win32_Process -Property ProcessId, ParentProcessId, CreationDate
    $root = $all | Where-Object ProcessId -eq $RootId
    if (-not $root) { return @() }

    $childrenByParent = $all | Group-Object ParentProcessId -AsHashTable -AsString
    $ids = [System.Collections.Generic.List[int]]::new()
    $queue = [System.Collections.Generic.Queue[object]]::new()
    $queue.Enqueue($root)
    while ($queue.Count -gt 0) {
        $current = $queue.Dequeue()
        $ids.Add([int] $current.ProcessId)
        $children = $childrenByParent["$($current.ProcessId)"]
        # A reused PID can look like a parent; real children are never older.
        foreach ($child in @($children) | Where-Object { $_ -and $_.CreationDate -ge $current.CreationDate }) {
            $queue.Enqueue($child)
        }
    }
    return $ids.ToArray()
}

function Get-TreeSnapshot([int] $RootId) {
    $ids = @(Get-ProcessTreeIds $RootId)
    if ($ids.Count -eq 0) { return @() }
    return Get-Process -Id $ids -ErrorAction SilentlyContinue | ForEach-Object {
        [pscustomobject] @{
            Id           = $_.Id
            PrivateBytes = $_.PrivateMemorySize64
            CpuSeconds   = $_.TotalProcessorTime.TotalSeconds
        }
    }
}

# The cmdlet silently matches nothing when given Int32 ids, so they must be UInt32.
function Get-RemoteAddresses([uint32[]] $Ids) {
    $connections = Get-NetTCPConnection -State Established -OwningProcess $Ids -ErrorAction SilentlyContinue
    return @($connections |
        Where-Object { $_.RemoteAddress -notmatch '^(127\.|::1$|0\.0\.0\.0)' } |
        ForEach-Object RemoteAddress)
}

function Get-Percentile([double[]] $Values, [double] $Percent) {
    $sorted = $Values | Sort-Object
    $rank = [Math]::Ceiling($Percent / 100 * $sorted.Count) - 1
    return $sorted[[Math]::Max(0, $rank)]
}

function Measure-Tree([int] $RootId, [int] $DurationSeconds) {
    $cores = [Environment]::ProcessorCount
    $previousCpu = @{}
    Get-TreeSnapshot $RootId | ForEach-Object { $previousCpu[$_.Id] = $_.CpuSeconds }
    $clock = [System.Diagnostics.Stopwatch]::StartNew()
    $previousElapsed = 0.0
    $rows = [System.Collections.Generic.List[object]]::new()
    $addresses = [System.Collections.Generic.HashSet[string]]::new()

    for ($second = 1; $second -le $DurationSeconds; $second++) {
        $waitMs = [int] ($second * 1000 - $clock.ElapsedMilliseconds)
        if ($waitMs -gt 0) { Start-Sleep -Milliseconds $waitMs }

        $snapshot = @(Get-TreeSnapshot $RootId)
        if ($snapshot.Count -eq 0) { Write-Warning "Process tree $RootId has exited."; break }
        $elapsed = $clock.Elapsed.TotalSeconds

        # A process that appeared since the last sample has used all its CPU time within the interval.
        $cpuDelta = ($snapshot | ForEach-Object { $_.CpuSeconds - ($previousCpu[$_.Id] ?? 0) } |
            Measure-Object -Sum).Sum
        $snapshot | ForEach-Object { $previousCpu[$_.Id] = $_.CpuSeconds }

        $rows.Add([pscustomobject] @{
            Second     = $second
            Processes  = $snapshot.Count
            PrivateMB  = [Math]::Round(($snapshot | Measure-Object PrivateBytes -Sum).Sum / $MegaByte, 1)
            CpuPercent = [Math]::Round($cpuDelta / (($elapsed - $previousElapsed) * $cores) * 100, 2)
        })
        $previousElapsed = $elapsed
        # The TCP lookup takes about a second, so it runs only every few samples.
        if ($second % $HostScanEverySeconds -eq 1) {
            Get-RemoteAddresses $snapshot.Id | ForEach-Object { [void] $addresses.Add($_) }
        }
    }
    return [pscustomobject] @{ Rows = $rows; Addresses = @($addresses) }
}

function Get-Summary($Rows) {
    foreach ($column in 'PrivateMB', 'CpuPercent', 'Processes') {
        $values = [double[]] @($Rows | ForEach-Object $column)
        [pscustomobject] @{
            Metric = $column
            Median = Get-Percentile $values 50
            P95    = Get-Percentile $values 95
            Max    = ($values | Measure-Object -Maximum).Maximum
        }
    }
}

function Resolve-HostNames([string[]] $Addresses) {
    $cache = @(Get-DnsClientCache -ErrorAction SilentlyContinue)
    foreach ($address in $Addresses | Sort-Object) {
        $names = @($cache | Where-Object Data -eq $address | ForEach-Object Entry | Sort-Object -Unique)
        # Chromium often resolves names itself, so fall back to reverse DNS (owner, not exact host).
        if ($names.Count -eq 0) {
            $names = @(Resolve-DnsName $address -Type PTR -QuickTimeout -ErrorAction SilentlyContinue |
                Where-Object Type -eq 'PTR' | ForEach-Object { "ptr:$($_.NameHost)" })
        }
        $label = if ($names.Count -gt 0) { $names -join ', ' } else { '(unknown)' }
        "$address`t$label"
    }
}

function Wait-MainWindow([System.Diagnostics.Process] $Process) {
    $clock = [System.Diagnostics.Stopwatch]::StartNew()
    while ($clock.Elapsed.TotalSeconds -lt $StartTimeoutSeconds) {
        $Process.Refresh()
        if ($Process.HasExited) { throw "$($Process.ProcessName) exited before showing a window." }
        if ($Process.MainWindowHandle -ne [IntPtr]::Zero) { return }
        Start-Sleep -Milliseconds 20
    }
    throw "No visible main window after $StartTimeoutSeconds s."
}

function Stop-ProcessTree([int] $RootId) {
    $ids = @(Get-ProcessTreeIds $RootId)
    if ($ids.Count -eq 0) { return }
    [array]::Reverse($ids)
    Stop-Process -Id $ids -Force -ErrorAction SilentlyContinue
}

function Measure-Start {
    $startArgs = @{ FilePath = $Exe; PassThru = $true }
    if ($Arguments.Count -gt 0) { $startArgs.ArgumentList = $Arguments }

    $rows = for ($run = 1; $run -le $Runs; $run++) {
        $clock = [System.Diagnostics.Stopwatch]::StartNew()
        $process = Start-Process @startArgs
        Wait-MainWindow $process
        [pscustomobject] @{ Run = $run; StartMs = [Math]::Round($clock.Elapsed.TotalMilliseconds, 0) }
        Stop-ProcessTree $process.Id
        # Let the OS release the previous instance before the next start.
        Start-Sleep -Seconds 2
    }

    $path = Join-Path $ResultsDir "$App-start.csv"
    $rows | Export-Csv $path
    $rows | Format-Table -AutoSize
    $median = Get-Percentile ([double[]] @($rows.StartMs)) 50
    "Median start: $median ms (first run is the coldest) -> $path"
}

function Measure-Scenario {
    $result = Measure-Tree $ProcessId $Seconds
    if ($result.Rows.Count -eq 0) { throw "No samples taken for process $ProcessId." }

    $base = Join-Path $ResultsDir "$App-$Scenario"
    $result.Rows | Export-Csv "$base.csv"
    $summary = @(Get-Summary $result.Rows)
    $summary | Export-Csv "$base-summary.csv"
    $hosts = @('# Remote TCP hosts; QUIC (UDP) traffic is not visible here.') + @(Resolve-HostNames $result.Addresses)
    $hosts | Set-Content "$base-hosts.txt"

    $summary | Format-Table -AutoSize
    $hosts
    "Results -> $base*.csv / -hosts.txt"
}

New-Item -ItemType Directory -Path $ResultsDir -Force | Out-Null
if ($PSCmdlet.ParameterSetName -eq 'Start') { Measure-Start } else { Measure-Scenario }
