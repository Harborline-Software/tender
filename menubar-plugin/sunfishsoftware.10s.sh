#!/bin/bash
#
# Harborline-Software coordinator — SwiftBar menubar plugin
#
# Controls:
#   - Coordination sync flag (.sync-active) + LaunchAgent
#   - Bridge AppHost (Sunfish/accelerators/bridge/Sunfish.Bridge.AppHost)
#   - Galley dev (turbo: web + book-server)
#   - Anchor MAUI / Anchor React / Anchor Tauri
#
# Each service: detect running state via pgrep, Start opens Terminal at the right
# directory, Stop sends SIGTERM via pkill. URLs open in default browser.
#
# Install: symlink into ~/Library/Application Support/SwiftBar/Plugins/
# Refresh: every 10s (encoded in filename .10s.sh)
#
# <swiftbar.title>Harborline-Software</swiftbar.title>
# <swiftbar.version>2.0</swiftbar.version>
# <swiftbar.author>XO</swiftbar.author>
# <swiftbar.desc>Control coordination sync + Bridge + Galley + Anchor services</swiftbar.desc>
# <swiftbar.hideAbout>false</swiftbar.hideAbout>
# <swiftbar.hideRunInTerminal>true</swiftbar.hideRunInTerminal>
# <swiftbar.hideLastUpdated>false</swiftbar.hideLastUpdated>
# <swiftbar.hideDisablePlugin>false</swiftbar.hideDisablePlugin>
# <swiftbar.hideSwiftBar>false</swiftbar.hideSwiftBar>

set -u

# --- Paths ---
# COORD_DIR auto-derives from the script's real location (resolves SwiftBar
# plugin-dir symlink). Sibling repos (Sunfish, galley) default to peers of the
# coordination folder. Override via env: SUNFISH_DIR, GALLEY_DIR, COORD_DIR.
_SELF_REAL="$(/usr/bin/python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "${BASH_SOURCE[0]}")"
COORD_DIR="${COORD_DIR:-$(/usr/bin/dirname "$_SELF_REAL")}"
ROOT_DIR="${ROOT_DIR:-$(/usr/bin/dirname "$COORD_DIR")}"
SUNFISH_DIR="${SUNFISH_DIR:-$ROOT_DIR/Sunfish}"
GALLEY_DIR="${GALLEY_DIR:-$ROOT_DIR/galley}"
FLAG="$COORD_DIR/.sync-active"
SCRIPT="$COORD_DIR/sync-coordination.py"
PLIST="$HOME/Library/LaunchAgents/com.sunfish.coordination-sync.plist"
LOG_OUT="$COORD_DIR/.sync-stdout.log"
LOG_ERR="$COORD_DIR/.sync-stderr.log"
SELF="$0"

# Service process patterns (pgrep -f)
P_BRIDGE="Sunfish.Bridge.AppHost"
P_GALLEY_BOOK="services/book-server/server"
P_GALLEY_TURBO="turbo[[:space:]]+dev"
P_ANCHOR_MAUI="Sunfish\\.Anchor|accelerators/anchor/bin"
P_ANCHOR_REACT="apps/anchor-react.*vite|vite.*apps/anchor-react"
P_ANCHOR_TAURI="apps/anchor-tauri.*tauri|tauri.*apps/anchor-tauri"
P_ANCHOR_APP="Anchor\\.app/Contents/MacOS/anchor-tauri"

# Installed Anchor.app paths — user install wins over system.
ANCHOR_APP_USER="$HOME/Applications/Anchor.app"
ANCHOR_APP_SYSTEM="/Applications/Anchor.app"

# Service URLs (sensible defaults; correct via launchSettings/package.json)
URL_BRIDGE_ASPIRE="https://localhost:17101"
URL_BRIDGE_API="http://localhost:5253"
URL_GALLEY_WEB="http://localhost:5173"
URL_GALLEY_BOOK="http://localhost:3080"
URL_ANCHOR_REACT="http://localhost:5174"

