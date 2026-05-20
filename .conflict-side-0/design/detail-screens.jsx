// Detail screens — each row in the Telegraph menu drills into a screen
// designed for that domain. Same Engine Room vocabulary throughout.
// All screens share the MenuShell so they sit in the same tray-panel frame.

const { useState } = React;

// ─── Shared detail-screen helpers ────────────────────────────────────────

// Back-header with arrow, breadcrumb-style title, and 334 counter.
function DetailHeader({ theme, title, sub, onBack, badge }) {
  const a = theme.accent;
  return (
    <div style={{
      padding:'11px 14px 11px 10px',
      display:'flex', alignItems:'center', gap: 9,
      background:`linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
      borderBottom:'1px solid rgba(0,0,0,0.28)',
    }}>
      <button onClick={onBack} style={{
        background:'transparent', border:'none', cursor:'pointer',
        padding: 4, borderRadius: 4,
        display:'flex', alignItems:'center', justifyContent:'center',
        color: theme.text,
      }}
        onMouseEnter={e => e.currentTarget.style.background = `${a}22`}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        title="Back to console">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2 L 4 7 L 9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div style={{flex:1, minWidth: 0}}>
        <div style={{fontSize: 13, fontWeight: 600, lineHeight: 1, letterSpacing: 0.2, color: theme.text}}>
          {title}
        </div>
        {sub && (
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: 1.4, color: theme.textMuted, marginTop: 4, textTransform:'uppercase'}}>
            {sub}
          </div>
        )}
      </div>
      {badge ? badge : (
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
      )}
    </div>
  );
}

// Sparkline — small SVG line chart with subtle area fill + glow.
function Sparkline({ values, color, width = 280, height = 44 }) {
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => [
    i * stepX,
    height - 4 - ((v - min) / range) * (height - 12),
  ]);
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  const [lx, ly] = points[points.length - 1];
  return (
    <svg width={width} height={height} style={{display:'block', overflow:'visible'}}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)"/>
      <path d={path} stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"
            style={{filter: `drop-shadow(0 0 4px ${color}88)`}}/>
      {/* current value dot */}
      <circle cx={lx} cy={ly} r="2.5" fill={color} style={{filter: `drop-shadow(0 0 4px ${color})`}}/>
    </svg>
  );
}

// Horizontal meter bar with label + value + percentage fill.
function MeterBar({ theme, label, value, max, unit = '', tone }) {
  const a = tone || theme.accent;
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{padding:'6px 14px', display:'flex', flexDirection:'column', gap: 4}}>
      <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
        <span style={{fontSize: 11, color: theme.text}}>{label}</span>
        <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 10, color: a, letterSpacing: 0.4}}>
          {value}{unit}<span style={{color: theme.textMuted}}> / {max}{unit}</span>
        </span>
      </div>
      <div style={{
        height: 4, borderRadius: 99,
        background: 'rgba(255,255,255,0.06)',
        position:'relative', overflow:'hidden',
      }}>
        <div style={{
          position:'absolute', left: 0, top: 0, height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${a}aa, ${a})`,
          boxShadow: `0 0 6px ${a}aa`,
          borderRadius: 99,
        }}/>
      </div>
    </div>
  );
}

// Two action buttons at the foot of a screen.
function ActionFooter({ theme, primary, secondary, danger }) {
  const a = theme.accent;
  const d = danger || theme.danger;
  return (
    <div style={{
      padding:'10px 12px',
      borderTop:'1px solid rgba(0,0,0,0.28)',
      background:`linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
      display:'flex', gap: 8,
    }}>
      {secondary && (
        <button style={{
          flex: 1, padding:'7px 10px',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${theme.border}`,
          color: theme.text,
          borderRadius: 4,
          fontSize: 11, fontFamily:"'Space Grotesk', sans-serif",
          cursor:'pointer',
        }}>{secondary}</button>
      )}
      {primary && (
        <button style={{
          flex: 1, padding:'7px 10px',
          background: `linear-gradient(180deg, ${a}33, ${a}1a)`,
          border: `1px solid ${a}88`,
          color: theme.accentBright,
          borderRadius: 4,
          fontSize: 11, fontFamily:"'Space Grotesk', sans-serif",
          fontWeight: 500,
          cursor:'pointer',
          boxShadow: `0 0 8px ${a}33, inset 0 0 8px ${a}22`,
        }}>{primary}</button>
      )}
    </div>
  );
}

