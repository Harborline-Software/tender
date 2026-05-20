#Requires -Version 5.1
# Harborline Tender -- Windows system tray coordinator.
# Mirrors the Mac SwiftBar plugin at tender/menubar-plugin/sunfishsoftware.10s.sh
#
# Sections: Coordination | Signal-Bridge | Sunfish ERP | Anchor (Tauri) | GPU Workers | Folders
# Refresh: every 10 seconds

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# -- Path resolution ----------------------------------------------------------
$Script:ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Script:TenderDir  = Split-Path -Parent $Script:ScriptDir
$Script:FleetRoot  = Split-Path -Parent $Script:TenderDir
$Script:CoordDir   = Join-Path $Script:FleetRoot "coordination"
$Script:SunfishDir = Join-Path $Script:FleetRoot "sunfish"
$Script:BridgeDir  = Join-Path $Script:FleetRoot "signal-bridge"
$Script:FlightDeck = Join-Path $Script:FleetRoot "flight-deck"

# Installed Anchor.exe -- search candidate paths
$Script:AnchorExeCandidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\anchor\Anchor.exe")
    "C:\Program Files\Anchor\Anchor.exe"
    (Join-Path $Script:SunfishDir "apps\desktop\src-tauri\target\release\Anchor.exe")
)
$Script:AnchorExe = $Script:AnchorExeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

# GPU worker NSSM service manifest
$Script:GpuServices = @(
    [PSCustomObject]@{ Name = "ComfyUIService";         Label = "ComfyUI";          Port = 8188 }
    [PSCustomObject]@{ Name = "InferenceStudioService"; Label = "Inference Studio"; Port = 8881 }
    [PSCustomObject]@{ Name = "TTSService";             Label = "TTS (Chatterbox)"; Port = 8883 }
    [PSCustomObject]@{ Name = "KokoroTTSService";       Label = "Kokoro TTS";       Port = $null }
    [PSCustomObject]@{ Name = "MusicService";           Label = "Music Service";    Port = $null }
    [PSCustomObject]@{ Name = "SunfishOllama";          Label = "Ollama";           Port = $null }
    [PSCustomObject]@{ Name = "SunfishWhisper";         Label = "Whisper";          Port = $null }
)

# Service URLs
$Script:UrlBridgeAspire = "https://localhost:17101"
$Script:UrlBridgeApi    = "http://localhost:5253"

# -- Icon factory (flag + status badge) ----------------------------------------
$Script:AssetsDir   = Join-Path $Script:ScriptDir "assets"
$Script:FlagBasePng = Join-Path $Script:AssetsDir "flag-base.png"

function New-FlagStatusIcon {
    param([string]$BadgeFill, [string]$BadgeBorder)
    # Load via MemoryStream so no file lock is held on flag-base.png
    $bytes  = [System.IO.File]::ReadAllBytes($Script:FlagBasePng)
    $stream = New-Object System.IO.MemoryStream(,$bytes)
    $base   = [System.Drawing.Image]::FromStream($stream)
    $bmp    = New-Object System.Drawing.Bitmap(32, 32, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g      = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    $g.DrawImage($base, 0, 0, 32, 32)
    $g.Dispose()
    $base.Dispose(); $stream.Dispose()
    # Key out near-white pixels -- handles 24bpp PNGs saved without an alpha channel.
    # Operates on the 32x32 copy (1024 px) so it is fast.
    # Threshold R>230 AND G>230 AND B>230 covers pure white + anti-alias fringe.
    for ($y = 0; $y -lt 32; $y++) {
        for ($x = 0; $x -lt 32; $x++) {
            $px = $bmp.GetPixel($x, $y)
            if ($px.R -gt 230 -and $px.G -gt 230 -and $px.B -gt 230) {
                $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            }
        }
    }
    # Badge at bottom-right (x=21,y=21). White ring for contrast on any bg color.
    $g2        = [System.Drawing.Graphics]::FromImage($bmp)
    $g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $whitePen  = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 1.5)
    $fillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($BadgeFill))
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($BadgeBorder), 1.0)
    $g2.DrawEllipse($whitePen,  21, 21, 9, 9)
    $g2.FillEllipse($fillBrush, 22, 22, 8, 8)
    $g2.DrawEllipse($borderPen, 22, 22, 7, 7)
    $g2.Dispose(); $whitePen.Dispose(); $fillBrush.Dispose(); $borderPen.Dispose()
    $icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
    $bmp.Dispose()
    return $icon
}

