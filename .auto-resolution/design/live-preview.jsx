// LivePreview — the studio version of the Tender menu. Reads from a theme
// produced by getTheme(paletteId, mode) and from an icon kind. The user
// drives both via the tweaks panel.
//
// Layout is the Harbor Manifest style — dense, modern, theme-portable.
// Wallpaper + taskbar adopt the theme so the menu reads in context.

// Icon dispatch — only one mark now (the fleur PNG via COMPASS_VARIANTS).
// Kept the wrapper so the menu doesn't have to import the-mark.jsx directly.
function ThemedIcon({ kind, size = 32, palette, whiten = false }) {
  const cv = (window.COMPASS_VARIANTS || []).find(v => v.id === kind);
  if (cv) return <cv.C size={size} palette={palette} whiten={whiten}/>;
  return null;
}

const ICON_KINDS = [
  { id:'tm-fleur', name:'The Mark · Engine Room fleur' },
];

// Lucide-style settings gear — the cog used wherever a "settings"
// affordance is needed (in-menu gear button, settings-popup header
// badge). NOT used for the app tray icon — that's the fleur (ThemedIcon).
function GearGlyph({ size = 18, color = 'currentColor', strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

// Platform dispatcher — picks the macOS menu bar or the Windows taskbar
// based on `os`. Same children (the dropdown menu) hang from the gear
// tray icon in either chrome.
function LiveDesktop({ theme, children, palette, icon, os = 'mac', mode = 'dark' }) {
  if (os === 'win') {
    return <WinDesktop theme={theme} palette={palette} icon={icon} mode={mode}>{children}</WinDesktop>;
  }
  return <MacDesktop theme={theme} palette={palette} icon={icon} mode={mode}>{children}</MacDesktop>;
}

// The desktop frame, macOS-style: menu bar at the top, the menu panel
// hangs DOWN from below the gear tray icon (which sits in the right-hand
// side of the menu bar, where macOS menu-bar accessories live).
function MacDesktop({ theme, children, palette, icon, mode = 'dark' }) {
  const txt = theme.menuBarText || theme.taskbarText;
  const dim = theme.menuBarDim  || theme.taskbarDim;
  return (
    <div style={{
      position:'relative', width:'100%', height:'100%',
      background: theme.wallpaper,
      overflow:'hidden',
      fontFamily:"system-ui, -apple-system, 'SF Pro Text', sans-serif",
    }}>
      {/* macOS menu bar */}
      <div style={{
        position:'absolute', left:0, right:0, top:0, height: 28,
        background: theme.menuBar || theme.taskbar,
        borderBottom: `1px solid ${theme.menuBarBorder || theme.taskbarBorder}`,
        backdropFilter:'blur(20px) saturate(180%)',
        WebkitBackdropFilter:'blur(20px) saturate(180%)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 12px 0 14px',
        color: txt, fontSize: 13,
        zIndex: 5,
      }}>
        {/* Left side — Apple + app menus */}
        <div style={{display:'flex', alignItems:'center', gap: 16}}>
          <svg width="13" height="14" viewBox="0 0 13 14" fill={txt} style={{marginTop: -1}}>
            <path d="M9.5 1.5c-.4.4-1 .6-1.5.5 0-.5.2-1 .6-1.4.4-.4 1-.5 1.5-.5-.1.5-.3 1-.6 1.4z"/>
            <path d="M11.5 9.3c-.3.7-.7 1.4-1.2 1.9-.5.5-1 .7-1.5.7-.5 0-1-.2-1.5-.4-.4-.2-.8-.3-1.3-.3-.5 0-.9.1-1.3.3-.5.2-1 .4-1.5.4-.5 0-1-.2-1.5-.7C1 9.7.6 7.4 1.7 5.6c.7-1.2 1.9-1.9 3.1-1.9.5 0 1 .1 1.5.3.5.2.8.3 1.1.3.3 0 .7-.1 1.2-.3.5-.2 1-.3 1.5-.3 1.2 0 2.3.6 3 1.7-.7.4-1.2 1.1-1.2 2 0 .9.4 1.6 1.2 2-.1 0-.1.1 0 0z"/>
          </svg>
          <span style={{fontWeight: 600, fontSize: 13}}>Finder</span>
          <span style={{opacity: 0.85}}>File</span>
          <span style={{opacity: 0.85}}>Edit</span>
          <span style={{opacity: 0.85}}>View</span>
          <span style={{opacity: 0.85}}>Go</span>
          <span style={{opacity: 0.85}}>Window</span>
          <span style={{opacity: 0.85}}>Help</span>
        </div>
        {/* Right side — system status icons + Tender + clock */}
        <div style={{display:'flex', alignItems:'center', gap: 13}}>
          {/* Battery */}
          <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
            <rect x="0.6" y="0.6" width="18.8" height="9.8" rx="1.6" fill="none" stroke={txt} strokeWidth="0.9" opacity="0.85"/>
            <rect x="20.2" y="3.4" width="1.4" height="4.2" rx="0.4" fill={txt} opacity="0.85"/>
            <rect x="1.8" y="1.8" width="13" height="7.4" rx="0.7" fill={txt} opacity="0.85"/>
          </svg>
          {/* Wi-Fi */}
          <svg width="15" height="11" viewBox="0 0 15 11" fill={txt} opacity="0.9">
            <path d="M7.5 1c-2.6 0-5 1-6.7 2.8l1.4 1.4C3.6 3.8 5.5 3 7.5 3s3.9.8 5.3 2.2l1.4-1.4C12.5 2 10.1 1 7.5 1z"/>
            <path d="M7.5 4.5C5.7 4.5 4 5.2 2.8 6.4l1.5 1.5C5.1 7.1 6.3 6.5 7.5 6.5c1.2 0 2.4.6 3.2 1.4l1.5-1.5C11 5.2 9.3 4.5 7.5 4.5z"/>
            <circle cx="7.5" cy="9.2" r="1.4"/>
          </svg>
          {/* Spotlight search */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="5.8" cy="5.8" r="4" stroke={txt} strokeWidth="1.2" opacity="0.85"/>
            <line x1="8.8" y1="8.8" x2="12.5" y2="12.5" stroke={txt} strokeWidth="1.2" strokeLinecap="round" opacity="0.85"/>
          </svg>
          {/* Control Center stack */}
          <svg width="13" height="13" viewBox="0 0 13 13" fill={txt} opacity="0.85">
            <rect x="0.5" y="0.5" width="5.5" height="5.5" rx="1"/>
            <rect x="7" y="0.5" width="5.5" height="5.5" rx="1"/>
            <rect x="0.5" y="7" width="5.5" height="5.5" rx="1"/>
            <rect x="7" y="7" width="5.5" height="5.5" rx="1"/>
          </svg>
          {/* Tender tray button — the menu-bar accessory. The fleur app
              icon. Highlighted because the panel is open (macOS shows
              the active menu-bar item this way). */}
          <div style={{
            width: 22, height: 22, borderRadius: 4,
            display:'flex', alignItems:'center', justifyContent:'center',
            background: `${theme.accent}22`,
            outline: `1px solid ${theme.accent}66`,
            overflow:'hidden',
          }}>
            <div style={{width: 18, height: 18, borderRadius: 3, overflow:'hidden'}}>
              <ThemedIcon kind={icon} size={18} palette={palette} whiten={mode === 'dark'}/>
            </div>
          </div>
          {/* Clock */}
          <span style={{fontSize: 13, letterSpacing: 0.1}}>Tue 2:08 PM</span>
        </div>
      </div>

      {/* The menu panel — hangs DOWN from the menu bar, anchored to the
          right (where the gear tray icon sits). 8 px gap below the bar so
          the panel feels detached, characteristic of macOS dropdown menus */}
      <div style={{
        position:'absolute', right: 14, top: 36,
        display:'flex', justifyContent:'flex-end',
        zIndex: 4,
      }}>
        {children}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// WinDesktop — Windows-11-style frame, with the taskbar pinned to the
// BOTTOM of the screen (the Win 11 default). The Tender tray button
// sits at the FAR RIGHT of the taskbar as a gear glyph and doubles as
// the launcher — the dropdown menu pops UP from it.
// ──────────────────────────────────────────────────────────────────────────
function WinDesktop({ theme, children, palette, icon, mode = 'dark' }) {
  const txt = theme.taskbarText || theme.menuBarText;
  const dim = theme.taskbarDim  || theme.menuBarDim;
  const a   = theme.accent;
  // Centered pinned apps (Win 11 default look). Drawn as small monochrome
  // glyphs so they read as system icons rather than competing with the
  // Engine Room palette.
  const pinned = ['edge', 'explorer', 'store', 'mail', 'terminal'];
  return (
    <div style={{
      position:'relative', width:'100%', height:'100%',
      background: theme.wallpaper,
      overflow:'hidden',
      fontFamily:"'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Windows taskbar — bottom edge (Win 11 default) */}
      <div style={{
        position:'absolute', left:0, right:0, bottom:0, height: 40,
        background: theme.taskbar || theme.menuBar,
        borderTop: `1px solid ${theme.taskbarBorder || theme.menuBarBorder}`,
        backdropFilter:'blur(28px) saturate(180%)',
        WebkitBackdropFilter:'blur(28px) saturate(180%)',
        display:'grid',
        gridTemplateColumns:'1fr auto 1fr',
        alignItems:'center',
        padding:'0 8px',
        color: txt, fontSize: 12,
        zIndex: 5,
      }}>
        {/* Left — Widgets pill (Win 11 "weather" widget area) */}
        <div style={{display:'flex', alignItems:'center', gap: 8, paddingLeft: 6}}>
          <div style={{
            display:'flex', alignItems:'center', gap: 7,
            padding:'4px 10px 4px 7px',
            borderRadius: 6,
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.06)',
          }}>
            {/* sun-cloud */}
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
              <circle cx="5.5" cy="6" r="2.6" fill={`${txt}`} opacity="0.85"/>
              <path d="M3 11 C 3 8.5 5 7.5 6.5 8 C 7 6 9.5 6 10 8 C 12 8 13 9.5 12.5 11 Z" fill={`${txt}`}/>
            </svg>
            <span style={{fontSize: 11.5, letterSpacing: 0.1}}>11°</span>
            <span style={{fontSize: 10.5, color: dim, letterSpacing: 0.1}}>Reykjavík</span>
          </div>
        </div>

        {/* Center — pinned app row + Start (gear leftmost is a generic
            "all apps" launcher; the Tender gear is at far right of tray) */}
        <div style={{display:'flex', alignItems:'center', gap: 4}}>
          {/* Start button — Windows logo (4-pane) */}
          <button style={{
            width: 30, height: 30, borderRadius: 5,
            display:'flex', alignItems:'center', justifyContent:'center',
            background:'transparent', border:'none', cursor:'pointer',
            color: txt,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill={txt} opacity="0.9">
              <rect x="0" y="0"  width="6" height="6" rx="0.5"/>
              <rect x="8" y="0"  width="6" height="6" rx="0.5"/>
              <rect x="0" y="8"  width="6" height="6" rx="0.5"/>
              <rect x="8" y="8"  width="6" height="6" rx="0.5"/>
            </svg>
          </button>
          {/* Search pill */}
          <div style={{
            display:'flex', alignItems:'center', gap: 7,
            padding:'5px 11px 5px 9px',
            borderRadius: 99,
            background:'rgba(255,255,255,0.05)',
            border:'1px solid rgba(255,255,255,0.08)',
            color: dim,
            fontSize: 11,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="5" cy="5" r="3.4" stroke={dim} strokeWidth="1.2"/>
              <line x1="7.5" y1="7.5" x2="10.5" y2="10.5" stroke={dim} strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span style={{letterSpacing: 0.1}}>Search</span>
          </div>
          {pinned.map((p) => (
            <button key={p} title={p} style={{
              width: 30, height: 30, borderRadius: 5,
              display:'flex', alignItems:'center', justifyContent:'center',
              background:'transparent', border:'none', cursor:'pointer',
              color: txt,
            }}>
              <PinnedAppGlyph kind={p} color={txt}/>
            </button>
          ))}
        </div>

        {/* Right — system tray. Wifi/volume/battery + Tender gear + clock */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'flex-end', gap: 4, paddingRight: 2}}>
          {/* Tray icons group */}
          <div style={{
            display:'flex', alignItems:'center', gap: 8,
            padding:'5px 9px',
            borderRadius: 5,
          }}>
            {/* Wi-Fi */}
            <svg width="14" height="11" viewBox="0 0 14 11" fill={txt} opacity="0.9">
              <path d="M7 1c-2.4 0-4.7 1-6.3 2.7l1.4 1.4C3.4 3.7 5.1 3 7 3s3.6.7 4.9 2.1l1.4-1.4C11.7 2 9.4 1 7 1z"/>
              <path d="M7 4.3c-1.6 0-3.2.7-4.3 1.8l1.4 1.4C4.9 6.7 5.9 6.3 7 6.3c1.1 0 2.1.4 2.9 1.2l1.4-1.4C10.2 5 8.6 4.3 7 4.3z"/>
              <circle cx="7" cy="9" r="1.2"/>
            </svg>
            {/* Volume */}
            <svg width="13" height="11" viewBox="0 0 13 11" fill={txt} opacity="0.9">
              <path d="M0.5 4 L 3 4 L 6 1.5 L 6 9.5 L 3 7 L 0.5 7 Z"/>
              <path d="M8 3.5 Q 9.5 5.5 8 7.5" stroke={txt} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.7"/>
              <path d="M9.5 2 Q 12 5.5 9.5 9" stroke={txt} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.4"/>
            </svg>
            {/* Battery */}
            <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
              <rect x="0.6" y="1" width="18.8" height="9" rx="1.4" fill="none" stroke={txt} strokeWidth="0.9" opacity="0.85"/>
              <rect x="20.2" y="3.6" width="1.4" height="3.8" rx="0.4" fill={txt} opacity="0.85"/>
              <rect x="1.8" y="2.2" width="13" height="6.6" rx="0.5" fill={txt} opacity="0.85"/>
            </svg>
          </div>

          {/* Tender tray button — the launcher. The fleur app icon.
              Highlighted because the panel is open (Win 11 shows the
              active tray item as a translucent tile with a tinted
              background). */}
          <button style={{
            width: 30, height: 30, borderRadius: 5,
            display:'flex', alignItems:'center', justifyContent:'center',
            background: `${a}22`,
            border: `1px solid ${a}66`,
            cursor:'pointer',
            color: txt,
            boxShadow: `0 0 8px ${a}44, inset 0 0 6px ${a}1a`,
            position:'relative',
            padding: 0,
          }} title="Tender · Engine Room">
            <div style={{width: 20, height: 20, borderRadius: 3, overflow:'hidden'}}>
              <ThemedIcon kind={icon} size={20} palette={palette} whiten={mode === 'dark'}/>
            </div>
            {/* Win 11 active-app indicator — a small pill on the edge
                nearest the screen edge. Taskbar sits at the bottom, so
                the pill rides the bottom of the icon. */}
            <span style={{
              position:'absolute', bottom: -4, left:'50%',
              transform:'translateX(-50%)',
              width: 8, height: 2, borderRadius: 99,
              background: a, boxShadow: `0 0 4px ${a}, 0 0 8px ${a}88`,
            }}/>
          </button>

          {/* Clock — two lines, Win 11 style (time + date) */}
          <div style={{
            display:'flex', flexDirection:'column', alignItems:'flex-end',
            padding:'3px 8px 3px 6px',
            lineHeight: 1.05,
            letterSpacing: 0.1,
          }}>
            <span style={{fontSize: 11.5}}>2:08 PM</span>
            <span style={{fontSize: 10, color: dim}}>5/14/2026</span>
          </div>
        </div>
      </div>

      {/* The menu pops UP from the gear tray button on the far right,
          anchored above the taskbar (Win 11 system-tray flyout) */}
      <div style={{
        position:'absolute', right: 12, bottom: 48,
        display:'flex', justifyContent:'flex-end',
        zIndex: 4,
      }}>
        {children}
      </div>
    </div>
  );
}

// Tiny monochrome glyphs for the pinned-app row in the Windows taskbar.
function PinnedAppGlyph({ kind, color }) {
  const s = 16;
  switch (kind) {
    case 'edge':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.2" opacity="0.9"/>
          <path d="M3.5 9.5 Q 8 5 12.5 8" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.9"/>
        </svg>
      );
    case 'explorer':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M2 5 L 2 12 L 14 12 L 14 6 L 8 6 L 6.5 4.5 L 2 4.5 Z"
                stroke={color} strokeWidth="1.1" fill="none" strokeLinejoin="round" opacity="0.9"/>
        </svg>
      );
    case 'store':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M3 3 L 13 3 L 12.5 6 L 3.5 6 Z" stroke={color} strokeWidth="1" fill="none" opacity="0.9"/>
          <rect x="3.5" y="6" width="9" height="7" stroke={color} strokeWidth="1" fill="none" opacity="0.9"/>
        </svg>
      );
    case 'mail':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect x="2" y="4" width="12" height="8.5" rx="0.8" stroke={color} strokeWidth="1.1" fill="none" opacity="0.9"/>
          <path d="M2.5 4.5 L 8 9 L 13.5 4.5" stroke={color} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.9"/>
        </svg>
      );
    case 'terminal':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="3" width="13" height="10" rx="1" stroke={color} strokeWidth="1.1" fill="none" opacity="0.9"/>
          <path d="M3.5 6 L 6 8 L 3.5 10" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
          <line x1="7.5" y1="10" x2="11.5" y2="10" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.9"/>
        </svg>
      );
    default: return null;
  }
}

// Bell glyph local re-render so its stroke color follows the theme.
function ThemedBell({ size = 12, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10 C 3 6, 4.5 4, 7 4 C 9.5 4, 11 6, 11 10 Z"/>
      <path d="M2 10 L 12 10"/>
      <path d="M6 12 L 8 12"/>
      <circle cx="7" cy="2.5" r="0.8" fill={color}/>
    </svg>
  );
}

function ThemedChev({ size = 9, color, opacity = 0.45 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" opacity={opacity}>
      <path d="M3 1.5 L6.5 5 L3 8.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// CONSOLE MENU — the Engine Room control console rendered as a Windows tray
// popup. Nine entries (helm node, three service consoles, services grid,
// fiber traces, local node, settings, shutdown), each presented as a
// frosted-steel plate with electric-blue fiber-optic dividers between
// them. The dividers carry a slow pulse to suggest live link traffic.
// ──────────────────────────────────────────────────────────────────────────

// Inject pulse keyframes once. Used by the fiber-optic divider lines.
(function injectPulseStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('console-pulse-styles')) return;
  const s = document.createElement('style');
  s.id = 'console-pulse-styles';
  s.textContent = `
    @keyframes consoleFiberPulse {
      0%, 100% { opacity: 0.55; }
      50%      { opacity: 1; }
    }
  `;
  document.head.appendChild(s);
})();

function FiberDivider({ color, dim = false, pulse = true }) {
  const intensity = dim ? '55' : 'cc';
  const glowAlpha = dim ? '22' : '55';
  return (
    <div style={{
      position:'relative', height: 1, margin: 0,
    }}>
      <div style={{
        position:'absolute', inset: 0,
        background: `linear-gradient(90deg, transparent 0%, ${color}${intensity} 30%, ${color}${intensity} 70%, transparent 100%)`,
        boxShadow: `0 0 ${dim ? '4px' : '6px'} ${color}${glowAlpha}`,
        animation: pulse ? `consoleFiberPulse ${dim ? 5 : 3}s ease-in-out infinite` : undefined,
      }}/>
    </div>
  );
}

// Small indicators that prefix each menu row — port lights, grids, gears.
function ConsoleIndicator({ kind, color, active, dimColor }) {
  const dim   = active ? color : (dimColor || 'rgba(220,230,240,0.32)');
  const glow  = active ? `0 0 6px ${color}` : 'none';
  switch (kind) {
    case 'port':
      return (
        <div style={{
          width: 10, height: 10, borderRadius: 99,
          border: `1px solid ${dim}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: glow,
        }}>
          <div style={{width: 3.5, height: 3.5, borderRadius: 99, background: dim, boxShadow: glow}}/>
        </div>
      );
    case 'grid':
      return (
        <svg width="11" height="11" viewBox="0 0 11 11">
          <rect x="0.5" y="0.5" width="4" height="4" fill={dim}/>
          <rect x="6.5" y="0.5" width="4" height="4" fill={dim} opacity="0.6"/>
          <rect x="0.5" y="6.5" width="4" height="4" fill={dim} opacity="0.6"/>
          <rect x="6.5" y="6.5" width="4" height="4" fill={dim}/>
        </svg>
      );
    case 'wave':
      return (
        <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
          <path d="M0 2 Q 3 0.3 6 2 T 12 2" stroke={dim} strokeWidth="1.1" strokeLinecap="round"/>
          <path d="M0 5.5 Q 3 3.8 6 5.5 T 12 5.5" stroke={dim} strokeWidth="1.1" strokeLinecap="round"/>
          <path d="M0 9 Q 3 7.3 6 9 T 12 9" stroke={dim} strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
      );
    case 'cpu':
      return (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <rect x="2.5" y="2.5" width="6" height="6" fill="none" stroke={dim} strokeWidth="1"/>
          <rect x="4.2" y="4.2" width="2.6" height="2.6" fill={dim} opacity="0.5"/>
          {[0,1,2].map(i => (
            <React.Fragment key={i}>
              <line x1="0" y1={3.5+i*1.6} x2="2.5" y2={3.5+i*1.6} stroke={dim} strokeWidth="1"/>
              <line x1="8.5" y1={3.5+i*1.6} x2="11" y2={3.5+i*1.6} stroke={dim} strokeWidth="1"/>
              <line x1={3.5+i*1.6} y1="0" x2={3.5+i*1.6} y2="2.5" stroke={dim} strokeWidth="1"/>
              <line x1={3.5+i*1.6} y1="8.5" x2={3.5+i*1.6} y2="11" stroke={dim} strokeWidth="1"/>
            </React.Fragment>
          ))}
        </svg>
      );
    case 'cog': {
      const teeth = [];
      for (let i = 0; i < 6; i++) {
        const r = (Math.PI * 2 * i) / 6;
        const x1 = 5.5 + Math.cos(r) * 3.6;
        const y1 = 5.5 + Math.sin(r) * 3.6;
        const x2 = 5.5 + Math.cos(r) * 5;
        const y2 = 5.5 + Math.sin(r) * 5;
        teeth.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={dim} strokeWidth="1.2" strokeLinecap="round"/>);
      }
      return (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <circle cx="5.5" cy="5.5" r="2.4" fill="none" stroke={dim} strokeWidth="1.1"/>
          {teeth}
        </svg>
      );
    }
    case 'power':
      return (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M5.5 1.5 L 5.5 5.5" stroke={dim} strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M2.5 4 A 4 4 0 1 0 8.5 4" stroke={dim} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
        </svg>
      );
    case 'yard':
      // Refit yard: a small crate with an upward arrow (updates available)
      return (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <rect x="1.5" y="5" width="8" height="5" fill="none" stroke={dim} strokeWidth="1.1"/>
          <path d="M5.5 1 L 5.5 5" stroke={dim} strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M3.8 2.5 L 5.5 1 L 7.2 2.5" stroke={dim} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'comms':
      // Crew comms: a stylized speech bubble + small antenna pip
      return (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M1.5 2.5 L 9.5 2.5 L 9.5 7.5 L 6 7.5 L 4 9.5 L 4 7.5 L 1.5 7.5 Z" stroke={dim} strokeWidth="1.1" fill="none" strokeLinejoin="round"/>
          <circle cx="4" cy="5" r="0.6" fill={dim}/>
          <circle cx="5.5" cy="5" r="0.6" fill={dim}/>
          <circle cx="7" cy="5" r="0.6" fill={dim}/>
        </svg>
      );
    default:
      return null;
  }
}

function ConsoleRow({ theme, indicator, name, subLabel, meter, nested, active, danger, onClick, badge }) {
  const a = theme.accent;
  const dangerColor = danger ? theme.danger : null;
  const nameColor   = dangerColor || theme.text;
  const meterColor  = dangerColor || (active ? theme.accentBright : theme.textDim);
  return (
    <div style={{
      padding:'8px 14px 8px 12px',
      display:'flex', alignItems:'center', gap: 11,
      // Frosted-steel plate: subtle vertical gradient + top highlight + bottom shadow
      background: `linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
      borderTop:    `1px solid rgba(255,255,255,0.025)`,
      borderBottom: `1px solid rgba(0,0,0,0.28)`,
      cursor: onClick ? 'pointer' : 'default',
      position:'relative',
    }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.background = `linear-gradient(180deg, ${theme.surface} 0%, ${theme.bgSoft} 100%)`;
        e.currentTarget.style.boxShadow = `inset 0 0 16px ${a}14, inset 2px 0 0 ${a}`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = `linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`;
        e.currentTarget.style.boxShadow = 'none';
      }}>
      {/* Indicator */}
      <div style={{width: 14, display:'flex', alignItems:'center', justifyContent:'center'}}>
        <ConsoleIndicator kind={indicator} color={dangerColor || a} active={active || danger} dimColor={theme.textMuted}/>
      </div>

      {/* Name + sub-label */}
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{fontSize: 12.5, color: nameColor, letterSpacing: 0.1, lineHeight: 1.15}}>{name}</div>
        {subLabel && (
          <div style={{
            fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5,
            letterSpacing: 1.2, textTransform:'uppercase',
            color: dangerColor ? 'rgba(232,117,96,0.65)' : theme.textMuted,
            marginTop: 2,
          }}>{subLabel}</div>
        )}
        {nested && (
          <div style={{
            fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5,
            letterSpacing: 0.8, textTransform:'uppercase',
            color: theme.textMuted, marginTop: 1.5,
          }}>⤷ {nested}</div>
        )}
      </div>

      {/* Meter / status */}
      {meter && (
        <div style={{
          fontFamily:"'JetBrains Mono', monospace", fontSize: 10,
          color: meterColor,
          textShadow: active && !danger ? `0 0 6px ${a}88` : 'none',
          padding:'2px 7px',
          background: active && !danger ? `${a}1a` : 'transparent',
          border: active && !danger ? `1px solid ${a}55` : '1px solid transparent',
          borderRadius: 3,
          letterSpacing: 0.4,
        }}>{meter}</div>
      )}

      {badge}

      <ThemedChev color={dangerColor || theme.textDim} opacity={dangerColor ? 0.7 : 0.6}/>
    </div>
  );
}

function LivePreview({ paletteId, mode, icon, os = 'mac' }) {
  const palette = THEME_PALETTES.find(p => p.id === paletteId) || THEME_PALETTES[0];
  const theme = getTheme(paletteId, mode);
  // Only Variant D · Telegraph Bridge is shipping; legacy A/B/C variants
  // were retired. Pass-through onNavigate is undefined here so the menu
  // renders statically (used by the OS-frames comparison row). The
  // interactive version is StudioStage in detail-screens.jsx.
  return (
    <LiveDesktop theme={theme} palette={palette} icon={icon} os={os} mode={mode}>
      {window.MenuVariantD
        ? <window.MenuVariantD theme={theme} palette={palette} icon={icon}/>
        : null}
    </LiveDesktop>
  );
}

Object.assign(window, {
  LivePreview, LiveDesktop, MacDesktop, WinDesktop, GearGlyph,
  ICON_KINDS, ThemedIcon,
  // exported so menu-variants.jsx can reuse the steampunk vocabulary
  FiberDivider, ConsoleIndicator, ConsoleRow, ThemedChev, ThemedBell,
});