// A compact two-column "data line" — label left, value right.
function DataLine({ theme, label, value, tone, mono = true }) {
  return (
    <div style={{
      padding:'5px 14px',
      display:'flex', alignItems:'center', justifyContent:'space-between',
    }}>
      <span style={{
        fontFamily:"'JetBrains Mono', monospace", fontSize: 9,
        letterSpacing: 1.2, textTransform:'uppercase', color: theme.textMuted,
      }}>{label}</span>
      <span style={{
        fontFamily: mono ? "'JetBrains Mono', monospace" : "'Space Grotesk', sans-serif",
        fontSize: 11, color: tone || theme.text, letterSpacing: 0.3,
      }}>{value}</span>
    </div>
  );
}

// Small status pill with a colored dot.
function StatusPill({ theme, text, tone }) {
  const c = tone || theme.accent;
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap: 5,
      padding:'2px 7px',
      borderRadius: 99,
      background: `${c}1a`,
      border: `1px solid ${c}55`,
      fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 0.8,
      color: c, textTransform:'uppercase',
    }}>
      <span style={{width: 4, height: 4, borderRadius:99, background: c, boxShadow: `0 0 4px ${c}`}}/>
      {text}
    </div>
  );
}

// ─── 1. Signal-Bridge Linkage ───────────────────────────────────────────
function DetailSignalBridge({ theme, palette, icon, onBack }) {
  // Throughput sparkline data — last 30 samples
  const values = [9.1, 10.2, 11.8, 10.5, 12.0, 11.3, 13.4, 12.8, 11.5, 12.1, 13.6, 14.2, 13.0, 12.4, 11.8, 12.9, 13.1, 12.7, 11.9, 12.5, 13.8, 12.6, 12.0, 11.7, 12.4, 13.2, 12.9, 12.1, 11.8, 12.3];
  const a = theme.accent;
  const links = [
    { name: 'harbor-east.tender.local',  status: 'healthy', up: 4.2, down: 6.8 },
    { name: 'harbor-west.tender.local',  status: 'healthy', up: 2.1, down: 3.4 },
    { name: 'flight-deck.local',         status: 'healthy', up: 1.9, down: 2.1 },
  ];
  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="Signal-Bridge Linkage"
        sub="Fiber-routed services · 3 links" onBack={onBack}
        badge={<StatusPill theme={theme} text="Healthy"/>}/>
      <FiberDivider color={a}/>

      {/* Throughput graph */}
      <div style={{padding:'12px 14px 6px'}}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 6}}>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform:'uppercase', color: theme.textMuted}}>
            Throughput · 5 min
          </div>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 16, color: theme.accentBright, textShadow:`0 0 6px ${a}88`}}>
            12.3 <span style={{fontSize: 9, color: theme.textDim}}>MB/S</span>
          </div>
        </div>
        <Sparkline values={values} color={a} width={296} height={56}/>
      </div>

      <FiberDivider color={a} dim/>

      {/* Connections */}
      <div style={{padding:'10px 14px 4px', fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform:'uppercase', color: theme.textMuted}}>
        ↳ Active fiber links
      </div>
      {links.map((l, i) => (
        <div key={l.name} style={{
          padding:'6px 14px', display:'flex', alignItems:'center', gap: 9,
          borderBottom: i < links.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <ConsoleIndicator kind="port" color={a} active/>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontSize: 11, color: theme.text, letterSpacing: 0.1}}>{l.name}</div>
            <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5, color: theme.textMuted, marginTop: 2, letterSpacing: 0.6}}>
              ↑ {l.up} mb/s   ↓ {l.down} mb/s
            </div>
          </div>
        </div>
      ))}

      <ActionFooter theme={theme} primary="Restart Link" secondary="View Logs"/>
    </MenuShell>
  );
}

