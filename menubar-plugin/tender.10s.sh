#!/bin/bash
# shellcheck disable=SC2034
# SC2034 file-level: SYNC_ICON/STATE/COLOR + AA_PATH are state placeholders set
# for future submenu / debug-info renderings. The tender SwiftBar plugin is
# routinely extended with new submenu rows that consume these; suppressing
# SC2034 at file-level keeps the placeholders without forcing a remove-now /
# rename-when-consumed cycle.
#
# Harborline Toolbox — Harborline Fleet tray-resident toolbox (SwiftBar menubar plugin)
# (this plugin file keeps its "tender" name; see repo README for the display-name note)
#
# Organized control surface for all Harborline services. Three top-level
# groups: Coordination services (sync/archive/qm), Dev services (Bridge/
# Flight Deck/Sunfish), and Folders/LaunchAgents (utility).
#
# LaunchAgents under control:
#   - com.harborline.coordination-sync   (60s)
#   - com.harborline.archive-rollup      (weekly Sun 03:00, paused unless flag)
#   - com.harborline.qm-daemon           (hourly, flag-gated)
#
# Install: symlink into ~/Library/Application Support/SwiftBar/Plugins/
# Refresh: every 10s (encoded in filename .10s.sh)
#
# <swiftbar.title>Harborline Toolbox — Fleet</swiftbar.title>
# <swiftbar.version>4.0</swiftbar.version>
# <swiftbar.author>Admiral</swiftbar.author>
# <swiftbar.desc>Unified control surface for Harborline coordination + dev services</swiftbar.desc>
# <swiftbar.hideAbout>false</swiftbar.hideAbout>
# <swiftbar.hideRunInTerminal>true</swiftbar.hideRunInTerminal>
# <swiftbar.hideLastUpdated>false</swiftbar.hideLastUpdated>
# <swiftbar.hideDisablePlugin>false</swiftbar.hideDisablePlugin>
# <swiftbar.hideSwiftBar>false</swiftbar.hideSwiftBar>

set -u

# --- Paths ---
_SELF_REAL="$(/usr/bin/python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "${BASH_SOURCE[0]}")"
_PLUGIN_DIR="$(/usr/bin/dirname "$_SELF_REAL")"
_TENDER_DIR="$(/usr/bin/dirname "$_PLUGIN_DIR")"
ROOT_DIR="${ROOT_DIR:-$(/usr/bin/dirname "$_TENDER_DIR")}"

COORD_DIR="${COORD_DIR:-$ROOT_DIR/coordination}"
SHIPYARD_DIR="${SHIPYARD_DIR:-$ROOT_DIR/shipyard}"
SUNFISH_DIR="${SUNFISH_DIR:-$ROOT_DIR/sunfish}"
SIGNAL_BRIDGE_DIR="${SIGNAL_BRIDGE_DIR:-$ROOT_DIR/signal-bridge}"
FLIGHT_DECK_DIR="${FLIGHT_DECK_DIR:-$ROOT_DIR/flight-deck}"

# Coordination sync
SYNC_FLAG="$COORD_DIR/.sync-active"
SYNC_SCRIPT="$COORD_DIR/sync-coordination.py"
SYNC_PLIST="$HOME/Library/LaunchAgents/com.harborline.coordination-sync.plist"
SYNC_LOG_OUT="$COORD_DIR/.sync-stdout.log"
SYNC_LOG_ERR="$COORD_DIR/.sync-stderr.log"

# Archive rollup
AR_FLAG="$COORD_DIR/.archive-rollup-active"
AR_SCRIPT="$COORD_DIR/archive-rollup.py"
AR_PLIST="$HOME/Library/LaunchAgents/com.harborline.archive-rollup.plist"
AR_LOG_OUT="$COORD_DIR/.archive-rollup-stdout.log"
AR_LOG_ERR="$COORD_DIR/.archive-rollup-stderr.log"

