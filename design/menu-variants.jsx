// Menu variants — three additional layouts that share the Engine Room
// vocabulary (frosted-steel plates, fiber-optic dividers, brass rivets,
// cyan glow) but explore different ways to organize the same nine entries.
//
// Variant A (Control Console) lives in live-preview.jsx. This file adds:
//   B — Sectioned Bulkhead: grouped into 3 brass-labeled sections
//   C — Compact Roster: dense single-line rows, less padding
//   D — Telegraph Bridge: 3 service apps as analog dials, others as list

const { useState } = React;

// ─── shared bits ───────────────────────────────────────────────────────────

function MenuShell({ theme, children, width = 360 }) {
  const a = theme.accent;
  return (
    <div style={{
      width,
      position:'relative',
      // macOS dropdown menus are translucent — give the panel a subtle
      // backdrop blur on top of the gradient so the wallpaper bleeds
      // through faintly at the edges.
      background:`linear-gradient(180deg, ${theme.bgSoft}f0 0%, ${theme.bg}f4 100%)`,
      backdropFilter:'blur(20px) saturate(180%)',
      WebkitBackdropFilter:'blur(20px) saturate(180%)',
      border:'1px solid rgba(0,0,0,0.55)',
      borderRadius: 10,
      boxShadow:`0 28px 60px ${theme.shadow}, 0 0 32px ${a}28, 0 0 0 1px ${a}1a`,
      color: theme.text,
      overflow:'hidden',
      fontFamily:"'Space Grotesk', sans-serif",
    }}>
      <FiberDivider color={a}/>
      {children}
    </div>
  );
}