// ─── 2. Sunfish Operations ──────────────────────────────────────────────
function DetailSunfish({ theme, palette, icon, onBack }) {
  const a = theme.accent;
  const tasks = [
    { name: 'sunfish.crawler/12',     status: 'running', pct: 78 },
    { name: 'sunfish.indexer/03',     status: 'running', pct: 42 },
    { name: 'sunfish.ingest/north',   status: 'running', pct: 61 },
    { name: 'sunfish.reducer/main',   status: 'running', pct: 24 },
    { name: 'sunfish.dedupe/aux',     status: 'queued',  pct: 0  },
  ];
  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="Sunfish Operations"
        sub="7 active · 12 queued" onBack={onBack}
        badge={<StatusPill theme={theme} text="Running"/>}/>
      <FiberDivider color={a}/>

      {/* Summary metrics */}
      <div style={{padding:'10px 14px 6px', display:'flex', gap: 16}}>
        <div>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, color: theme.textMuted, textTransform:'uppercase'}}>tasks/min</div>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 18, color: theme.accentBright, lineHeight: 1.1, textShadow:`0 0 6px ${a}88`}}>↑ 38</div>
        </div>
        <div>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, color: theme.textMuted, textTransform:'uppercase'}}>errors</div>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 18, color: theme.text, lineHeight: 1.1}}>0</div>
        </div>
        <div>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, color: theme.textMuted, textTransform:'uppercase'}}>queue</div>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 18, color: theme.text, lineHeight: 1.1}}>12</div>
        </div>
      </div>

      <FiberDivider color={a} dim/>

      {/* Task list */}
      {tasks.map((t, i) => (
        <div key={t.name} style={{
          padding:'7px 14px', borderBottom: i < tasks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 4}}>
            <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 10, color: theme.text, letterSpacing: 0.3}}>{t.name}</span>
            <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, color: t.status === 'queued' ? theme.textMuted : a, letterSpacing: 0.6, textTransform:'uppercase'}}>{t.status}</span>
          </div>
          <div style={{height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow:'hidden'}}>
            <div style={{height:'100%', width:`${t.pct}%`, background:`linear-gradient(90deg, ${a}88, ${a})`, boxShadow: `0 0 4px ${a}aa`}}/>
          </div>
        </div>
      ))}

      <ActionFooter theme={theme} primary="Open Workspace" secondary="Pause All"/>
    </MenuShell>
  );
}

