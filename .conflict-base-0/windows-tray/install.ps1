#Requires -Version 5.1
<#
.SYNOPSIS
    Install Harborline Tender tray to Windows startup + launch now.

.DESCRIPTION
    Creates a shortcut in the current user's Startup folder so Tender
    launches automatically at logon, then starts it immediately.

    Run once per machine; safe to re-run (overwrites old shortcut).

    To uninstall: delete the shortcut from shell:startup, then right-click
    the tray icon and choose "Exit Tender".
#>

$scriptPath  = Join-Path $PSScriptRoot "tender-tray.ps1"
$startupDir  = [System.Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir "Harborline Tender.lnk"

if (-not (Test-Path $scriptPath)) {
    Write-Error "tender-tray.ps1 not found at expected path: $scriptPath"
    exit 1
}

# Create / overwrite the startup shortcut
$wsh      = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath      = (Get-Command powershell.exe).Source
$shortcut.Arguments       = "-NoProfile -WindowStyle Hidden -STA -ExecutionPolicy Bypass -File `"$scriptPath`""
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.Description     = "Harborline Tender — service status tray"
$shortcut.WindowStyle     = 7   # minimized (no console flash)
$shortcut.Save()

Write-Host "Startup shortcut installed at: $shortcutPath"

# Check if already running
$existing = Get-Process -Name "powershell" -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -eq "" } |
    Select-Object -First 1

Write-Host "Launching Tender tray..."
Start-Process "powershell.exe" -ArgumentList "-NoProfile -WindowStyle Hidden -STA -ExecutionPolicy Bypass -File `"$scriptPath`"" -WindowStyle Hidden

Write-Host "Done. Tender tray is running in the system tray (bottom-right of taskbar)."
Write-Host "Right-click the colored dot to see service status and start/stop controls."