function MenuHeader({ theme, palette, icon, subtitle = 'Helm node · 14 docks online' }) {
  const a = theme.accent;
  return (
    <React.Fragment>
      <div style={{
        padding:'13px 14px 12px',
        display:'flex', alignItems:'center', gap: 11,
        background:`linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
        borderBottom:'1px solid rgba(0,0,0,0.28)',
      }}>
        <div style={{
          borderRadius: 5, overflow:'hidden',
          boxShadow:`0 2px 8px ${theme.shadow}, 0 0 10px ${a}33`,
        }}>
          <ThemedIcon kind={icon} size={28} palette={palette}/>
        </div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontFamily:"'Cormorant Garamond', serif", fontSize: 17, fontWeight: 600, lineHeight: 1, letterSpacing: 0.2}}>
            Harborline <span style={{fontStyle:'italic'}}>Tender</span>
          </div>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: 1.5, color: theme.textMuted, marginTop: 4, textTransform:'uppercase'}}>
            {subtitle}
          </div>
        </div>
        <div style={{
          fontFamily:"'JetBrains Mono', monospace", fontSize: 10,
          color: theme.accentBright,
          background:`${a}22`,
          border:`1px solid ${a}66`,
          borderRadius: 99, padding:'2px 9px',
          display:'flex', alignItems:'center', gap: 6,
          boxShadow:`0 0 10px ${a}44, inset 0 0 6px ${a}22`,
        }}>
          <span style={{width: 5, height: 5, borderRadius: 99, background: a, boxShadow:`0 0 8px ${a}, 0 0 14px ${a}88`}}/>
          334
        </div>
      </div>
      <FiberDivider color={a}/>
    </React.Fragment>
  );
}

// ─── VARIANT D · Telegraph Bridge ─────────────────────────────────────────
// The Telegraph variant lays the menu out as a Bridge: three tabs
// (Fleet / Projects / Services), a workspace dropdown in the header,
// and a gear popover that opens the settings popups. The gauge row that
// used to sit at the top of the Fleet tab was removed (the number of
// installed Harborline tools is variable).


function MenuVariantD({ theme, palette, icon, onNavigate }) {
  const [tab, setTab] = useState('fleet');
  const [wsOpen, setWsOpen] = useState(false);
  const [gearOpen, setGearOpen] = useState(false);
  const [workspace, setWorkspace] = useState('Local');
  const updatesAvailable = 3;
  const a = theme.accent;
  const nav = (id) => () => onNavigate && onNavigate(id);

  return (
    <MenuShell theme={theme} width={360}>
      <TelegraphHeader
        theme={theme} palette={palette} icon={icon}
        workspace={workspace}
        updatesAvailable={updatesAvailable}
        onWorkspaceClick={() => { setWsOpen(o => !o); setGearOpen(false); }}
        onUpdateClick={() => onNavigate && onNavigate('release-notes')}
        onGearClick={() => { setGearOpen(o => !o); setWsOpen(false); }}
      />

      <FiberDivider color={a}/>

      <TabStrip theme={theme} active={tab} onChange={t => { setTab(t); setWsOpen(false); setGearOpen(false); }}/>

      <FiberDivider color={a}/>

      {tab === 'fleet'    && <FleetPanel    theme={theme} nav={nav}/>}
      {tab === 'projects' && <ProjectsPanel theme={theme} nav={nav}/>}
      {tab === 'services' && <ServicesPanel theme={theme} nav={nav}/>}

      {/* Popovers — absolutely positioned over the content area */}
      {wsOpen && (
        <WorkspacePopover theme={theme} active={workspace}
          onSelect={w => {
            setWsOpen(false);
            // "Manage devices…" doesn't change the active device; it would
            // navigate to device-management. For now, treat it like a click
            // that closes the popover and leaves the active selection alone.
            if (w === '__manage__') return;
            setWorkspace(w);
          }}/>
      )}
      {gearOpen && (
        <GearPopover theme={theme}
          onNavigate={(id) => {
            setGearOpen(false);
            // Most gear-popover items map 1:1 to a detail screen by id.
            // A few are aliases for screens that already exist for other
            // entrypoints (Engine Room covers diagnostics/logs; Dock
            // Settings covers Appearance & behavior).
            const map = {
              'appearance': 'dock-settings',
              'logs':       'engine-room',
              'dry-dock':   'dry-dock',
              'about':      'about',
              'faq':        'faq',
              'plugins':    'plugins',
              'proxy':      'proxy',
              'account':    'account',
            };
            if (map[id] && onNavigate) onNavigate(map[id]);
          }}/>
      )}
    </MenuShell>
  );
}

// — Header for Variant D: icon + workspace dropdown + update + gear —
function TelegraphHeader({ theme, palette, icon, workspace, updatesAvailable, onWorkspaceClick, onUpdateClick, onGearClick }) {
  const a = theme.accent;
  const m = theme.metalBright;
  return (
    <div style={{
      padding:'11px 10px 11px 12px',
      display:'flex', alignItems:'center', gap: 8,
      background:`linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
    }}>
      <div style={{
        borderRadius: 5, overflow:'hidden',
        boxShadow:`0 2px 8px ${theme.shadow}, 0 0 10px ${a}33`,
        flexShrink: 0,
      }}>
        <ThemedIcon kind={icon} size={26} palette={palette}/>
      </div>
      <div style={{
        fontFamily:"'Cormorant Garamond', serif", fontStyle:'italic',
        fontSize: 16, fontWeight: 600, lineHeight: 1, letterSpacing: 0.2,
        color: theme.text, flexShrink: 0,
      }}>Tender</div>
      <div style={{flex: 1}}/>

      {/* Workspace dropdown button */}
      <button onClick={onWorkspaceClick} style={{
        background: `${a}1a`,
        border: `1px solid ${a}55`,
        borderRadius: 4, padding:'4px 7px',
        display:'flex', alignItems:'center', gap: 5,
        color: theme.text,
        fontFamily:"'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 0.6,
        cursor:'pointer',
        boxShadow:`0 0 6px ${a}22, inset 0 0 4px ${a}1a`,
      }}>
        <span style={{width: 5, height: 5, borderRadius: 99, background: a, boxShadow:`0 0 4px ${a}, 0 0 8px ${a}88`}}/>
        {workspace}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M2 3 L 4 5 L 6 3" stroke={theme.text} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Update icon — only when there are updates */}
      {updatesAvailable > 0 && (
        <button onClick={onUpdateClick} title={`${updatesAvailable} updates available`} style={{
          position:'relative',
          background:'transparent', border:'none', cursor:'pointer',
          width: 26, height: 26, borderRadius: 4,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}
          onMouseEnter={e => e.currentTarget.style.background = `${m}22`}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1.5 L 6.5 8.5 M 3.5 6 L 6.5 9 L 9.5 6" stroke={m} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 11 L 11 11" stroke={m} strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span style={{
            position:'absolute', top: 3, right: 3,
            width: 6, height: 6, borderRadius: 99, background: m,
            boxShadow: `0 0 4px ${m}, 0 0 8px ${m}aa`,
            border: `1px solid ${theme.bg}`,
          }}/>
        </button>
      )}

      {/* Gear icon */}
      <button onClick={onGearClick} title="Settings" style={{
        background:'transparent', border:'none', cursor:'pointer',
        width: 26, height: 26, borderRadius: 4,
        display:'flex', alignItems:'center', justifyContent:'center',
        color: theme.textDim,
      }}
        onMouseEnter={e => { e.currentTarget.style.background = `${a}22`; e.currentTarget.style.color = theme.text; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textDim; }}>
        <GearGlyph size={15} color="currentColor" strokeWidth={1.6}/>
      </button>
    </div>
  );
}

// — Connected devices popover (Tailscale-style) —
// Lists devices on the tailnet/fleet network with status dots and OS
// pills. Anchors under the workspace dropdown button. Clicking a device
// "switches to" it (button label updates); the trailing row navigates to
// device management.
function WorkspacePopover({ theme, active, onSelect }) {
  const a = theme.accent;
  const m = theme.metalBright;
  const devices = [
    { name: 'Local',           host: 'steamtide-w11',     ip: '100.74.12.1', os: 'WIN', status: 'online', isThis: true },
    { name: 'harbor-mac-air',  host: 'harbor-mac-air',    ip: '100.74.12.4', os: 'MAC', status: 'online' },
    { name: 'harbor-prod-01',  host: 'harbor-prod-01',    ip: '100.74.12.7', os: 'LNX', status: 'online', kind: 'server' },
    { name: 'harbor-test-02',  host: 'harbor-test-02',    ip: '100.74.12.8', os: 'LNX', status: 'idle',   kind: 'server' },
    { name: 'old-sloop-rig',   host: 'old-sloop-rig',     ip: '100.74.13.2', os: 'LNX', status: 'offline', last: '2h ago' },
  ];
  const onlineCount = devices.filter(d => d.status === 'online').length;
  const statusColor = (s) => s === 'online' ? a : s === 'idle' ? m : theme.textMuted;

  return (
    <div style={{
      position:'absolute', right: 78, top: 48,
      zIndex: 10, width: 268,
      background: theme.bg,
      border: `1px solid ${theme.border}`,
      borderRadius: 5,
      boxShadow: `0 12px 30px ${theme.shadow}, 0 0 16px ${a}33`,
      overflow:'hidden',
      fontFamily:"'Space Grotesk', sans-serif",
    }}>
      {/* Header strip — small section label */}
      <div style={{
        padding:'8px 12px 6px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:`linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
        borderBottom: `1px solid ${theme.border}`,
      }}>
        <span style={{
          fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5,
          letterSpacing: 1.4, textTransform:'uppercase', color: theme.textMuted,
        }}>Connected Devices</span>
        <span style={{
          fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5,
          color: a, letterSpacing: 0.6,
        }}>{onlineCount} ONLINE</span>
      </div>

      {/* Device rows */}
      {devices.map((d) => {
        const isActive = d.name === active;
        const sc = statusColor(d.status);
        const isOffline = d.status === 'offline';
        return (
          <button key={d.name} onClick={() => onSelect(d.name)} style={{
            display:'flex', alignItems:'center', gap: 9,
            width:'100%', textAlign:'left',
            padding:'8px 12px',
            background: isActive ? `${a}1a` : 'transparent',
            border:'none',
            borderTop: `1px solid ${theme.border}`,
            color: theme.text,
            fontSize: 11, cursor:'pointer',
            opacity: isOffline ? 0.6 : 1,
          }}
            onMouseEnter={e => e.currentTarget.style.background = `${a}1a`}
            onMouseLeave={e => e.currentTarget.style.background = isActive ? `${a}1a` : 'transparent'}>
            {/* Status dot */}
            <span style={{
              width: 7, height: 7, borderRadius: 99, background: sc,
              boxShadow: d.status === 'online' ? `0 0 4px ${sc}, 0 0 8px ${sc}88` : 'none',
              flexShrink: 0,
            }}/>
            {/* Name + host info */}
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{
                display:'flex', alignItems:'center', gap: 6,
                lineHeight: 1.1,
              }}>
                <span style={{fontSize: 11.5, color: theme.text, letterSpacing: 0.1}}>{d.host}</span>
                {d.isThis && (
                  <span style={{
                    fontFamily:"'JetBrains Mono', monospace", fontSize: 7.5,
                    color: a, background: `${a}22`, border: `1px solid ${a}55`,
                    borderRadius: 2, padding:'1px 4px',
                    letterSpacing: 0.8, textTransform:'uppercase',
                  }}>this</span>
                )}
                {d.kind === 'server' && (
                  <span style={{
                    fontFamily:"'JetBrains Mono', monospace", fontSize: 7.5,
                    color: theme.textDim, background: `${theme.textDim}1a`,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 2, padding:'1px 4px',
                    letterSpacing: 0.8, textTransform:'uppercase',
                  }}>srv</span>
                )}
              </div>
              <div style={{
                fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5,
                color: theme.textMuted, letterSpacing: 0.5, marginTop: 2,
              }}>
                {isOffline ? `last seen ${d.last}` : `${d.ip} · ${d.os}`}
              </div>
            </div>
            {/* OS pill on the right */}
            {!isOffline && (
              <span style={{
                fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5,
                color: theme.textDim,
                background: `${theme.textDim}14`,
                border: `1px solid ${theme.border}`,
                borderRadius: 3, padding:'2px 5px',
                letterSpacing: 0.6,
              }}>{d.os}</span>
            )}
          </button>
        );
      })}

      {/* Manage footer row */}
      <button onClick={() => onSelect('__manage__')} style={{
        display:'flex', alignItems:'center', gap: 8,
        width:'100%', textAlign:'left',
        padding:'8px 12px',
        background: 'transparent',
        border:'none', borderTop: `1px solid ${theme.border}`,
        color: theme.textDim,
        fontSize: 11, cursor:'pointer',
      }}
        onMouseEnter={e => e.currentTarget.style.background = `${a}1a`}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <GearGlyph size={11} color={theme.textDim} strokeWidth={1.4}/>
        <span style={{flex: 1}}>Manage devices…</span>
        <span style={{color: theme.textMuted, fontSize: 10}}>↗</span>
      </button>
    </div>
  );
}