// ─── 3. Flight-Deck Control ─────────────────────────────────────────────
function DetailFlightDeck({ theme, palette, icon, onBack }) {
  const a = theme.accent;
  const workers = [
    { id: 1, util: 88, temp: 71 },
    { id: 2, util: 92, temp: 73 },
    { id: 3, util: 78, temp: 68 },
    { id: 4, util: 95, temp: 76 },
    { id: 5, util: 81, temp: 70 },
    { id: 6, util: 89, temp: 72 },
    { id: 7, util: 83, temp: 69 },
  ];
  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="Flight-Deck Control"
        sub="7 of 7 workers airborne" onBack={onBack}
        badge={<StatusPill theme={theme} text="Airborne"/>}/>
      <FiberDivider color={a}/>

      {/* Worker grid - 4 cols x 2 rows */}
      <div style={{padding:'12px 14px', display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 6}}>
        {workers.map(w => (
          <div key={w.id} style={{
            padding:'8px 6px 6px',
            background:`linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
            border: `1px solid ${a}33`,
            borderRadius: 4,
            display:'flex', flexDirection:'column', alignItems:'center', gap: 3,
            boxShadow: `inset 0 0 8px ${a}10`,
          }}>
            <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 0.8, color: theme.textMuted}}>GPU·{w.id}</div>
            <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 13, color: theme.accentBright, textShadow:`0 0 5px ${a}88`}}>{w.util}<span style={{fontSize: 8, opacity: 0.7}}>%</span></div>
            <div style={{height: 1.5, width:'100%', background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow:'hidden'}}>
              <div style={{height:'100%', width: `${w.util}%`, background: a, boxShadow:`0 0 3px ${a}`}}/>
            </div>
            <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 7.5, color: w.temp > 75 ? '#f0b370' : theme.textMuted, letterSpacing: 0.4}}>{w.temp}°C</div>
          </div>
        ))}
        {/* spare slot */}
        <div style={{
          padding:'8px 6px 6px',
          border: `1px dashed ${theme.border}`,
          borderRadius: 4,
          display:'flex', alignItems:'center', justifyContent:'center',
          minHeight: 60,
        }}>
          <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 8, color: theme.textMuted, letterSpacing: 1, textTransform:'uppercase'}}>spare</span>
        </div>
      </div>

      <ActionFooter theme={theme} primary="Open Dashboard" secondary="Emergency Stop" danger/>
    </MenuShell>
  );
}

// ─── 4. Harborline Services Grid ────────────────────────────────────────
function DetailServicesGrid({ theme, palette, icon, onBack }) {
  const a = theme.accent;
  // 8 docks, each with services. Stylized.
  const docks = [
    { name: 'east-1',  ok: 3, total: 3 },
    { name: 'east-2',  ok: 3, total: 3 },
    { name: 'west-1',  ok: 3, total: 3 },
    { name: 'west-2',  ok: 2, total: 3 },
    { name: 'north-1', ok: 3, total: 3 },
    { name: 'north-2', ok: 3, total: 3 },
    { name: 'south-1', ok: 3, total: 3 },
    { name: 'south-2', ok: 3, total: 3 },
  ];
  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="Services Grid"
        sub="8 docks · 24 services" onBack={onBack}
        badge={<StatusPill theme={theme} text="23/24"/>}/>
      <FiberDivider color={a}/>

      <div style={{padding:'8px 14px 4px', fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform:'uppercase', color: theme.textMuted}}>
        ↳ Docks
      </div>

      <div style={{padding:'4px 14px 8px', display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 4}}>
        {docks.map(d => {
          const allOk = d.ok === d.total;
          return (
            <div key={d.name} style={{
              padding:'7px 10px',
              background:`linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
              border: `1px solid ${allOk ? a + '33' : theme.danger + '44'}`,
              borderRadius: 3,
              display:'flex', alignItems:'center', justifyContent:'space-between',
              gap: 6,
            }}>
              <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 10, color: theme.text, letterSpacing: 0.4}}>{d.name}</span>
              <div style={{display:'flex', gap: 2}}>
                {[...Array(d.total)].map((_, i) => (
                  <span key={i} style={{
                    width: 5, height: 5, borderRadius: 99,
                    background: i < d.ok ? a : theme.danger,
                    boxShadow: `0 0 4px ${i < d.ok ? a : theme.danger}aa`,
                  }}/>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <FiberDivider color={a} dim/>
      <DataLine theme={theme} label="online"  value="23"/>
      <DataLine theme={theme} label="degraded" value="1" tone={theme.danger}/>
      <DataLine theme={theme} label="offline" value="0"/>

      <ActionFooter theme={theme} primary="Inspect west-2" secondary="Refresh"/>
    </MenuShell>
  );
}

// ─── 5. Fiber Traces ────────────────────────────────────────────────────
function DetailFiberTraces({ theme, palette, icon, onBack }) {
  const a = theme.accent;
  const traces = [
    { t: '14:08:22.412', src: 'tender',        dest: 'signal-bridge', ms: 12,  status: 'ok' },
    { t: '14:08:22.317', src: 'signal-bridge', dest: 'flight-deck',   ms: 42,  status: 'ok' },
    { t: '14:08:22.211', src: 'sunfish',       dest: 'tender',         ms: 8,   status: 'ok' },
    { t: '14:08:22.106', src: 'flight-deck',   dest: 'gpu-worker-3',   ms: 5,   status: 'ok' },
    { t: '14:08:22.034', src: 'tender',        dest: 'services-grid',  ms: 18,  status: 'ok' },
    { t: '14:08:21.928', src: 'sunfish',       dest: 'sunfish-ingest', ms: 287, status: 'slow' },
  ];
  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="Fiber Traces"
        sub="247 fibers · 12 queued" onBack={onBack}
        badge={<StatusPill theme={theme} text="Live"/>}/>
      <FiberDivider color={a}/>

      {/* Tail-follow row */}
      <div style={{padding:'8px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
        <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform:'uppercase', color: theme.textMuted}}>↳ Tail · last 6</span>
        <div style={{display:'flex', alignItems:'center', gap: 5, color: a, fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 0.8}}>
          <span style={{width: 5, height: 5, borderRadius:99, background:a, boxShadow:`0 0 4px ${a}, 0 0 8px ${a}88`, animation:'consoleFiberPulse 1.2s ease-in-out infinite'}}/>
          following
        </div>
      </div>

      {traces.map((tr, i) => (
        <div key={tr.t + tr.src} style={{
          padding:'6px 14px', borderBottom: i < traces.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          display:'flex', alignItems:'center', gap: 9,
          background: tr.status === 'slow' ? `${theme.danger}0c` : 'transparent',
        }}>
          <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5, color: theme.textMuted, width: 70, flexShrink: 0, letterSpacing: 0.3}}>{tr.t.slice(-9)}</span>
          <span style={{flex: 1, fontFamily:"'JetBrains Mono', monospace", fontSize: 10, color: theme.text, letterSpacing: 0.1, minWidth: 0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
            {tr.src} <span style={{color: tr.status === 'slow' ? theme.danger : a}}>→</span> {tr.dest}
          </span>
          <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, color: tr.status === 'slow' ? theme.danger : theme.accentBright, letterSpacing: 0.3}}>
            {tr.ms}ms
          </span>
        </div>
      ))}

      <ActionFooter theme={theme} primary="Open Trace View" secondary="Filter"/>
    </MenuShell>
  );
}