# --- Helpers ---

# Run a command in a new Terminal window at a given directory.
# $1 = working dir, $2 = command
start_in_terminal() {
  local d="$1" cmd="$2"
  /usr/bin/osascript <<EOF
tell application "Terminal"
  activate
  do script "cd '$d' && $cmd"
end tell
EOF
}

# Quietly kill processes matching a pattern.
stop_pattern() {
  /usr/bin/pkill -TERM -f "$1" 2>/dev/null
}

is_running() {
  /usr/bin/pgrep -f "$1" >/dev/null 2>&1
}

# --- Action dispatcher ---
case "${1:-}" in
  # --- sync actions ---
  enable)            /usr/bin/touch "$FLAG"; exit 0 ;;
  disable)           /bin/rm -f "$FLAG"; exit 0 ;;
  syncnow)
    /bin/echo "[$(date '+%H:%M:%S')] manual sync triggered from menubar" >> "$LOG_OUT"
    /usr/bin/nohup /usr/bin/python3 "$SCRIPT" -v >> "$LOG_OUT" 2>> "$LOG_ERR" &
    exit 0 ;;
  load-launchagent)
    /bin/launchctl unload "$PLIST" 2>/dev/null
    /bin/launchctl load "$PLIST"
    exit 0 ;;
  unload-launchagent)
    /bin/launchctl unload "$PLIST"; exit 0 ;;
  clear-logs)        : > "$LOG_OUT"; : > "$LOG_ERR"; exit 0 ;;

  # --- Bridge ---
  bridge-start)
    start_in_terminal "$SUNFISH_DIR" "dotnet run --project accelerators/bridge/Sunfish.Bridge.AppHost"
    exit 0 ;;
  bridge-stop)       stop_pattern "$P_BRIDGE"; exit 0 ;;

  # --- Galley ---
  galley-start)      start_in_terminal "$GALLEY_DIR" "npm run dev"; exit 0 ;;
  galley-stop)
    stop_pattern "$P_GALLEY_BOOK"
    stop_pattern "$P_GALLEY_TURBO"
    exit 0 ;;

  # --- Anchor MAUI ---
  anchor-maui-start)
    start_in_terminal "$SUNFISH_DIR" "dotnet run --project accelerators/anchor"
    exit 0 ;;
  anchor-maui-stop)  stop_pattern "$P_ANCHOR_MAUI"; exit 0 ;;

  # --- Anchor React ---
  anchor-react-start)
    start_in_terminal "$SUNFISH_DIR/apps/anchor-react" "npm run dev"
    exit 0 ;;
  anchor-react-stop) stop_pattern "$P_ANCHOR_REACT"; exit 0 ;;

  # --- Anchor Tauri ---
  anchor-tauri-start)
    start_in_terminal "$SUNFISH_DIR/apps/anchor-tauri" "npm run tauri dev"
    exit 0 ;;
  anchor-tauri-stop) stop_pattern "$P_ANCHOR_TAURI"; exit 0 ;;

  # --- Anchor.app (installed production bundle) ---
  anchor-app-open)
    if [ -d "$ANCHOR_APP_USER" ]; then
      /usr/bin/open "$ANCHOR_APP_USER"
    elif [ -d "$ANCHOR_APP_SYSTEM" ]; then
      /usr/bin/open "$ANCHOR_APP_SYSTEM"
    else
      /usr/bin/osascript -e 'display alert "Anchor.app not found" message "Looked in ~/Applications and /Applications. Build the Anchor desktop app and copy the .app bundle into one of those directories." as critical'
    fi
    exit 0 ;;
  anchor-app-quit)   stop_pattern "$P_ANCHOR_APP"; exit 0 ;;
  anchor-app-reveal)
    if [ -d "$ANCHOR_APP_USER" ]; then
      /usr/bin/open -R "$ANCHOR_APP_USER"
    elif [ -d "$ANCHOR_APP_SYSTEM" ]; then
      /usr/bin/open -R "$ANCHOR_APP_SYSTEM"
    fi
    exit 0 ;;