# QM daemon
QM_FLAG="$COORD_DIR/.qm-daemon-active"
QM_SCRIPT="$COORD_DIR/qm-daemon.py"
QM_PLIST="$HOME/Library/LaunchAgents/com.harborline.qm-daemon.plist"
QM_LOG_OUT="$COORD_DIR/.qm-daemon-stdout.log"
QM_LOG_ERR="$COORD_DIR/.qm-daemon-stderr.log"
QM_LOG="$COORD_DIR/.qm-daemon.log"

SELF="$0"

# Anchor MAUI/React/Tauri paths
ANCHOR_MAUI_CSPROJ_DIR="$SUNFISH_DIR/src"
ANCHOR_REACT_DIR="$SUNFISH_DIR/apps/web"
ANCHOR_TAURI_DIR="$SUNFISH_DIR/apps/desktop"

# Service process patterns (pgrep -f)
P_BRIDGE="Sunfish.Bridge.AppHost"
P_FLIGHTDECK_BOOK="services/book-server/server"
P_FLIGHTDECK_TURBO="turbo[[:space:]]+dev"
P_ANCHOR_MAUI="Sunfish\\.Anchor|src/bin/.*Anchor"
P_ANCHOR_REACT="sunfish/apps/web.*vite|vite.*sunfish/apps/web"
P_ANCHOR_TAURI="apps/desktop.*tauri|tauri.*apps/desktop"
P_ANCHOR_APP="Anchor\\.app/Contents/MacOS/anchor-tauri"

ANCHOR_APP_USER="$HOME/Applications/Anchor.app"
ANCHOR_APP_SYSTEM="/Applications/Anchor.app"

URL_BRIDGE_ASPIRE="https://localhost:17101"
URL_BRIDGE_API="http://localhost:5253"
URL_FLIGHTDECK_WEB="http://localhost:5173"
URL_FLIGHTDECK_BOOK="http://localhost:3080"
URL_ANCHOR_REACT="http://localhost:5174"

# --- Helpers ---

start_in_terminal() {
  local d="$1" cmd="$2"
  /usr/bin/osascript <<EOF
tell application "Terminal"
  activate
  do script "cd '$d' && $cmd"
end tell
EOF
}

stop_pattern() { /usr/bin/pkill -TERM -f "$1" 2>/dev/null; }
is_running()   { /usr/bin/pgrep -f "$1" >/dev/null 2>&1; }

# --- Action dispatcher ---
case "${1:-}" in
  # --- coordination sync ---
  sync-enable)            /usr/bin/touch "$SYNC_FLAG"; exit 0 ;;
  sync-disable)           /bin/rm -f "$SYNC_FLAG"; exit 0 ;;
  sync-now)
    /bin/echo "[$(date '+%H:%M:%S')] manual sync triggered from menubar" >> "$SYNC_LOG_OUT"
    /usr/bin/nohup /usr/bin/python3 "$SYNC_SCRIPT" -v >> "$SYNC_LOG_OUT" 2>> "$SYNC_LOG_ERR" &
    exit 0 ;;
  sync-reload-launchagent)
    /bin/launchctl unload "$SYNC_PLIST" 2>/dev/null
    /bin/launchctl load "$SYNC_PLIST"
    exit 0 ;;
  sync-unload-launchagent) /bin/launchctl unload "$SYNC_PLIST"; exit 0 ;;
  sync-clear-logs)        : > "$SYNC_LOG_OUT"; : > "$SYNC_LOG_ERR"; exit 0 ;;
  # Backward-compat aliases (legacy v3 action names)
  enable)                 /usr/bin/touch "$SYNC_FLAG"; exit 0 ;;
  disable)                /bin/rm -f "$SYNC_FLAG"; exit 0 ;;
  syncnow)
    /bin/echo "[$(date '+%H:%M:%S')] manual sync triggered from menubar" >> "$SYNC_LOG_OUT"
    /usr/bin/nohup /usr/bin/python3 "$SYNC_SCRIPT" -v >> "$SYNC_LOG_OUT" 2>> "$SYNC_LOG_ERR" &
    exit 0 ;;
  load-launchagent)
    /bin/launchctl unload "$SYNC_PLIST" 2>/dev/null
    /bin/launchctl load "$SYNC_PLIST"
    exit 0 ;;
  unload-launchagent)     /bin/launchctl unload "$SYNC_PLIST"; exit 0 ;;
  clear-logs)             : > "$SYNC_LOG_OUT"; : > "$SYNC_LOG_ERR"; exit 0 ;;

  # --- archive rollup ---
  archive-enable)         /usr/bin/touch "$AR_FLAG"; exit 0 ;;
  archive-disable)        /bin/rm -f "$AR_FLAG"; exit 0 ;;
  archive-dry-run)
    /usr/bin/osascript <<EOF
