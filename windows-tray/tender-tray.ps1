#Requires -Version 5.1
# Harborline Tender -- Windows system tray service monitor.
# Polls local Harborline NSSM services every 10 seconds and shows
# a color-coded tray icon (green/yellow/red). Right-click menu lets
# you start/stop individual services.
#
# Analog of the Mac SwiftBar plugin at tender/menubar-plugin/sunfishsoftware.10s.sh.

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# -- Service manifest ---------------------------------------------------------
$Script:ServiceDefs = @(
    [PSCustomObject]@{ Name = "InferenceStudioService"; Label = "Inference Studio";  Port = 8881 }
    [PSCustomObject]@{ Name = "TTSService";             Label = "TTS (Chatterbox)";  Port = 8883 }
    [PSCustomObject]@{ Name = "KokoroTTSService";       Label = "Kokoro TTS";        Port = $null }
    [PSCustomObject]@{ Name = "MusicService";           Label = "Music Service";     Port = $null }
    [PSCustomObject]@{ Name = "SunfishOllama";          Label = "Ollama";            Port = $null }
    [PSCustomObject]@{ Name = "SunfishWhisper";         Label = "Whisper";           Port = $null }
)

# -- Icon factory -------------------------------------------------------------
function New-TrayIcon {
    param([string]$Fill, [string]$Border)
    $bmp = New-Object System.Drawing.Bitmap(16, 16)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $fillColor   = [System.Drawing.ColorTranslator]::FromHtml($Fill)
    $borderColor = [System.Drawing.ColorTranslator]::FromHtml($Border)
    $brush = New-Object System.Drawing.SolidBrush($fillColor)
    $pen   = New-Object System.Drawing.Pen($borderColor, 1.2)
    $g.FillEllipse($brush, 2, 2, 12, 12)
    $g.DrawEllipse($pen, 2, 2, 11, 11)
    $g.Dispose(); $brush.Dispose(); $pen.Dispose()
    $hIcon = $bmp.GetHicon()
    $icon  = [System.Drawing.Icon]::FromHandle($hIcon)
    $bmp.Dispose()
    return $icon
}

$Script:IconGreen  = New-TrayIcon "#22c55e" "#16a34a"
$Script:IconYellow = New-TrayIcon "#eab308" "#ca8a04"
$Script:IconRed    = New-TrayIcon "#ef4444" "#dc2626"

# -- Tray icon ----------------------------------------------------------------
$Script:Tray = New-Object System.Windows.Forms.NotifyIcon
$Script:Tray.Visible = $true
$Script:Tray.Text    = "Harborline Tender - loading..."
$Script:Tray.Icon    = $Script:IconYellow

# -- Status query -------------------------------------------------------------
function Get-SvcStatus {
    param([string]$Name)
    $s = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if ($null -eq $s) { return $null }
    return $s.Status
}

# -- Menu rebuild -------------------------------------------------------------
function Update-Tray {
    $results = $Script:ServiceDefs | ForEach-Object {
        $status = Get-SvcStatus $_.Name
        [PSCustomObject]@{
            Def     = $_
            Status  = $status
            Running = ($status -eq "Running")
        }
    }

    $runCount   = ($results | Where-Object { $_.Running }).Count
    $totalCount = $results.Count

    if ($runCount -eq $totalCount) {
        $Script:Tray.Icon = $Script:IconGreen
    } elseif ($runCount -gt 0) {
        $Script:Tray.Icon = $Script:IconYellow
    } else {
        $Script:Tray.Icon = $Script:IconRed
    }
    $Script:Tray.Text = "Harborline: $runCount/$totalCount running"

    $menu = New-Object System.Windows.Forms.ContextMenuStrip

    $header = New-Object System.Windows.Forms.ToolStripMenuItem
    $header.Text    = "Harborline Services ($runCount/$totalCount running)"
    $header.Enabled = $false
    $menu.Items.Add($header) | Out-Null
    $menu.Items.Add("-") | Out-Null

    foreach ($r in $results) {
        $dot      = if ($r.Running) { "[ON] " } else { "[--] " }
        $portInfo = if ($r.Def.Port) { "  :$($r.Def.Port)" } else { "" }
        $label    = if ($null -eq $r.Status) { "Not installed" } else { $r.Status.ToString() }

        $item      = New-Object System.Windows.Forms.ToolStripMenuItem
        $item.Text = "$dot$($r.Def.Label)$portInfo  $label"
        $item.Tag  = [PSCustomObject]@{
            ServiceName = $r.Def.Name
            IsRunning   = $r.Running
            Installed   = ($null -ne $r.Status)
        }

        if ($null -ne $r.Status) {
            $actionText = if ($r.Running) { "Stop" } else { "Start" }
            $sub = New-Object System.Windows.Forms.ToolStripMenuItem
            $sub.Text = $actionText
            $sub.Tag  = $item.Tag
            $sub.Add_Click({
                $tag = $this.Tag
                if ($tag.IsRunning) {
                    $cmd = "Stop-Service -Name '$($tag.ServiceName)' -Force"
                } else {
                    $cmd = "Start-Service -Name '$($tag.ServiceName)'"
                }
                Start-Process "powershell.exe" -ArgumentList "-NoProfile -Command `"$cmd`"" -Verb RunAs -WindowStyle Hidden
            })
            $item.DropDownItems.Add($sub) | Out-Null
        }

        $menu.Items.Add($item) | Out-Null
    }

    $menu.Items.Add("-") | Out-Null

    $refreshItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $refreshItem.Text = "Refresh Now"
    $refreshItem.Add_Click({ Update-Tray })
    $menu.Items.Add($refreshItem) | Out-Null

    $exitItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $exitItem.Text = "Exit Tender"
    $exitItem.Add_Click({
        $Script:Timer.Stop()
        $Script:Tray.Visible = $false
        $Script:Tray.Dispose()
        [System.Windows.Forms.Application]::Exit()
    })
    $menu.Items.Add($exitItem) | Out-Null

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