// ─── 6. Engine Room (Local Node) ───────────────────────────────────────
function DetailEngineRoom({ theme, palette, icon, onBack }) {
  const a = theme.accent;
  const procs = [
    { name: 'sunfish.indexer', cpu: 14, mem: '1.2G' },
    { name: 'flight-deck',     cpu: 11, mem: '982M' },
    { name: 'signal-bridge',   cpu: 6,  mem: '648M' },
    { name: 'tender',          cpu: 3,  mem: '124M' },
    { name: 'dock-router',     cpu: 2,  mem: '88M'  },
  ];
  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="Engine Room"
        sub="Local node · steamtide-w11" onBack={onBack}
        badge={<StatusPill theme={theme} text="Healthy"/>}/>
      <FiberDivider color={a}/>

      <MeterBar theme={theme} label="CPU"    value={38} max={100} unit="%"/>
      <MeterBar theme={theme} label="Memory" value={4.2} max={16}  unit=" G"/>
      <MeterBar theme={theme} label="Disk"   value={240} max={1000} unit=" G"/>
      <MeterBar theme={theme} label="Network" value={42} max={100} unit=" mb/s"/>

      <FiberDivider color={a} dim/>
      <div style={{padding:'8px 14px 4px', fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform:'uppercase', color: theme.textMuted}}>
        ↳ Top processes
      </div>

      {procs.map((p, i) => (
        <div key={p.name} style={{
          padding:'5px 14px', display:'flex', alignItems:'center', gap: 10,
          borderBottom: i < procs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <span style={{flex: 1, fontFamily:"'JetBrains Mono', monospace", fontSize: 10, color: theme.text, letterSpacing: 0.2}}>{p.name}</span>
          <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9.5, color: a, letterSpacing: 0.3, width: 36, textAlign:'right'}}>{p.cpu}%</span>
          <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9.5, color: theme.textDim, letterSpacing: 0.3, width: 44, textAlign:'right'}}>{p.mem}</span>
        </div>
      ))}

      <ActionFooter theme={theme} primary="Full Diagnostics" secondary="Restart Tender"/>
    </MenuShell>
  );
}