tell application "Terminal"
  activate
  do script "cd '$COORD_DIR' && /usr/bin/python3 '$AR_SCRIPT' --dry-run"
end tell
EOF
    exit 0 ;;
  archive-real)
    /bin/echo "[$(date '+%H:%M:%S')] manual archive rollup triggered from menubar" >> "$AR_LOG_OUT"
    /usr/bin/nohup /usr/bin/python3 "$AR_SCRIPT" >> "$AR_LOG_OUT" 2>> "$AR_LOG_ERR" &
    exit 0 ;;
  archive-reload-launchagent)
    /bin/launchctl unload "$AR_PLIST" 2>/dev/null
    /bin/launchctl load "$AR_PLIST"
    exit 0 ;;
  archive-unload-launchagent) /bin/launchctl unload "$AR_PLIST"; exit 0 ;;
  archive-clear-logs)     : > "$AR_LOG_OUT"; : > "$AR_LOG_ERR"; exit 0 ;;
  # Legacy aliases
  archive-rollup-now)
    /bin/echo "[$(date '+%H:%M:%S')] manual archive rollup triggered from menubar" >> "$AR_LOG_OUT"
    /usr/bin/nohup /usr/bin/python3 "$AR_SCRIPT" >> "$AR_LOG_OUT" 2>> "$AR_LOG_ERR" &
    exit 0 ;;
  archive-rollup-dryrun)
    /usr/bin/osascript <<EOF
tell application "Terminal"
  activate
  do script "cd '$COORD_DIR' && /usr/bin/python3 '$AR_SCRIPT' --dry-run"