function New-TrayIcon {
    param([string]$Fill, [string]$Border)
    $bmp = New-Object System.Drawing.Bitmap(16, 16)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($Fill))
    $pen   = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($Border), 1.2)
    $g.FillEllipse($brush, 2, 2, 12, 12)
    $g.DrawEllipse($pen,   2, 2, 11, 11)
    $g.Dispose(); $brush.Dispose(); $pen.Dispose()
    $icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
    $bmp.Dispose()
    return $icon
}

if (Test-Path $Script:FlagBasePng) {
    $Script:IconGreen  = New-FlagStatusIcon "#22c55e" "#16a34a"
    $Script:IconYellow = New-FlagStatusIcon "#eab308" "#ca8a04"
    $Script:IconRed    = New-FlagStatusIcon "#ef4444" "#dc2626"
    $Script:IconGray   = New-FlagStatusIcon "#9ca3af" "#6b7280"
} else {
    $Script:IconGreen  = New-TrayIcon "#22c55e" "#16a34a"
    $Script:IconYellow = New-TrayIcon "#eab308" "#ca8a04"
    $Script:IconRed    = New-TrayIcon "#ef4444" "#dc2626"
    $Script:IconGray   = New-TrayIcon "#9ca3af" "#6b7280"
}

# -- Tray icon ----------------------------------------------------------------
$Script:Tray = New-Object System.Windows.Forms.NotifyIcon
$Script:Tray.Visible = $true
$Script:Tray.Text    = "Harborline Tender"
$Script:Tray.Icon    = $Script:IconGray

# -- Helpers ------------------------------------------------------------------
function Get-SvcStatus { param([string]$n)
    $s = Get-Service -Name $n -ErrorAction SilentlyContinue
    if ($null -eq $s) { return $null }
    return $s.Status
}

function Test-ProcessCmdLine { param([string]$Pattern)
    try {
        $r = Get-CimInstance -ClassName Win32_Process -ErrorAction SilentlyContinue |
             Where-Object { $_.CommandLine -like "*$Pattern*" }
        return ($null -ne $r -and @($r).Count -gt 0)
    } catch { return $false }
}

function Test-ProcessName { param([string]$Name)
    return ($null -ne (Get-Process -Name $Name -ErrorAction SilentlyContinue))
}

function Get-InboxCount {
    $path = Join-Path $Script:CoordDir "inbox"
    if (-not (Test-Path $path)) { return 0 }
    return @(Get-ChildItem "$path\*.md" -ErrorAction SilentlyContinue).Count
}

function Get-LastSyncLine {
    $log = Join-Path $Script:CoordDir ".sync-stdout.log"
    if (-not (Test-Path $log)) { return "" }
    try {
        $lines = Get-Content $log -Tail 20 -ErrorAction SilentlyContinue
        $match = $lines | Where-Object { $_ -match "synced|ERROR|manual sync" } | Select-Object -Last 1
        return if ($match) { $match.Substring(0, [Math]::Min($match.Length, 80)) } else { "" }
    } catch { return "" }
}

function Open-Folder { param([string]$Path)
    if (Test-Path $Path) { Start-Process "explorer.exe" -ArgumentList "`"$Path`"" }
}

function Open-Url { param([string]$Url)
    Start-Process $Url
}

function Start-InTerminal { param([string]$WorkDir, [string]$Command)
    $wt = Get-Command "wt.exe" -ErrorAction SilentlyContinue
    if ($wt) {
        Start-Process "wt.exe" -ArgumentList "new-tab", "-d", "`"$WorkDir`"", "pwsh.exe", "-NoExit", "-Command", "`"$Command`""
    } else {
        Start-Process "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$WorkDir'; $Command"
    }
}