esac

# --- State detection ---
# Icon vocabulary:
#   🚩 (red flag, raised)   = sync active, signaling.
#   🏳️ (white flag, lowered) = sync paused, quiet.
# Alternatives if you want to swap: ⚓ (anchor — naval-coordination metaphor +
#   matches the Anchor app name), ⛵ (sailboat), 🐟 (Sunfish brand).
if [ -f "$FLAG" ]; then
  SYNC_ICON="🚩"; SYNC_STATE="active"; SYNC_COLOR="#2ea44f"
else
  SYNC_ICON="🏳️"; SYNC_STATE="paused"; SYNC_COLOR="#888888"
fi

LAUNCHAGENT_LOADED="no"
if /bin/launchctl list 2>/dev/null | /usr/bin/grep -q "com.sunfish.coordination-sync"; then
  LAUNCHAGENT_LOADED="yes"
fi

INBOX_COUNT=$(/bin/ls -1 "$COORD_DIR/inbox/"*.md 2>/dev/null | /usr/bin/wc -l | /usr/bin/tr -d ' ')
ARCHIVE_COUNT=$(/bin/ls -1 "$COORD_DIR/_archive/"*.md 2>/dev/null | /usr/bin/wc -l | /usr/bin/tr -d ' ')

# Service running checks
if is_running "$P_BRIDGE";        then BR_DOT="🟢"; BR_STATE="running";  else BR_DOT="⚪"; BR_STATE="stopped";  fi
if is_running "$P_GALLEY_BOOK" || is_running "$P_GALLEY_TURBO"; then GA_DOT="🟢"; GA_STATE="running";  else GA_DOT="⚪"; GA_STATE="stopped";  fi
if is_running "$P_ANCHOR_MAUI";   then AM_DOT="🟢"; AM_STATE="running";  else AM_DOT="⚪"; AM_STATE="stopped";  fi
if is_running "$P_ANCHOR_REACT";  then AR_DOT="🟢"; AR_STATE="running";  else AR_DOT="⚪"; AR_STATE="stopped";  fi
if is_running "$P_ANCHOR_TAURI";  then AT_DOT="🟢"; AT_STATE="running";  else AT_DOT="⚪"; AT_STATE="stopped";  fi
if is_running "$P_ANCHOR_APP";    then AA_DOT="🟢"; AA_STATE="running";  else AA_DOT="⚪"; AA_STATE="stopped";  fi

# Working-tree existence checks (warn if not pulled)
[ -d "$SUNFISH_DIR/apps/anchor-react"   ] && AR_EXISTS="yes" || AR_EXISTS="no"
[ -d "$SUNFISH_DIR/apps/anchor-tauri"   ] && AT_EXISTS="yes" || AT_EXISTS="no"

# Installed-bundle existence — surfaces "Open Anchor.app" only when one exists.
if [ -d "$ANCHOR_APP_USER" ]; then
  AA_EXISTS="yes"; AA_PATH="$ANCHOR_APP_USER"
elif [ -d "$ANCHOR_APP_SYSTEM" ]; then
  AA_EXISTS="yes"; AA_PATH="$ANCHOR_APP_SYSTEM"
else
  AA_EXISTS="no";  AA_PATH=""
fi

LAST_LINE=""
if [ -f "$LOG_OUT" ]; then
  LAST_LINE=$(/usr/bin/tail -n 20 "$LOG_OUT" 2>/dev/null \
    | /usr/bin/grep -E "synced|ERROR|manual sync" \
    | /usr/bin/tail -n 1)
fi

# Aggregate-health dot for menubar (any service running = green hint)
AGG_DOT=""
if [ "$BR_STATE" = "running" ] || [ "$GA_STATE" = "running" ] || [ "$AM_STATE" = "running" ] || [ "$AR_STATE" = "running" ] || [ "$AT_STATE" = "running" ]; then
  AGG_DOT="·"