end tell
EOF
    exit 0 ;;
  archive-load-launchagent)
    /bin/launchctl unload "$AR_PLIST" 2>/dev/null
    /bin/launchctl load "$AR_PLIST"
    exit 0 ;;

  # --- QM daemon ---
  qm-enable)              /usr/bin/touch "$QM_FLAG"; exit 0 ;;
  qm-disable)             /bin/rm -f "$QM_FLAG"; exit 0 ;;
  qm-now)
    /usr/bin/nohup /usr/bin/python3 "$QM_SCRIPT" >> "$QM_LOG_OUT" 2>> "$QM_LOG_ERR" &
    exit 0 ;;
  qm-reload-launchagent)
    /bin/launchctl unload "$QM_PLIST" 2>/dev/null
    /bin/launchctl load "$QM_PLIST"
    exit 0 ;;
  qm-unload-launchagent)  /bin/launchctl unload "$QM_PLIST"; exit 0 ;;
  qm-clear-logs)          : > "$QM_LOG_OUT"; : > "$QM_LOG_ERR"; : > "$QM_LOG"; exit 0 ;;

  # --- Signal Bridge ---
  bridge-start)
    start_in_terminal "$SIGNAL_BRIDGE_DIR" "dotnet run --project Sunfish.Bridge.AppHost"
    exit 0 ;;
  bridge-stop)            stop_pattern "$P_BRIDGE"; exit 0 ;;

  # --- Flight Deck ---
  flightdeck-start)       start_in_terminal "$FLIGHT_DECK_DIR" "pnpm dev"; exit 0 ;;
  flightdeck-stop)
    stop_pattern "$P_FLIGHTDECK_BOOK"
    stop_pattern "$P_FLIGHTDECK_TURBO"
    exit 0 ;;

  # --- Sunfish: Anchor MAUI ---
  anchor-maui-start)
    start_in_terminal "$ANCHOR_MAUI_CSPROJ_DIR" "dotnet run --project Sunfish.Anchor.csproj"
    exit 0 ;;
  anchor-maui-stop)       stop_pattern "$P_ANCHOR_MAUI"; exit 0 ;;

  # --- Sunfish: Anchor React ---
  anchor-react-start)     start_in_terminal "$ANCHOR_REACT_DIR" "npm run dev"; exit 0 ;;
  anchor-react-stop)      stop_pattern "$P_ANCHOR_REACT"; exit 0 ;;

  # --- Sunfish: Anchor Tauri ---
  anchor-tauri-start)     start_in_terminal "$ANCHOR_TAURI_DIR" "npm run tauri dev"; exit 0 ;;
  anchor-tauri-stop)      stop_pattern "$P_ANCHOR_TAURI"; exit 0 ;;

  # --- Sunfish: installed Anchor.app ---
  anchor-app-open)
    if [ -d "$ANCHOR_APP_USER" ]; then
      /usr/bin/open "$ANCHOR_APP_USER"
    elif [ -d "$ANCHOR_APP_SYSTEM" ]; then
      /usr/bin/open "$ANCHOR_APP_SYSTEM"
    else
      /usr/bin/osascript -e 'display alert "Anchor.app not found" message "Looked in ~/Applications and /Applications. Build the Anchor desktop app and copy the .app bundle into one of those directories." as critical'
    fi
    exit 0 ;;
  anchor-app-quit)        stop_pattern "$P_ANCHOR_APP"; exit 0 ;;
  anchor-app-reveal)
    if [ -d "$ANCHOR_APP_USER" ]; then
      /usr/bin/open -R "$ANCHOR_APP_USER"
    elif [ -d "$ANCHOR_APP_SYSTEM" ]; then
      /usr/bin/open -R "$ANCHOR_APP_SYSTEM"
    fi
    exit 0 ;;
esac

# ============================================================
# State detection
# ============================================================

# Sync flag + LaunchAgent
if [ -f "$SYNC_FLAG" ]; then
  SYNC_ICON="🚩"; SYNC_STATE="active"; SYNC_COLOR="#2ea44f"
else
  SYNC_ICON="🏳️"; SYNC_STATE="paused"; SYNC_COLOR="#888888"
fi
SYNC_LOADED="no"
/bin/launchctl list 2>/dev/null | /usr/bin/grep -q "com.harborline.coordination-sync" && SYNC_LOADED="yes"

# Archive rollup flag + LaunchAgent
[ -f "$AR_FLAG" ] && AR_STATE="active" || AR_STATE="paused"
AR_LOADED="no"
/bin/launchctl list 2>/dev/null | /usr/bin/grep -q "com.harborline.archive-rollup" && AR_LOADED="yes"

# QM daemon flag + LaunchAgent
[ -f "$QM_FLAG" ] && QM_STATE="active" || QM_STATE="paused"
QM_LOADED="no"
/bin/launchctl list 2>/dev/null | /usr/bin/grep -q "com.harborline.qm-daemon" && QM_LOADED="yes"