// ─── 7. Dock Settings ──────────────────────────────────────────────────
function DetailDockSettings({ theme, palette, icon, onBack }) {
  const a = theme.accent;
  const toggles = [
    { label: 'Auto-start with Windows', on: true },
    { label: 'Notifications · sound',   on: true },
    { label: 'Notifications · banner',  on: false },
    { label: 'Pulse animations',        on: true },
    { label: 'Telemetry to Harborline', on: false },
  ];
  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="Dock Settings"
        sub="6 routes wired · MK VII" onBack={onBack}
        badge={<StatusPill theme={theme} text="Saved"/>}/>
      <FiberDivider color={a}/>

      <div style={{padding:'8px 14px 4px', fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform:'uppercase', color: theme.textMuted}}>
        ↳ Wiring
      </div>

      {toggles.map((t, i) => (
        <div key={t.label} style={{
          padding:'8px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', gap: 10,
          borderBottom: i < toggles.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <span style={{flex: 1, fontSize: 11.5, color: theme.text}}>{t.label}</span>
          {/* Toggle switch */}
          <div style={{
            width: 26, height: 14, borderRadius: 99,
            background: t.on ? `${a}55` : 'rgba(255,255,255,0.08)',
            border: `1px solid ${t.on ? a : theme.border}`,
            boxShadow: t.on ? `0 0 8px ${a}55, inset 0 0 4px ${a}33` : 'none',
            position:'relative',
            transition: 'background 0.15s',
          }}>
            <div style={{
              position:'absolute',
              left: t.on ? 13 : 1, top: 1,
              width: 10, height: 10, borderRadius: 99,
              background: t.on ? theme.accentBright : theme.textDim,
              transition: 'left 0.15s',
              boxShadow: t.on ? `0 0 4px ${a}` : 'none',
            }}/>
          </div>
        </div>
      ))}

      <FiberDivider color={a} dim/>
      <DataLine theme={theme} label="theme" value="Engine Room · dark"/>
      <DataLine theme={theme} label="route count" value="6"/>

      <ActionFooter theme={theme} primary="Edit Routes" secondary="Reset"/>
    </MenuShell>
  );
}

// ─── 8. Dry Dock (shutdown confirm) ────────────────────────────────────
function DetailDryDock({ theme, palette, icon, onBack }) {
  const d = theme.danger;
  const services = [
    'Signal-Bridge Linkage',
    'Sunfish Operations',
    'Flight-Deck Control · 7 workers',
    'Fiber trace collector',
    'Tender helm process',
  ];
  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="Dry Dock"
        sub="Graceful shutdown · confirm" onBack={onBack}
        badge={<StatusPill theme={theme} text="Standby" tone={d}/>}/>
      <FiberDivider color={d}/>

      {/* Warning */}
      <div style={{
        padding:'12px 14px 10px',
        display:'flex', gap: 10,
        background: `${d}10`,
      }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{flexShrink: 0, marginTop: 1}}>
          <path d="M9 1 L 17 16 L 1 16 Z" stroke={d} strokeWidth="1.5" strokeLinejoin="round"/>
          <line x1="9" y1="7" x2="9" y2="11" stroke={d} strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="9" cy="13.5" r="0.8" fill={d}/>
        </svg>
        <div style={{fontSize: 11.5, color: theme.text, lineHeight: 1.4}}>
          Stops Tender and all wired Harborline services on this node. Logs
          and state are preserved.
        </div>
      </div>

      <FiberDivider color={d} dim/>

      <div style={{padding:'8px 14px 4px', fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform:'uppercase', color: theme.textMuted}}>
        ↳ Will stop
      </div>

      {services.map((s, i) => (
        <div key={s} style={{
          padding:'5px 14px', display:'flex', alignItems:'center', gap: 9,
          borderBottom: i < services.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <span style={{width: 4, height: 4, borderRadius: 99, background: d, boxShadow: `0 0 4px ${d}aa`}}/>
          <span style={{flex: 1, fontFamily:"'JetBrains Mono', monospace", fontSize: 10, color: theme.text, letterSpacing: 0.2}}>{s}</span>
        </div>
      ))}

      <ActionFooter theme={theme} primary="Confirm Shutdown" secondary="Cancel" danger/>
    </MenuShell>
  );
}

// ─── 9. Refit Yard (available updates) ─────────────────────────────────
function DetailRefitYard({ theme, palette, icon, onBack }) {
  const m = theme.metalBright;
  const a = theme.accent;
  const updates = [
    { name: 'Signal-Bridge Linkage', from: 'v2.3.1', to: 'v2.4.0', size: '14.2 MB', kind: 'minor', notes: 'fiber stability + auth refresh' },
    { name: 'Sunfish Operations',    from: 'v1.8.4', to: 'v1.9.0', size: '28.7 MB', kind: 'minor', notes: 'parallel ingest + indexer fixes' },
    { name: 'Tender',                 from: 'v7.0.2', to: 'v7.1.0', size: '6.1 MB',  kind: 'patch', notes: 'console glow + accent fixes' },
  ];
  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="Refit Yard"
        sub="3 updates pending · 49 MB" onBack={onBack}
        badge={<StatusPill theme={theme} text="↑ 3" tone={m}/>}/>
      <FiberDivider color={m}/>

      {updates.map((u, i) => (
        <div key={u.name} style={{
          padding:'10px 14px', display:'flex', alignItems:'center', gap: 10,
          borderBottom: i < updates.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{display:'flex', alignItems:'center', gap: 7, marginBottom: 2}}>
              <span style={{fontSize: 11.5, color: theme.text, letterSpacing: 0.1}}>{u.name}</span>
              <span style={{
                fontFamily:"'JetBrains Mono', monospace", fontSize: 8,
                padding:'1px 5px', borderRadius: 2,
                background: `${m}22`, color: m, letterSpacing: 0.8,
                textTransform:'uppercase', border:`1px solid ${m}55`,
              }}>{u.kind}</span>
            </div>
            <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, color: theme.textMuted, letterSpacing: 0.4}}>
              {u.from} <span style={{color: m}}>→</span> <span style={{color: theme.accentBright}}>{u.to}</span> · {u.size}
            </div>
            <div style={{fontSize: 10, color: theme.textDim, marginTop: 3, lineHeight: 1.3}}>{u.notes}</div>
          </div>
          <button style={{
            padding:'5px 9px',
            fontSize: 10, fontFamily:"'Space Grotesk', sans-serif",
            color: m,
            background: `${m}1a`,
            border: `1px solid ${m}66`,
            borderRadius: 3,
            cursor:'pointer',
            boxShadow:`0 0 6px ${m}33`,
          }}>Install</button>
        </div>
      ))}

      <ActionFooter theme={theme} primary="Install All (49 MB)" secondary="Defer"/>
    </MenuShell>
  );
}