fi

# ============================================================
# Menubar title
# ============================================================
echo "$SYNC_ICON$AGG_DOT SF"
echo "---"

# ============================================================
# Header
# ============================================================
echo "Harborline-Software Coordinator | size=13 color=$SYNC_COLOR"
echo "Sync: $SYNC_STATE ($INBOX_COUNT inbox · $ARCHIVE_COUNT archived) | font=Menlo size=11"
if [ "$LAUNCHAGENT_LOADED" = "yes" ]; then
  echo "LaunchAgent: loaded · fires every 60s | font=Menlo size=11 color=#666"
else
  echo "LaunchAgent: NOT loaded | font=Menlo size=11 color=#c33"
fi
echo "---"

# ============================================================
# Sync section
# ============================================================
if [ "$SYNC_STATE" = "active" ]; then
  echo "⏸  Pause sync | shell='$SELF' param0=disable terminal=false refresh=true"
else
  echo "▶︎  Enable sync | shell='$SELF' param0=enable terminal=false refresh=true"
fi
echo "↻  Sync now (one-shot) | shell='$SELF' param0=syncnow terminal=false refresh=true"
echo "Recent | size=11 color=#666"
if [ -n "$LAST_LINE" ]; then
  SAFE_LAST=$(echo "$LAST_LINE" | /usr/bin/tr '|' '/')
  echo "  $SAFE_LAST | font=Menlo size=10 color=#888"
else
  echo "  (no recent sync events) | font=Menlo size=10 color=#aaa"
fi
if [ -f "$LOG_ERR" ] && [ -s "$LOG_ERR" ]; then
  ERR_TAIL=$(/usr/bin/tail -n 1 "$LOG_ERR" | /usr/bin/tr '|' '/')
  echo "  ⚠ $ERR_TAIL | font=Menlo size=10 color=#c33"
fi
echo "---"

# ============================================================
# Bridge
# ============================================================
echo "Bridge $BR_DOT  ·  $BR_STATE | size=12"
if [ "$BR_STATE" = "running" ]; then
  echo "--◼  Stop Bridge | shell='$SELF' param0=bridge-stop terminal=false refresh=true"
else
  echo "--▶︎  Start Bridge (AppHost) | shell='$SELF' param0=bridge-start terminal=false refresh=true"
fi
echo "--Open Aspire dashboard | shell=/usr/bin/open param0='$URL_BRIDGE_ASPIRE' terminal=false"
echo "--Open Bridge API | shell=/usr/bin/open param0='$URL_BRIDGE_API' terminal=false"
echo "--Open AppHost folder | shell=/usr/bin/open param0='$SUNFISH_DIR/accelerators/bridge' terminal=false"

# ============================================================
# Galley
# ============================================================
echo "Galley $GA_DOT  ·  $GA_STATE | size=12"
if [ "$GA_STATE" = "running" ]; then
  echo "--◼  Stop Galley (turbo + book-server) | shell='$SELF' param0=galley-stop terminal=false refresh=true"
else
  echo "--▶︎  Start Galley (npm run dev) | shell='$SELF' param0=galley-start terminal=false refresh=true"
fi
echo "--Open web (vite) | shell=/usr/bin/open param0='$URL_GALLEY_WEB' terminal=false"
echo "--Open book-server | shell=/usr/bin/open param0='$URL_GALLEY_BOOK' terminal=false"
echo "--Open galley folder | shell=/usr/bin/open param0='$GALLEY_DIR' terminal=false"

# ============================================================
# Anchor (installed .app + 3 dev variants in a submenu)
# ============================================================
echo "Anchor | size=12"

# Installed Anchor.app — the production path; primary action for end users.
echo "--App $AA_DOT  ·  $AA_STATE"
if [ "$AA_EXISTS" = "no" ]; then
  echo "----(not installed — copy Anchor.app to ~/Applications) | color=#c33 font=Menlo size=10"