# Service state dots
if is_running "$P_BRIDGE";        then BR_DOT="🟢"; BR_STATE="running";  else BR_DOT="⚪"; BR_STATE="stopped";  fi
if is_running "$P_FLIGHTDECK_BOOK" || is_running "$P_FLIGHTDECK_TURBO"; then FD_DOT="🟢"; FD_STATE="running";  else FD_DOT="⚪"; FD_STATE="stopped";  fi
if is_running "$P_ANCHOR_MAUI";   then AM_DOT="🟢"; AM_STATE="running";  else AM_DOT="⚪"; AM_STATE="stopped";  fi
if is_running "$P_ANCHOR_REACT";  then AR_DOT="🟢"; AR_RSTATE="running"; else AR_DOT="⚪"; AR_RSTATE="stopped"; fi
if is_running "$P_ANCHOR_TAURI";  then AT_DOT="🟢"; AT_STATE="running";  else AT_DOT="⚪"; AT_STATE="stopped";  fi
if is_running "$P_ANCHOR_APP";    then AA_DOT="🟢"; AA_STATE="running";  else AA_DOT="⚪"; AA_STATE="stopped";  fi

[ -d "$ANCHOR_REACT_DIR"   ] && AR_EXISTS="yes" || AR_EXISTS="no"
[ -d "$ANCHOR_TAURI_DIR"   ] && AT_EXISTS="yes" || AT_EXISTS="no"
[ -f "$ANCHOR_MAUI_CSPROJ_DIR/Sunfish.Anchor.csproj" ] && AM_EXISTS="yes" || AM_EXISTS="no"

if [ -d "$ANCHOR_APP_USER" ]; then
  AA_EXISTS="yes"; AA_PATH="$ANCHOR_APP_USER"
elif [ -d "$ANCHOR_APP_SYSTEM" ]; then
  AA_EXISTS="yes"; AA_PATH="$ANCHOR_APP_SYSTEM"
else
  AA_EXISTS="no";  AA_PATH=""
fi

# Counts
INBOX_COUNT=$(/bin/ls -1 "$COORD_DIR/inbox/"*.md 2>/dev/null | /usr/bin/wc -l | /usr/bin/tr -d ' ')
ARCHIVE_COUNT=$(/bin/ls -1 "$COORD_DIR/_archive/"*.md 2>/dev/null | /usr/bin/wc -l | /usr/bin/tr -d ' ')
DEEP_COUNT=$(/bin/ls -1 "$COORD_DIR/_archive/_deep/"*.tar.gz 2>/dev/null | /usr/bin/wc -l | /usr/bin/tr -d ' ')

# Recent sync line
LAST_SYNC_LINE=""
if [ -f "$SYNC_LOG_OUT" ]; then
  LAST_SYNC_LINE=$(/usr/bin/tail -n 20 "$SYNC_LOG_OUT" 2>/dev/null \
    | /usr/bin/grep -E "synced|ERROR|manual sync" \
    | /usr/bin/tail -n 1)
fi

# QM last run line (one-line log)
LAST_QM_LINE=""
if [ -f "$QM_LOG" ]; then
  LAST_QM_LINE=$(/usr/bin/tail -n 1 "$QM_LOG" 2>/dev/null)
fi

# Most recent QM findings file (if any)
LAST_FINDINGS_FILE=""
LAST_FINDINGS_FILE=$(/bin/ls -1t "$COORD_DIR/inbox/qm-daemon-status-"*"-findings.md" 2>/dev/null | /usr/bin/head -n 1)

# Aggregate-health dot
AGG_DOT=""
if [ "$BR_STATE" = "running" ] || [ "$FD_STATE" = "running" ] || [ "$AM_STATE" = "running" ] || [ "$AR_RSTATE" = "running" ] || [ "$AT_STATE" = "running" ]; then
  AGG_DOT="·"
fi

# ============================================================
# Menubar title
# ============================================================
echo "🚩$AGG_DOT HBL"
echo "---"

# ============================================================
# Header (size=13 + Menlo info lines)
# ============================================================
echo "Harborline Toolbox — Fleet Operations | size=13 color=$SYNC_COLOR"
echo "Sync: $SYNC_STATE  ·  $INBOX_COUNT inbox  ·  $ARCHIVE_COUNT archived  ·  $DEEP_COUNT deep-archived | font=Menlo size=11 color=#666"
echo "LaunchAgents: sync=$SYNC_LOADED  archive-rollup=$AR_LOADED  qm-daemon=$QM_LOADED | font=Menlo size=11 color=#666"
echo "---"