function Add-Sep { param($m)
    # ContextMenuStrip uses .Items; ToolStripMenuItem uses .DropDownItems
    if ($m -is [System.Windows.Forms.ContextMenuStrip]) {
        $m.Items.Add("-") | Out-Null
    } else {
        $m.DropDownItems.Add("-") | Out-Null
    }
}

function Add-Item {
    param($Parent, [string]$Text, [scriptblock]$OnClick, [bool]$Enabled = $true, [bool]$Bold = $false)
    $item = New-Object System.Windows.Forms.ToolStripMenuItem
    $item.Text    = $Text
    $item.Enabled = $Enabled
    if ($Bold) { $item.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold) }
    if ($OnClick -and $Enabled) { $item.Add_Click($OnClick) }
    $Parent.Items.Add($item) | Out-Null
    return $item
}

function Add-SubItem {
    param($ParentItem, [string]$Text, [scriptblock]$OnClick, [bool]$Enabled = $true)
    $sub = New-Object System.Windows.Forms.ToolStripMenuItem
    $sub.Text    = $Text
    $sub.Enabled = $Enabled
    if ($OnClick -and $Enabled) { $sub.Add_Click($OnClick) }
    $ParentItem.DropDownItems.Add($sub) | Out-Null
    return $sub
}

# -- Menu rebuild -------------------------------------------------------------
function Update-Tray {

    # -- Gather state (do all slow queries once) ------------------------------
    $inboxCount  = Get-InboxCount
    $lastSync    = Get-LastSyncLine
    $bridgeUp    = Test-ProcessCmdLine "Sunfish.Bridge.AppHost"
    $mauiUp      = Test-ProcessCmdLine "Sunfish.Anchor"
    $anchorUp    = if ($Script:AnchorExe) { Test-ProcessName "Anchor" } else { $false }

    $gpuResults = $Script:GpuServices | ForEach-Object {
        $status = Get-SvcStatus $_.Name
        [PSCustomObject]@{ Def = $_; Status = $status; Running = ($status -eq "Running") }
    }
    $gpuRunning = ($gpuResults | Where-Object { $_.Running }).Count
    $gpuTotal   = $gpuResults.Count

    # -- Overall health icon --------------------------------------------------
    $allGpuUp = ($gpuRunning -eq $gpuTotal)
    $anyUp    = $bridgeUp -or $mauiUp -or $anchorUp -or ($gpuRunning -gt 0)
    if ($allGpuUp -and $bridgeUp) {
        $Script:Tray.Icon = $Script:IconGreen
    } elseif ($anyUp) {
        $Script:Tray.Icon = $Script:IconYellow
    } else {
        $Script:Tray.Icon = $Script:IconRed
    }
    $Script:Tray.Text = "Harborline: GPU $gpuRunning/$gpuTotal  Bridge:$(if($bridgeUp){'up'}else{'--'})  ERP:$(if($mauiUp){'up'}else{'--'})"

    # -- Build menu -----------------------------------------------------------
    $menu = New-Object System.Windows.Forms.ContextMenuStrip

    # Header
    Add-Item $menu "Harborline Windows Tender" $null $false $true
    Add-Item $menu "Inbox: $inboxCount item$(if($inboxCount -ne 1){'s'} else {''})" $null $false

    Add-Sep $menu

    # -- Coordination ---------------------------------------------------------
    $coordItem = Add-Item $menu "Coordination"
    Add-SubItem $coordItem "Sync now (one-shot)" {
        $syncScript = Join-Path $Script:CoordDir "sync-coordination.py"
        if (Test-Path $syncScript) {
            Start-InTerminal $Script:CoordDir "python '$syncScript' -v"
        } else {
            [System.Windows.Forms.MessageBox]::Show("sync-coordination.py not found at $syncScript") | Out-Null
        }
    }
    if ($lastSync) {
        Add-SubItem $coordItem "  $lastSync" $null $false
    }
    Add-SubItem $coordItem "Open inbox" { Open-Folder (Join-Path $Script:CoordDir "inbox") }
    Add-SubItem $coordItem "Open coordination folder" { Open-Folder $Script:CoordDir }

    Add-Sep $menu

    # -- Signal-Bridge --------------------------------------------------------
    $brDot   = if ($bridgeUp) { "[ON]" } else { "[--]" }
    $brLabel = if ($bridgeUp) { "running" } else { "stopped" }
    $brItem  = Add-Item $menu "Bridge  $brDot  $brLabel"
    if ($bridgeUp) {
        Add-SubItem $brItem "Stop Bridge" {
            Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*Sunfish.Bridge.AppHost*" } |
                ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
        }
    } else {
        Add-SubItem $brItem "Start Bridge (AppHost)" {
            $appHostProj = Join-Path $Script:BridgeDir "Sunfish.Bridge.AppHost"
            Start-InTerminal $Script:BridgeDir "dotnet run --project '$appHostProj'"
        }
    }
    Add-SubItem $brItem "Open Aspire dashboard" { Open-Url $Script:UrlBridgeAspire }
    Add-SubItem $brItem "Open Bridge API" { Open-Url $Script:UrlBridgeApi }
    Add-SubItem $brItem "Open signal-bridge folder" { Open-Folder $Script:BridgeDir }

    Add-Sep $menu

    # -- Sunfish ERP (MAUI) ---------------------------------------------------
    $erDot   = if ($mauiUp) { "[ON]" } else { "[--]" }
    $erLabel = if ($mauiUp) { "running" } else { "stopped" }
    $erItem  = Add-Item $menu "Sunfish ERP  $erDot  $erLabel"
    if ($mauiUp) {
        Add-SubItem $erItem "Stop ERP" {
            Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*Sunfish.Anchor*" } |
                ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
        }
    } else {
        Add-SubItem $erItem "Start ERP (dotnet run)" {
            $proj = Join-Path $Script:SunfishDir "src\Sunfish.Anchor.csproj"
            Start-InTerminal $Script:SunfishDir "dotnet run --project '$proj'"
        }
    }
    Add-SubItem $erItem "Open sunfish folder" { Open-Folder $Script:SunfishDir }

    Add-Sep $menu

    # -- Anchor (Tauri installed app) -----------------------------------------
    $anDot   = if ($anchorUp)          { "[ON]" } else { "[--]" }
    $anLabel = if ($anchorUp)          { "running" } elseif ($Script:AnchorExe) { "stopped" } else { "not installed" }
    $anItem  = Add-Item $menu "Anchor  $anDot  $anLabel"
    if ($anchorUp) {
        Add-SubItem $anItem "Quit Anchor" { Get-Process -Name "Anchor" -ErrorAction SilentlyContinue | Stop-Process -Force }
        Add-SubItem $anItem "Bring to front" {
            $p = Get-Process -Name "Anchor" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($p) {
                Add-Type @"
using System; using System.Runtime.InteropServices;
public class WinAPI { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); }
"@
                [WinAPI]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
            }
        }
    } elseif ($Script:AnchorExe) {
        Add-SubItem $anItem "Open Anchor" { Start-Process $Script:AnchorExe }
    } else {
        Add-SubItem $anItem "(not installed -- build MSI first)" $null $false
    }
    if ($Script:AnchorExe) {
        Add-SubItem $anItem "Reveal in Explorer" { Start-Process "explorer.exe" "/select,`"$Script:AnchorExe`"" }
    }

    Add-Sep $menu

    # -- GPU Workers ----------------------------------------------------------
    $gpuItem = Add-Item $menu "GPU Workers  ($gpuRunning/$gpuTotal running)"
    foreach ($r in $gpuResults) {
        $dot      = if ($r.Running) { "[ON]" } else { "[--]" }
        $portInfo = if ($r.Def.Port) { " :$($r.Def.Port)" } else { "" }
        $label    = if ($null -eq $r.Status) { "not installed" } else { $r.Status.ToString() }
        $sub = Add-SubItem $gpuItem "$dot $($r.Def.Label)$portInfo  $label"

        if ($null -ne $r.Status) {
            $svcName  = $r.Def.Name
            $isRunning = $r.Running
            $action = New-Object System.Windows.Forms.ToolStripMenuItem
            $action.Text = if ($isRunning) { "Stop" } else { "Start" }
            $action.Tag  = [PSCustomObject]@{ ServiceName = $svcName; IsRunning = $isRunning }
            $action.Add_Click({
                $t = $this.Tag
                $cmd = if ($t.IsRunning) { "Stop-Service -Name '$($t.ServiceName)' -Force" } else { "Start-Service -Name '$($t.ServiceName)'" }
                Start-Process "powershell.exe" -ArgumentList "-NoProfile -Command `"$cmd`"" -Verb RunAs -WindowStyle Hidden
            })
            $sub.DropDownItems.Add($action) | Out-Null
        }
    }

    Add-Sep $gpuItem

    $startAll = New-Object System.Windows.Forms.ToolStripMenuItem
    $startAll.Text = "Start All GPU Workers"
    $startAll.Add_Click({
        $names = ($Script:GpuServices | ForEach-Object { "'$($_.Name)'" }) -join ","
        $cmd = "foreach (\$n in @($names)) { Start-Service -Name \$n -ErrorAction SilentlyContinue }"
        Start-Process "powershell.exe" -ArgumentList "-NoProfile -Command `"$cmd`"" -Verb RunAs -WindowStyle Hidden
    })
    $gpuItem.DropDownItems.Add($startAll) | Out-Null

    $stopAll = New-Object System.Windows.Forms.ToolStripMenuItem
    $stopAll.Text = "Stop All GPU Workers"
    $stopAll.Add_Click({
        $names = ($Script:GpuServices | ForEach-Object { "'$($_.Name)'" }) -join ","
        $cmd = "foreach (\$n in @($names)) { Stop-Service -Name \$n -Force -ErrorAction SilentlyContinue }"
        Start-Process "powershell.exe" -ArgumentList "-NoProfile -Command `"$cmd`"" -Verb RunAs -WindowStyle Hidden
    })
    $gpuItem.DropDownItems.Add($stopAll) | Out-Null

    Add-Sep $menu

    # -- Folders --------------------------------------------------------------
    $foldItem = Add-Item $menu "Folders"
    Add-SubItem $foldItem "Harborline root"    { Open-Folder $Script:FleetRoot }
    Add-SubItem $foldItem "Sunfish repo"       { Open-Folder $Script:SunfishDir }
    Add-SubItem $foldItem "Signal-Bridge repo" { Open-Folder $Script:BridgeDir }
    Add-SubItem $foldItem "Flight-deck repo"   { Open-Folder $Script:FlightDeck }
    Add-SubItem $foldItem "Coordination"       { Open-Folder $Script:CoordDir }
    Add-SubItem $foldItem "Inbox"              { Open-Folder (Join-Path $Script:CoordDir "inbox") }

    Add-Sep $menu

    $refreshItem = Add-Item $menu "Refresh Now" { Update-Tray }

    $exitItem = Add-Item $menu "Exit Tender" {
        $Script:Timer.Stop()
        $Script:Tray.Visible = $false
        $Script:Tray.Dispose()
        [System.Windows.Forms.Application]::Exit()
    }

    # Swap menu
    $old = $Script:Tray.ContextMenuStrip
    $Script:Tray.ContextMenuStrip = $menu
    if ($null -ne $old) { $old.Dispose() }
}

# -- Periodic refresh ---------------------------------------------------------
$Script:Timer = New-Object System.Windows.Forms.Timer
$Script:Timer.Interval = 10000
$Script:Timer.Add_Tick({ Update-Tray })
$Script:Timer.Start()

Update-Tray

[System.Windows.Forms.Application]::Run()