elif [ "$AA_STATE" = "running" ]; then
  echo "----◼  Quit Anchor.app | shell='$SELF' param0=anchor-app-quit terminal=false refresh=true"
  echo "----↑  Bring to front | shell='$SELF' param0=anchor-app-open terminal=false refresh=true"
  echo "----Reveal in Finder | shell='$SELF' param0=anchor-app-reveal terminal=false"
else
  echo "----▶︎  Open Anchor.app | shell='$SELF' param0=anchor-app-open terminal=false refresh=true"
  echo "----Reveal in Finder | shell='$SELF' param0=anchor-app-reveal terminal=false"
fi

# MAUI
echo "--MAUI $AM_DOT  ·  $AM_STATE"
if [ "$AM_STATE" = "running" ]; then
  echo "----◼  Stop | shell='$SELF' param0=anchor-maui-stop terminal=false refresh=true"
else
  echo "----▶︎  Start (dotnet run) | shell='$SELF' param0=anchor-maui-start terminal=false refresh=true"
fi
echo "----Open MAUI folder | shell=/usr/bin/open param0='$SUNFISH_DIR/accelerators/anchor' terminal=false"

# React
echo "--React $AR_DOT  ·  $AR_STATE"
if [ "$AR_EXISTS" = "no" ]; then
  echo "----(not on this branch — pull main first) | color=#c33 font=Menlo size=10"
elif [ "$AR_STATE" = "running" ]; then
  echo "----◼  Stop | shell='$SELF' param0=anchor-react-stop terminal=false refresh=true"
  echo "----Open in browser | shell=/usr/bin/open param0='$URL_ANCHOR_REACT' terminal=false"
else
  echo "----▶︎  Start (npm run dev) | shell='$SELF' param0=anchor-react-start terminal=false refresh=true"
fi

# Tauri
echo "--Tauri $AT_DOT  ·  $AT_STATE"
if [ "$AT_EXISTS" = "no" ]; then
  echo "----(not on this branch — pull main first) | color=#c33 font=Menlo size=10"
elif [ "$AT_STATE" = "running" ]; then
  echo "----◼  Stop | shell='$SELF' param0=anchor-tauri-stop terminal=false refresh=true"
else
  echo "----▶︎  Start (npm run tauri dev) | shell='$SELF' param0=anchor-tauri-start terminal=false refresh=true"
fi

echo "---"

# ============================================================
# Folders + logs
# ============================================================
echo "Folders"
echo "--Coordination | shell=/usr/bin/open param0='$COORD_DIR' terminal=false"
echo "--Inbox | shell=/usr/bin/open param0='$COORD_DIR/inbox' terminal=false"
echo "--Archive | shell=/usr/bin/open param0='$COORD_DIR/_archive' terminal=false"
echo "--Sunfish repo | shell=/usr/bin/open param0='$SUNFISH_DIR' terminal=false"
echo "--Galley repo | shell=/usr/bin/open param0='$GALLEY_DIR' terminal=false"

echo "Logs"
echo "--Sync stdout | shell=/usr/bin/open param0='$LOG_OUT' terminal=false"
echo "--Sync stderr | shell=/usr/bin/open param0='$LOG_ERR' terminal=false"
echo "--Clear sync logs | shell='$SELF' param0=clear-logs terminal=false refresh=true"

echo "LaunchAgent"
if [ "$LAUNCHAGENT_LOADED" = "yes" ]; then
  echo "--Reload | shell='$SELF' param0=load-launchagent terminal=false refresh=true"
  echo "--Unload | shell='$SELF' param0=unload-launchagent terminal=false refresh=true"
else
  echo "--Load | shell='$SELF' param0=load-launchagent terminal=false refresh=true"
fi
echo "--Edit plist | shell=/usr/bin/open param0='$PLIST' terminal=false"

echo "---"
echo "Refresh now | refresh=true"