// — Gear popover (settings list) —
function GearPopover({ theme, onNavigate }) {
  const a = theme.accent;
  const items = [
    { id: 'about',     label: 'About Tender' },
    { id: 'faq',       label: 'FAQ' },
    { id: 'plugins',   label: 'Plugins' },
    { id: 'proxy',     label: 'Proxy settings' },
    { id: 'appearance',label: 'Appearance & behavior' },
    { id: 'account',   label: 'Account · Log out',     muted: true },
    { id: 'logs',      label: 'Collect logs & diagnostics' },
    { id: 'dry-dock',  label: 'Dry Dock (shutdown)',   danger: true },
  ];
  return (
    <div style={{
      position:'absolute', right: 10, top: 48,
      zIndex: 10, width: 220,
      background: theme.bg,
      border: `1px solid ${theme.border}`,
      borderRadius: 5,
      boxShadow: `0 12px 30px ${theme.shadow}, 0 0 16px ${a}33`,
      overflow:'hidden',
      fontFamily:"'Space Grotesk', sans-serif",
    }}>
      {items.map((it, i) => (
        <button key={it.id} onClick={() => onNavigate(it.id)} style={{
          display:'flex', alignItems:'center', gap: 8,
          width:'100%', textAlign:'left',
          padding:'7px 12px',
          background:'transparent',
          border:'none', borderTop: i > 0 ? `1px solid ${theme.border}` : 'none',
          color: it.danger ? theme.danger : (it.muted ? theme.textDim : theme.text),
          fontSize: 11, cursor:'pointer',
        }}
          onMouseEnter={e => e.currentTarget.style.background = it.danger ? `${theme.danger}1a` : `${a}1a`}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span style={{flex: 1}}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

// — Tab strip —
function TabStrip({ theme, active, onChange }) {
  const a = theme.accent;
  const tabs = [
    { id: 'fleet',    label: 'Fleet' },
    { id: 'projects', label: 'Projects' },
    { id: 'services', label: 'Services' },
  ];
  return (
    <div style={{display:'flex', background: theme.bg}}>
      {tabs.map(t => {
        const isActive = t.id === active;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            flex: 1, padding:'10px 0',
            background:'transparent', border:'none',
            cursor:'pointer', position:'relative',
            color: isActive ? theme.text : theme.textDim,
            fontSize: 11.5, letterSpacing: 0.3,
            fontFamily:"'Space Grotesk', sans-serif",
            fontWeight: isActive ? 600 : 500,
          }}
            onMouseEnter={e => e.currentTarget.style.color = theme.text}
            onMouseLeave={e => e.currentTarget.style.color = isActive ? theme.text : theme.textDim}>
            {t.label}
            {isActive && (
              <div style={{
                position:'absolute', bottom: -1, left: '22%', right: '22%', height: 2,
                background: a,
                boxShadow: `0 0 6px ${a}, 0 0 10px ${a}88`,
                borderRadius: 99,
              }}/>
            )}
          </button>
        );
      })}
    </div>
  );
}

// — Fleet tab content: list of installed Harborline tools. Length is
// variable (one user might have all three, another might only have one
// or have a couple of community tools); the gauge row was removed
// because it implied a fixed three-tool layout.
function FleetPanel({ theme, nav }) {
  const a = theme.accent;
  return (
    <div>
      <div style={{padding:'10px 14px 4px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform:'uppercase', color: theme.textMuted}}>↳ Installed · 3 tools</span>
        <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, color: a, letterSpacing: 0.6, cursor:'pointer'}}>+ install</span>
      </div>
      <ConsoleRow theme={theme} indicator="port" name="Signal-Bridge" subLabel="v2.3.1 · running" meter="link healthy" active badge={<UpdateCountBadge theme={theme} count={1}/>} onClick={nav('signal-bridge')}/>
      <FiberDivider color={a} dim/>
      <ConsoleRow theme={theme} indicator="port" name="Sunfish"       subLabel="v1.8.4 · running" meter="7 tasks"      active badge={<UpdateCountBadge theme={theme} count={1}/>} onClick={nav('sunfish')}/>
      <FiberDivider color={a} dim/>
      <ConsoleRow theme={theme} indicator="port" name="Flight-Deck"   subLabel="v3.0.0 · running" meter="7/7 airborne" active onClick={nav('flight-deck')}/>
    </div>
  );
}

// — Projects tab content —
function ProjectsPanel({ theme, nav }) {
  const a = theme.accent;
  const projects = [
    { name: 'harbor-east',         path: '~/Code/harbor-east',      status: 'active'   },
    { name: 'sunfish-indexer',     path: '~/Code/sunfish-idx',      status: 'active'   },
    { name: 'flight-deck-control', path: '~/Code/flight-deck',      status: 'active'   },
    { name: 'tender-helm',         path: '~/Code/tender',           status: 'paused'   },
    { name: 'old-sloop-prototype', path: '~/Code/old-sloop',        status: 'archived' },
  ];
  return (
    <div>
      <div style={{padding:'8px 14px 4px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform:'uppercase', color: theme.textMuted}}>↳ 5 projects · 3 active</span>
        <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, color: a, letterSpacing: 0.6, cursor:'pointer'}}>+ new</span>
      </div>
      {projects.map((p, i) => {
        const isActive = p.status === 'active';
        return (
          <div key={p.name}>
            <ConsoleRow theme={theme}
              indicator="grid"
              name={p.name}
              subLabel={p.path}
              meter={p.status.toUpperCase()}
              active={isActive}
              onClick={() => {}}/>
            {i < projects.length - 1 && <FiberDivider color={a} dim/>}
          </div>
        );
      })}
    </div>
  );
}

// — Services tab content: local OS services —
function ServicesPanel({ theme, nav }) {
  const a = theme.accent;
  const services = [
    { name: 'harborline-router',       cpu: '0.4%', mem: '142 MB' },
    { name: 'harborline-fiber-relay',  cpu: '0.3%', mem: '88 MB'  },
    { name: 'harborline-update-agent', cpu: '0.0%', mem: '24 MB'  },
    { name: 'postgres',                cpu: '1.2%', mem: '512 MB' },
    { name: 'redis-server',            cpu: '0.1%', mem: '48 MB'  },
    { name: 'docker-daemon',           cpu: '2.1%', mem: '380 MB' },
    { name: 'localhost-proxy',         cpu: '0.0%', mem: '12 MB'  },
    { name: 'mDNSResponder',           cpu: '0.1%', mem: '18 MB'  },
  ];
  return (
    <div>
      <div style={{padding:'8px 14px 4px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform:'uppercase', color: theme.textMuted}}>↳ 8 services · this node</span>
        <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, color: a, letterSpacing: 0.6}}>all healthy</span>
      </div>
      {services.map((s, i) => {
        const isHL = s.name.startsWith('harborline');
        return (
          <div key={s.name}>
            <ConsoleRow theme={theme}
              indicator="cpu"
              name={s.name}
              subLabel={`cpu ${s.cpu} · mem ${s.mem}`}
              active={isHL}
              onClick={nav('engine-room')}/>
            {i < services.length - 1 && <FiberDivider color={a} dim/>}
          </div>
        );
      })}
    </div>
  );
}

// Small brass-tinted pill used to indicate available updates on rows.
function UpdateCountBadge({ theme, count }) {
  const m = theme.metalBright;
  return (
    <div style={{
      fontFamily:"'JetBrains Mono', monospace", fontSize: 9.5,
      color: m,
      background: `${m}22`,
      border: `1px solid ${m}66`,
      borderRadius: 99,
      padding:'1px 7px',
      display:'inline-flex', alignItems:'center', gap: 2,
      letterSpacing: 0.6,
      boxShadow: `0 0 4px ${m}44`,
    }}>↑{count}</div>
  );
}

// Cyan unread-message pip — small circle with the unread count.
function UnreadPip({ theme, count }) {
  const a = theme.accent;
  return (
    <div style={{
      fontFamily:"'JetBrains Mono', monospace", fontSize: 9,
      color: theme.accentBright,
      background: `${a}33`,
      border: `1px solid ${a}88`,
      borderRadius: 99,
      minWidth: 14, height: 14,
      padding:'0 4px',
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      letterSpacing: 0.3,
      boxShadow: `0 0 6px ${a}66, inset 0 0 4px ${a}33`,
    }}>{count}</div>
  );
}


Object.assign(window, { MenuVariantD, MenuShell, MenuHeader });