// ─── 10. Crew Comms ────────────────────────────────────────────────────
function DetailCrewComms({ theme, palette, icon, onBack }) {
  const a = theme.accent;
  const crew = [
    { initials: 'JM', name: 'Jess Marlowe',  role: 'Bosun',     status: 'online', unread: 2 },
    { initials: 'RV', name: 'Rafael Veiga',  role: 'Engineer',  status: 'online', unread: 0 },
    { initials: 'SA', name: 'Sam Aronsson',  role: 'Quartermaster', status: 'online', unread: 0 },
    { initials: 'KW', name: 'Kira Whitelow', role: 'Navigator', status: 'away',   unread: 0 },
    { initials: 'DH', name: 'Devan Hale',    role: 'Comms',     status: 'online', unread: 0 },
    { initials: 'AC', name: 'Anya Costas',   role: 'Helmsman',  status: 'offline',unread: 0 },
  ];
  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="Crew Comms"
        sub="5 hands online · 2 unread" onBack={onBack}
        badge={<StatusPill theme={theme} text="Live"/>}/>
      <FiberDivider color={a}/>

      {/* Recent message preview */}
      <div style={{
        padding:'10px 14px',
        background: `${a}0c`,
        borderBottom: `1px solid ${a}33`,
        display:'flex', alignItems:'flex-start', gap: 9,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 99,
          background: `linear-gradient(180deg, ${a}55, ${a}22)`,
          border: `1px solid ${a}88`,
          color: theme.accentBright,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 600,
          letterSpacing: 0.3,
          boxShadow: `0 0 6px ${a}44`,
          flexShrink: 0,
        }}>JM</div>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', gap: 6}}>
            <span style={{fontSize: 11, color: theme.text, letterSpacing: 0.1}}>Jess Marlowe</span>
            <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 8, color: theme.textMuted}}>2 min</span>
          </div>
          <div style={{fontSize: 10.5, color: theme.textDim, marginTop: 2, lineHeight: 1.3}}>
            Flight-Deck telemetry looks clean. Push the refit when you can.
          </div>
        </div>
      </div>

      <div style={{padding:'8px 14px 4px', fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform:'uppercase', color: theme.textMuted}}>
        ↳ Crew roster
      </div>

      {crew.map((c, i) => {
        const dot = c.status === 'online' ? a : c.status === 'away' ? theme.metalBright : theme.textMuted;
        return (
          <div key={c.name} style={{
            padding:'6px 14px', display:'flex', alignItems:'center', gap: 9,
            borderBottom: i < crew.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            opacity: c.status === 'offline' ? 0.55 : 1,
          }}>
            <div style={{position:'relative', flexShrink: 0}}>
              <div style={{
                width: 22, height: 22, borderRadius: 99,
                background: `linear-gradient(180deg, ${theme.surface}, ${theme.bgSoft})`,
                border: `1px solid ${theme.border}`,
                color: theme.text,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 600,
                letterSpacing: 0.3,
              }}>{c.initials}</div>
              <div style={{
                position:'absolute', bottom: -1, right: -1,
                width: 7, height: 7, borderRadius: 99,
                background: dot,
                boxShadow: c.status === 'online' ? `0 0 4px ${dot}` : 'none',
                border: `1px solid ${theme.bg}`,
              }}/>
            </div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{fontSize: 11, color: theme.text, letterSpacing: 0.1}}>{c.name}</div>
              <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5, color: theme.textMuted, marginTop: 1, letterSpacing: 0.4}}>
                {c.role} · {c.status}
              </div>
            </div>
            {c.unread > 0 && (
              <div style={{
                fontFamily:"'JetBrains Mono', monospace", fontSize: 9,
                color: theme.accentBright,
                background: `${a}33`,
                border: `1px solid ${a}88`,
                borderRadius: 99, minWidth: 14, height: 14,
                padding:'0 4px',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                boxShadow: `0 0 6px ${a}66`,
              }}>{c.unread}</div>
            )}
          </div>
        );
      })}

      <ActionFooter theme={theme} primary="Hail Crew" secondary="Broadcast"/>
    </MenuShell>
  );
}