# ============================================================
# ☂ Coordination services
# ============================================================
echo "☂ Coordination services | size=12"

# --- Sync (60s timer) ---
echo "--Sync (60s)  ·  $SYNC_STATE"
if [ "$SYNC_STATE" = "active" ]; then
  echo "----⏸  Pause sync | shell='$SELF' param0=sync-disable terminal=false refresh=true"
else
  echo "----▶︎  Enable sync | shell='$SELF' param0=sync-enable terminal=false refresh=true"
fi
echo "----↻  Run now (one-shot) | shell='$SELF' param0=sync-now terminal=false refresh=true"
if [ -n "$LAST_SYNC_LINE" ]; then
  SAFE_SYNC=$(echo "$LAST_SYNC_LINE" | /usr/bin/tr '|' '/')
  echo "----Last: $SAFE_SYNC | font=Menlo size=10 color=#888"
else
  echo "----(no recent sync events) | font=Menlo size=10 color=#aaa"
fi
echo "----Open stdout log | shell=/usr/bin/open param0='$SYNC_LOG_OUT' terminal=false"
echo "----Open stderr log | shell=/usr/bin/open param0='$SYNC_LOG_ERR' terminal=false"
echo "----Clear logs | shell='$SELF' param0=sync-clear-logs terminal=false refresh=true"

# --- Archive rollup (weekly) ---
echo "--Archive rollup (weekly Sun 03:00)  ·  $AR_STATE"
if [ "$AR_STATE" = "active" ]; then
  echo "----⏸  Disable weekly rollup | shell='$SELF' param0=archive-disable terminal=false refresh=true"
else
  echo "----▶︎  Enable weekly rollup | shell='$SELF' param0=archive-enable terminal=false refresh=true"
fi
echo "----🔍  Run now (dry-run, opens Terminal) | shell='$SELF' param0=archive-dry-run terminal=false"
echo "----↻  Run now (real) | shell='$SELF' param0=archive-real terminal=false refresh=true"
echo "----Open _deep folder | shell=/usr/bin/open param0='$COORD_DIR/_archive/_deep' terminal=false"
echo "----Open stdout log | shell=/usr/bin/open param0='$AR_LOG_OUT' terminal=false"
echo "----Open stderr log | shell=/usr/bin/open param0='$AR_LOG_ERR' terminal=false"
echo "----Clear logs | shell='$SELF' param0=archive-clear-logs terminal=false refresh=true"

# --- QM daemon (hourly) ---
echo "--QM daemon (hourly)  ·  $QM_STATE"
if [ "$QM_STATE" = "active" ]; then
  echo "----⏸  Pause QM daemon | shell='$SELF' param0=qm-disable terminal=false refresh=true"
else
  echo "----▶︎  Enable QM daemon | shell='$SELF' param0=qm-enable terminal=false refresh=true"
fi
echo "----↻  Run all checks now | shell='$SELF' param0=qm-now terminal=false refresh=true"
if [ -n "$LAST_QM_LINE" ]; then
  SAFE_QM=$(echo "$LAST_QM_LINE" | /usr/bin/tr '|' '/')
  echo "----Last: $SAFE_QM | font=Menlo size=10 color=#888"
else
  echo "----(no QM runs yet) | font=Menlo size=10 color=#aaa"
fi
echo "----Open daemon log | shell=/usr/bin/open param0='$QM_LOG' terminal=false"
echo "----Open stdout log | shell=/usr/bin/open param0='$QM_LOG_OUT' terminal=false"
echo "----Open stderr log | shell=/usr/bin/open param0='$QM_LOG_ERR' terminal=false"
if [ -n "$LAST_FINDINGS_FILE" ] && [ -f "$LAST_FINDINGS_FILE" ]; then
  echo "----📄 Open most recent findings | shell=/usr/bin/open param0='$LAST_FINDINGS_FILE' terminal=false"
