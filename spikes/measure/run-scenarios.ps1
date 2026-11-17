<#
.SYNOPSIS
Starts a spike app once per scenario (--scenario=<name>), lets it settle, then measures it.

.EXAMPLE
./run-scenarios.ps1 -App electron -Exe ..\electron\out\win-unpacked\floawty-spike-electron.exe -ExtraArgs '--user-data=C:\temp\fe'
#>
#Requires -Version 7
param(
    [Parameter(Mandatory)] [ValidatePattern('^[a-z0-9-]+$')] [string] $App,
    [Parameter(Mandatory)] [string] $Exe,
    [string[]] $ExtraArgs = @(),
    [string[]] $Scenarios = @('idle', 'youtube-1080p', 'hidden'),
    [int] $SettleSeconds = 25,
    [int] $Seconds = 60
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

foreach ($scenario in $Scenarios) {
    $process = Start-Process -FilePath $Exe -ArgumentList (@("--scenario=$scenario") + $ExtraArgs) -PassThru
    "[$scenario] started PID $($process.Id), settling $SettleSeconds s"
    # Page load, consent page and quality switch must be over before sampling starts.
    Start-Sleep -Seconds $SettleSeconds
    & (Join-Path $PSScriptRoot 'measure.ps1') -App $App -Scenario $scenario -ProcessId $process.Id -Seconds $Seconds
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
}
