#Requires -Version 5.1
# Generates flag icon assets for the Harborline Tender Windows tray.
#
# Outputs to assets/ (relative to this script):
#   flag-base.png   -- 32x32 Harborline naval pennant, transparent bg, no badge
#
# Run once after checkout, or whenever you want to regenerate from source.
# tender-tray.ps1 loads flag-base.png at startup and composites the
# green/yellow/red status badge circle onto it at runtime.

Add-Type -AssemblyName System.Drawing

$AssetsDir = Join-Path $PSScriptRoot "assets"
New-Item -ItemType Directory -Force -Path $AssetsDir | Out-Null

# ============================================================
# flag-base.png  --  32x32 Harborline naval pennant
# ============================================================
# Layout (32x32, transparent background):
#
#   col: 0  1  2  3 .............. 29  30 31
#   row 0: [pole][pole][pole][.....transparent.....]
#   row 1: [pole][pole][pole][.....transparent.....]
#   row 2: [pole][   navy band (top stripe)        ]
#   ...
#   row 9: [pole][   navy band                     ]
#  row 10: [pole][   white divider (1px)            ]
#  row 11: [pole][   teal band (lower stripe)       ]
#   ...
#  row 19: [pole][   teal band                     ]
#  row 20: [pole][.....transparent.....]
#   ...
#  row 31: [pole][.....transparent.....]
#
# Badge zone (overlaid at runtime): x=21-30, y=21-30  (10x10 circle)
# Pole is left 3px so badge never overlaps flagstaff.

$W = 32; $H = 32
$bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode    = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::Transparent)

# -- Flagpole ----------------------------------------------------------------
$poleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#374151"))
$g.FillRectangle($poleBrush, 0, 0, 3, $H)

# Pole highlight (1px lighter edge for depth)
$poleHighlight = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#6b7280"))
$g.FillRectangle($poleHighlight, 1, 0, 1, $H)
$poleBrush.Dispose(); $poleHighlight.Dispose()

# -- Flag body: navy upper band (rows 2-9, 8px tall) -------------------------
$navyBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#1e3a5f"))
$g.FillRectangle($navyBrush, 3, 2, 27, 8)
$navyBrush.Dispose()

# White divider strip (row 10, 1px)
$divBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.FillRectangle($divBrush, 3, 10, 27, 1)
$divBrush.Dispose()

# -- Flag body: teal lower band (rows 11-19, 9px tall) -----------------------
$tealBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#0d9488"))
$g.FillRectangle($tealBrush, 3, 11, 27, 9)
$tealBrush.Dispose()

# -- Flag outline (subtle border around the whole flag) ----------------------
$outlinePen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#94a3b8"), 0.8)
$g.DrawRectangle($outlinePen, 3, 2, 26, 17)
$outlinePen.Dispose()

# -- Flyend notch (right edge slight taper -- classic pennant shape) ----------
# Overdraw the right 2 columns of the flag with transparency to create a
# slight taper: row 2 and row 19 have the corners clipped.
$clearBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Transparent)
$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
# Clip top-right corner triangle
$topRight = [System.Drawing.Drawing2D.GraphicsPath]::new()
$topRight.AddPolygon(@(
    [System.Drawing.PointF]::new(28, 2),
    [System.Drawing.PointF]::new(30, 2),
    [System.Drawing.PointF]::new(30, 5)
))
$g.FillPath($clearBrush, $topRight)
# Clip bottom-right corner triangle
$botRight = [System.Drawing.Drawing2D.GraphicsPath]::new()
$botRight.AddPolygon(@(
    [System.Drawing.PointF]::new(28, 19),
    [System.Drawing.PointF]::new(30, 16),
    [System.Drawing.PointF]::new(30, 19)
))
$g.FillPath($clearBrush, $botRight)
$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
$clearBrush.Dispose(); $topRight.Dispose(); $botRight.Dispose()

# -- Done --------------------------------------------------------------------
$g.Dispose()
$outPath = Join-Path $AssetsDir "flag-base.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Generated $outPath  (32x32 ARGB PNG)"