fi
echo "----Clear logs | shell='$SELF' param0=qm-clear-logs terminal=false refresh=true"

echo "---"

# ============================================================
# 🛠 Dev services
# ============================================================
echo "🛠 Dev services | size=12"

# --- Bridge ---
echo "--Signal-Bridge $BR_DOT  ·  $BR_STATE"
if [ "$BR_STATE" = "running" ]; then
  echo "----◼  Stop Bridge | shell='$SELF' param0=bridge-stop terminal=false refresh=true"
else
  echo "----▶︎  Start Bridge (AppHost) | shell='$SELF' param0=bridge-start terminal=false refresh=true"
fi
echo "----Open Aspire dashboard | shell=/usr/bin/open param0='$URL_BRIDGE_ASPIRE' terminal=false"
echo "----Open Bridge API | shell=/usr/bin/open param0='$URL_BRIDGE_API' terminal=false"
echo "----Open AppHost folder | shell=/usr/bin/open param0='$SIGNAL_BRIDGE_DIR/Sunfish.Bridge.AppHost' terminal=false"

# --- Flight Deck ---
echo "--Flight Deck $FD_DOT  ·  $FD_STATE"
if [ "$FD_STATE" = "running" ]; then
  echo "----◼  Stop Flight Deck | shell='$SELF' param0=flightdeck-stop terminal=false refresh=true"
else
  echo "----▶︎  Start Flight Deck (pnpm dev) | shell='$SELF' param0=flightdeck-start terminal=false refresh=true"
fi
echo "----Open web (vite) | shell=/usr/bin/open param0='$URL_FLIGHTDECK_WEB' terminal=false"
echo "----Open book-server | shell=/usr/bin/open param0='$URL_FLIGHTDECK_BOOK' terminal=false"

# --- Sunfish (submenu: App / MAUI / React / Tauri) ---
echo "--Sunfish"
# App
echo "----App $AA_DOT  ·  $AA_STATE"
if [ "$AA_EXISTS" = "no" ]; then
  echo "------(not installed — copy Anchor.app to ~/Applications) | color=#c33 font=Menlo size=10"
elif [ "$AA_STATE" = "running" ]; then
  echo "------◼  Quit Anchor.app | shell='$SELF' param0=anchor-app-quit terminal=false refresh=true"
  echo "------↑  Bring to front | shell='$SELF' param0=anchor-app-open terminal=false refresh=true"
  echo "------Reveal in Finder | shell='$SELF' param0=anchor-app-reveal terminal=false"
else
  echo "------▶︎  Open Anchor.app | shell='$SELF' param0=anchor-app-open terminal=false refresh=true"
  echo "------Reveal in Finder | shell='$SELF' param0=anchor-app-reveal terminal=false"
fi
# MAUI
echo "----MAUI $AM_DOT  ·  $AM_STATE"
if [ "$AM_EXISTS" = "no" ]; then
  echo "------(Sunfish.Anchor.csproj not found) | color=#c33 font=Menlo size=10"
elif [ "$AM_STATE" = "running" ]; then
  echo "------◼  Stop | shell='$SELF' param0=anchor-maui-stop terminal=false refresh=true"
else
  echo "------▶︎  Start (dotnet run) | shell='$SELF' param0=anchor-maui-start terminal=false refresh=true"
fi
echo "------Open MAUI folder | shell=/usr/bin/open param0='$ANCHOR_MAUI_CSPROJ_DIR' terminal=false"
# React
echo "----React $AR_DOT  ·  $AR_RSTATE"
if [ "$AR_EXISTS" = "no" ]; then
  echo "------(not on this branch — pull main first) | color=#c33 font=Menlo size=10"