// ─── 11. Release Notes (from update icon in header) ───────────────────
function DetailReleaseNotes({ theme, palette, icon, onBack }) {
  const m = theme.metalBright;
  const a = theme.accent;
  const releases = [
    {
      service: 'Signal-Bridge',
      from: 'v2.3.1', to: 'v2.4.0', size: '14.2 MB',
      notes: [
        { kind: 'fix',  text: 'Fiber link auto-reconnect on slow handshake' },
        { kind: 'new',  text: 'Multi-route auth token refresh' },
        { kind: 'perf', text: 'Reduced idle CPU by 38%' },
      ],
    },
    {
      service: 'Sunfish',
      from: 'v1.8.4', to: 'v1.9.0', size: '28.7 MB',
      notes: [
        { kind: 'new',  text: 'Parallel ingest streams (up to 4)' },
        { kind: 'fix',  text: 'Indexer race condition on shutdown' },
        { kind: 'fix',  text: 'Dedupe correctness for nested archives' },
      ],
    },
    {
      service: 'Tender',
      from: 'v7.0.2', to: 'v7.1.0', size: '6.1 MB',
      notes: [
        { kind: 'new',  text: 'Engine Room console + fiber-optic traces' },
        { kind: 'new',  text: 'Workspace dropdown (Local/SSH/CodeCanvas)' },
        { kind: 'perf', text: 'Tray render time halved' },
      ],
    },
  ];
  const kindColor = (k) => k === 'new' ? a : k === 'fix' ? theme.accentBright : m;
  return (
    <MenuShell theme={theme} width={360}>
      <DetailHeader theme={theme} title="Release Notes"
        sub="3 updates · 49 MB total" onBack={onBack}
        badge={<StatusPill theme={theme} text="↑ 3" tone={m}/>}/>
      <FiberDivider color={m}/>

      {releases.map((r, i) => (
        <div key={r.service} style={{
          padding:'10px 14px',
          borderBottom: i < releases.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 6}}>
            <div style={{fontSize: 12, color: theme.text, letterSpacing: 0.1}}>{r.service}</div>
            <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9.5, color: theme.textDim, letterSpacing: 0.5}}>
              {r.from} <span style={{color: m}}>→</span> <span style={{color: theme.accentBright}}>{r.to}</span> · {r.size}
            </div>
          </div>
          {r.notes.map((n, j) => (
            <div key={j} style={{display:'flex', alignItems:'flex-start', gap: 7, padding:'3px 0'}}>
              <span style={{
                fontFamily:"'JetBrains Mono', monospace", fontSize: 7.5,
                color: kindColor(n.kind),
                background: `${kindColor(n.kind)}1a`,
                border: `1px solid ${kindColor(n.kind)}55`,
                borderRadius: 2, padding:'1px 4px',
                letterSpacing: 0.8, textTransform:'uppercase',
                flexShrink: 0, marginTop: 1,
                minWidth: 28, textAlign:'center',
              }}>{n.kind}</span>
              <span style={{fontSize: 10.5, color: theme.text, lineHeight: 1.35}}>{n.text}</span>
            </div>
          ))}
        </div>
      ))}

      <ActionFooter theme={theme} primary="Install All (49 MB)" secondary="Defer"/>
    </MenuShell>
  );
}

// Dispatch table — screen id → component
const DETAIL_SCREENS = {
  'signal-bridge': DetailSignalBridge,
  'sunfish':       DetailSunfish,
  'flight-deck':   DetailFlightDeck,
  'services-grid': DetailServicesGrid,
  'fiber-traces':  DetailFiberTraces,
  'engine-room':   DetailEngineRoom,
  'dock-settings': DetailDockSettings,
  'dry-dock':      DetailDryDock,
  'refit-yard':    DetailRefitYard,
  'crew-comms':    DetailCrewComms,
  'release-notes': DetailReleaseNotes,
};

// ─── The interactive Studio stage ──────────────────────────────────────
// Wraps LiveDesktop + the menu, manages the "which screen" state.
// Always renders Variant D (the user's chosen layout) for interactivity.
function StudioStage({ paletteId = 'engine-room', mode = 'dark', icon = 'tm-fleur', os = 'mac' }) {
  const palette = THEME_PALETTES.find(p => p.id === paletteId) || THEME_PALETTES[0];
  const theme = getTheme(paletteId, mode);
  const [screen, setScreen] = useState('main');

  const Screen = DETAIL_SCREENS[screen];

  return (
    <LiveDesktop theme={theme} palette={palette} icon={icon} os={os} mode={mode}>
      {screen === 'main' || !Screen ? (
        <MenuVariantD theme={theme} palette={palette} icon={icon} onNavigate={setScreen}/>
      ) : (
        <Screen theme={theme} palette={palette} icon={icon} onBack={() => setScreen('main')}/>
      )}
    </LiveDesktop>
  );
}

Object.assign(window, {
  StudioStage,
  DETAIL_SCREENS,
  DetailSignalBridge, DetailSunfish, DetailFlightDeck,
  DetailServicesGrid, DetailFiberTraces, DetailEngineRoom,
  DetailDockSettings, DetailDryDock,
  DetailRefitYard, DetailCrewComms, DetailReleaseNotes,
});