elif [ "$AR_RSTATE" = "running" ]; then
  echo "------◼  Stop | shell='$SELF' param0=anchor-react-stop terminal=false refresh=true"
  echo "------Open in browser | shell=/usr/bin/open param0='$URL_ANCHOR_REACT' terminal=false"
else
  echo "------▶︎  Start (npm run dev) | shell='$SELF' param0=anchor-react-start terminal=false refresh=true"
fi
# Tauri
echo "----Tauri $AT_DOT  ·  $AT_STATE"
if [ "$AT_EXISTS" = "no" ]; then
  echo "------(not on this branch — pull main first) | color=#c33 font=Menlo size=10"
elif [ "$AT_STATE" = "running" ]; then
  echo "------◼  Stop | shell='$SELF' param0=anchor-tauri-stop terminal=false refresh=true"
else
  echo "------▶︎  Start (npm run tauri dev) | shell='$SELF' param0=anchor-tauri-start terminal=false refresh=true"
fi

echo "---"

# ============================================================
# 📂 Folders
# ============================================================
echo "📂 Folders | size=11"
echo "--Coordination | shell=/usr/bin/open param0='$COORD_DIR' terminal=false"
echo "--Inbox | shell=/usr/bin/open param0='$COORD_DIR/inbox' terminal=false"
echo "--Archive | shell=/usr/bin/open param0='$COORD_DIR/_archive' terminal=false"
echo "--Deep archive | shell=/usr/bin/open param0='$COORD_DIR/_archive/_deep' terminal=false"
echo "--Heartbeats | shell=/usr/bin/open param0='$COORD_DIR/heartbeats' terminal=false"
echo "--Shipyard repo | shell=/usr/bin/open param0='$SHIPYARD_DIR' terminal=false"
echo "--Sunfish repo | shell=/usr/bin/open param0='$SUNFISH_DIR' terminal=false"
echo "--Signal Bridge repo | shell=/usr/bin/open param0='$SIGNAL_BRIDGE_DIR' terminal=false"
echo "--Flight Deck repo | shell=/usr/bin/open param0='$FLIGHT_DECK_DIR' terminal=false"
echo "--Fleet root | shell=/usr/bin/open param0='$ROOT_DIR' terminal=false"

echo "---"

# ============================================================
# 🔧 LaunchAgents
# ============================================================
echo "🔧 LaunchAgents | size=11"
echo "--coordination-sync ($SYNC_LOADED)"
if [ "$SYNC_LOADED" = "yes" ]; then
  echo "----Reload | shell='$SELF' param0=sync-reload-launchagent terminal=false refresh=true"
  echo "----Unload | shell='$SELF' param0=sync-unload-launchagent terminal=false refresh=true"
else
  echo "----Load | shell='$SELF' param0=sync-reload-launchagent terminal=false refresh=true"
fi
echo "----Edit plist | shell=/usr/bin/open param0='$SYNC_PLIST' terminal=false"

echo "--qm-daemon ($QM_LOADED)"
if [ "$QM_LOADED" = "yes" ]; then
  echo "----Reload | shell='$SELF' param0=qm-reload-launchagent terminal=false refresh=true"
  echo "----Unload | shell='$SELF' param0=qm-unload-launchagent terminal=false refresh=true"
else
  echo "----Load | shell='$SELF' param0=qm-reload-launchagent terminal=false refresh=true"
fi
echo "----Edit plist | shell=/usr/bin/open param0='$QM_PLIST' terminal=false"

echo "--archive-rollup ($AR_LOADED)"
if [ "$AR_LOADED" = "yes" ]; then
  echo "----Reload | shell='$SELF' param0=archive-reload-launchagent terminal=false refresh=true"
  echo "----Unload | shell='$SELF' param0=archive-unload-launchagent terminal=false refresh=true"
else
  echo "----Load | shell='$SELF' param0=archive-reload-launchagent terminal=false refresh=true"
fi
echo "----Edit plist | shell=/usr/bin/open param0='$AR_PLIST' terminal=false"

echo "---"
echo "Refresh now | refresh=true"
