// Settings popups — five additional detail screens reached from the gear
// popover in Variant D. Same Engine Room vocabulary as detail-screens.jsx
// (frosted-steel plates, fiber-optic dividers, brass rivets) but every
// header carries a gear glyph in the top-right instead of the live "334"
// pill, marking the surface as settings rather than live telemetry.
//
// Screens:
//   1. DetailAbout      → About Tender
//   2. DetailFAQ        → Bosun's Log (collapsible Q&A)
//   3. DetailPlugins    → Cargo Hold (installed plugins)
//   4. DetailProxy      → Proxy Wiring (proxy config form)
//   5. DetailAccount    → Quarterdeck (account, sessions, log out)

const { useState: useStateS } = React;

// ─── Shared gear badge — replaces the 334 status pill in settings headers ─

function GearBadge({ theme, label }) {
  const a = theme.accent;
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap: 6,
      padding:'3px 8px 3px 6px',
      borderRadius: 99,
      background:`${a}1a`,
      border:`1px solid ${a}55`,
      fontFamily:"'JetBrains Mono', monospace", fontSize: 9,
      letterSpacing: 1.2, textTransform:'uppercase',
      color: theme.accentBright,
      boxShadow: `inset 0 0 4px ${a}1a`,
    }}>
      <GearGlyph size={11} color="currentColor" strokeWidth={1.8}/>
      {label || 'Settings'}
    </div>
  );
}

// Small form-row helpers — re-used across the form-like settings screens.
function FormLabel({ theme, children }) {
  return (
    <div style={{
      fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4,
      textTransform:'uppercase', color: theme.textMuted, marginBottom: 5,
    }}>{children}</div>
  );
}

function FauxInput({ theme, value, mono = true, accent = false, suffix }) {
  return (
    <div style={{
      padding:'7px 10px',
      borderRadius: 3,
      background: 'rgba(0,0,0,0.32)',
      border: `1px solid ${theme.border}`,
      display:'flex', alignItems:'center', gap: 6,
      boxShadow:'inset 0 0 6px rgba(0,0,0,0.25)',
      minHeight: 14,
    }}>
      <span style={{
        flex: 1, minWidth: 0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        fontFamily: mono ? "'JetBrains Mono', monospace" : "'Space Grotesk', sans-serif",
        fontSize: mono ? 10.5 : 11.5,
        color: accent ? theme.accentBright : theme.text,
        letterSpacing: mono ? 0.4 : 0.1,
      }}>{value}</span>
      {suffix && (
        <span style={{
          fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5,
          color: theme.textMuted, letterSpacing: 1, textTransform:'uppercase',
        }}>{suffix}</span>
      )}
    </div>
  );
}

function SegRadio({ theme, options, value, onChange }) {
  const a = theme.accent;
  return (
    <div style={{
      display:'flex', gap: 4,
      padding: 3,
      background:'rgba(0,0,0,0.32)',
      border:`1px solid ${theme.border}`,
      borderRadius: 4,
    }}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange && onChange(o.value)} style={{
            flex: 1, padding:'5px 6px',
            background: on ? `linear-gradient(180deg, ${a}33, ${a}1a)` : 'transparent',
            border: on ? `1px solid ${a}88` : '1px solid transparent',
            borderRadius: 3,
            color: on ? theme.accentBright : theme.textDim,
            fontFamily:"'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: 0.6,
            textTransform:'uppercase', cursor:'pointer',
            boxShadow: on ? `0 0 6px ${a}33, inset 0 0 4px ${a}22` : 'none',
            transition:'all 0.12s',
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function MiniToggle({ theme, on, onClick }) {
  const a = theme.accent;
  return (
    <div onClick={onClick} style={{
      width: 26, height: 14, borderRadius: 99,
      background: on ? `${a}55` : 'rgba(255,255,255,0.08)',
      border: `1px solid ${on ? a : theme.border}`,
      boxShadow: on ? `0 0 8px ${a}55, inset 0 0 4px ${a}33` : 'none',
      position:'relative', cursor:'pointer',
      transition: 'background 0.15s',
      flexShrink: 0,
    }}>
      <div style={{
        position:'absolute',
        left: on ? 13 : 1, top: 1,
        width: 10, height: 10, borderRadius: 99,
        background: on ? theme.accentBright : theme.textDim,
        transition: 'left 0.15s',
        boxShadow: on ? `0 0 4px ${a}` : 'none',
      }}/>
    </div>
  );
}

// ─── 1. About Tender ───────────────────────────────────────────────────

function DetailAbout({ theme, palette, icon, onBack }) {
  const a = theme.accent;
  const m = theme.metalBright;
  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="About Tender"
        sub="v7.1.0 · MK VII · steam ed." onBack={onBack}
        badge={<GearBadge theme={theme} label="About"/>}/>
      <FiberDivider color={a}/>

      {/* Brand plate — mark + wordmark + version */}
      <div style={{
        padding:'16px 14px 14px',
        display:'flex', alignItems:'center', gap: 12,
        background:`linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
        borderBottom:'1px solid rgba(0,0,0,0.28)',
      }}>
        <div style={{
          borderRadius: 6, overflow:'hidden',
          boxShadow:`0 4px 14px ${theme.shadow}, 0 0 14px ${a}44`,
          flexShrink: 0,
        }}>
          <ThemedIcon kind={icon} size={48} palette={palette}/>
        </div>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{fontFamily:"'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, lineHeight: 1, letterSpacing: 0.2, color: theme.text}}>
            Harborline <span style={{fontStyle:'italic'}}>Tender</span>
          </div>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, color: theme.textMuted, marginTop: 6, textTransform:'uppercase'}}>
            Helm software for the fleet
          </div>
          <div style={{
            marginTop: 8,
            display:'inline-flex', alignItems:'center', gap: 6,
            fontFamily:"'JetBrains Mono', monospace", fontSize: 9.5,
            color: theme.accentBright,
            background:`${a}22`, border:`1px solid ${a}66`,
            borderRadius: 99, padding:'2px 8px',
            letterSpacing: 0.5,
          }}>
            <span style={{width: 5, height: 5, borderRadius: 99, background: a, boxShadow:`0 0 6px ${a}`}}/>
            v7.1.0 · up to date
          </div>
        </div>
      </div>

      <FiberDivider color={a} dim/>

      {/* Spec sheet — data lines */}
      <div style={{padding:'8px 0 6px'}}>
        <DataLine theme={theme} label="build"        value="2026.05.14·a1f3"/>
        <DataLine theme={theme} label="channel"      value="stable"/>
        <DataLine theme={theme} label="signed by"    value="Harborline Co." tone={theme.text} mono={false}/>
        <DataLine theme={theme} label="fingerprint"  value="4F:8C:2A:91:DE:7B"/>
        <DataLine theme={theme} label="license"      value="MK VII · seat 0341"/>
        <DataLine theme={theme} label="electron"     value="32.0.1"/>
      </div>

      <FiberDivider color={a} dim/>

      {/* Credits row — small */}
      <div style={{padding:'10px 14px 12px'}}>
        <div style={{
          fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4,
          textTransform:'uppercase', color: theme.textMuted, marginBottom: 6,
        }}>↳ Built by</div>
        <div style={{fontSize: 11, color: theme.text, lineHeight: 1.45, letterSpacing: 0.1}}>
          The Harborline crew · with thanks to the open-source fleet:
          <span style={{color: theme.textDim}}> React, Electron, JetBrains Mono, and 184 others.</span>
        </div>
      </div>

      <ActionFooter theme={theme} primary="Check for Updates" secondary="View License"/>
    </MenuShell>
  );
}

// ─── 2. FAQ · Bosun's Log ──────────────────────────────────────────────

function DetailFAQ({ theme, palette, icon, onBack }) {
  const a = theme.accent;
  const items = [
    {
      q: 'What does Tender do?',
      ans: 'It’s the helm for the Harborline fleet — one tray menu that wires up Signal-Bridge, Sunfish, and Flight-Deck on every machine and gives you a live view of all of them at once.',
    },
    {
      q: 'How do I add another device to the fleet?',
      ans: 'Open the workspace dropdown, scroll to the foot, and choose “Manage devices…”. Install Tender there, sign in, and it’ll appear within ~10s.',
    },
    {
      q: 'Where do I report a stuck fiber link?',
      ans: 'Engine Room → Restart Tender often clears it. If not, Collect logs & diagnostics and hail the crew.',
    },
    {
      q: 'Can I run Tender headless?',
      ans: 'Yes — tender --headless --workspace=<host>. The tray UI is optional; the helm process is the same.',
    },
    {
      q: 'Why is my GPU worker amber?',
      ans: 'Worker temperature ≥ 75 °C. Worker still operational — Flight-Deck will throttle automatically at 82 °C.',
    },
    {
      q: 'How do I roll back an update?',
      ans: 'Refit Yard → tap the version pill on the row. Tender keeps the last 3 builds in the cache.',
    },
  ];

  const [open, setOpen] = useStateS(0);

  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="Bosun’s Log · FAQ"
        sub="6 entries · last revised 05/14" onBack={onBack}
        badge={<GearBadge theme={theme} label="FAQ"/>}/>
      <FiberDivider color={a}/>

      {/* Search-like row (faux input) */}
      <div style={{padding:'10px 14px'}}>
        <FauxInput theme={theme} value="search the log…" mono={false}
          suffix="⌘K"/>
      </div>

      <FiberDivider color={a} dim/>

      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} style={{
            borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              style={{
                width:'100%', textAlign:'left',
                padding:'10px 14px',
                background: isOpen ? `${a}10` : 'transparent',
                border:'none', cursor:'pointer',
                display:'flex', alignItems:'center', gap: 10,
                color: theme.text,
              }}
              onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = `${a}08`; }}
              onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{
                fontFamily:"'JetBrains Mono', monospace", fontSize: 9,
                color: a, letterSpacing: 0.6, width: 18, flexShrink: 0,
                textShadow: `0 0 4px ${a}88`,
              }}>Q·{String(i+1).padStart(2,'0')}</span>
              <span style={{flex: 1, fontSize: 11.5, lineHeight: 1.3, letterSpacing: 0.1}}>{it.q}</span>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none"
                   style={{transform: isOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.18s', flexShrink: 0}}>
                <path d="M1.5 3 L 4.5 6 L 7.5 3" stroke={theme.textDim} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {isOpen && (
              <div style={{
                padding:'2px 14px 12px 46px',
                background:`${a}08`,
                fontSize: 11, color: theme.textDim, lineHeight: 1.5,
                letterSpacing: 0.1,
              }}>{it.ans}</div>
            )}
          </div>
        );
      })}

      <ActionFooter theme={theme} primary="Open Manual" secondary="Hail Crew"/>
    </MenuShell>
  );
}

// ─── 3. Plugins · Cargo Hold ───────────────────────────────────────────

function DetailPlugins({ theme, palette, icon, onBack }) {
  const a = theme.accent;
  const m = theme.metalBright;
  const plugins = [
    { name: 'fiber-trace-export',   ver: 'v0.4.2', src: 'official',  on: true,  desc: 'Stream fiber traces to ndjson' },
    { name: 'flight-deck-prom',     ver: 'v1.1.0', src: 'official',  on: true,  desc: 'Prometheus exporter for GPU metrics' },
    { name: 'sunfish-s3-mirror',    ver: 'v0.9.1', src: 'community', on: true,  update: 'v1.0.0', desc: 'Mirror indexed output to S3' },
    { name: 'crew-comms-bridge',    ver: 'v2.0.0', src: 'community', on: false, desc: 'Bridge Crew Comms to Slack/Matrix' },
    { name: 'tender-cli',           ver: 'v0.3.0', src: 'sideload',  on: true,  desc: 'Shell access to the helm process' },
  ];
  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="Cargo Hold · Plugins"
        sub="5 installed · 4 active" onBack={onBack}
        badge={<GearBadge theme={theme} label="Plugins"/>}/>
      <FiberDivider color={a}/>

      <div style={{padding:'8px 14px 4px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform:'uppercase', color: theme.textMuted}}>
          ↳ Loaded crates
        </span>
        <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, color: a, letterSpacing: 0.6}}>1 update</span>
      </div>

      {plugins.map((p, i) => {
        const srcColor = p.src === 'official' ? a : p.src === 'community' ? m : theme.textDim;
        return (
          <div key={p.name} style={{
            padding:'9px 14px',
            display:'flex', alignItems:'center', gap: 10,
            borderBottom: i < plugins.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            opacity: p.on ? 1 : 0.55,
          }}>
            {/* Crate glyph */}
            <div style={{
              width: 22, height: 22, flexShrink: 0,
              border: `1px solid ${srcColor}66`,
              background:`linear-gradient(180deg, ${theme.surface}, ${theme.bgSoft})`,
              borderRadius: 2,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: p.on ? `0 0 6px ${srcColor}33, inset 0 0 4px ${srcColor}22` : 'none',
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1.5" y="1.5" width="9" height="9" stroke={srcColor} strokeWidth="1" fill="none"/>
                <line x1="1.5" y1="6" x2="10.5" y2="6" stroke={srcColor} strokeWidth="0.8"/>
                <line x1="6" y1="1.5" x2="6" y2="10.5" stroke={srcColor} strokeWidth="0.8"/>
              </svg>
            </div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{display:'flex', alignItems:'center', gap: 6, marginBottom: 2}}>
                <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 10.5, color: theme.text, letterSpacing: 0.2}}>
                  {p.name}
                </span>
                <span style={{
                  fontFamily:"'JetBrains Mono', monospace", fontSize: 7.5,
                  color: srcColor, background: `${srcColor}1a`,
                  border: `1px solid ${srcColor}55`,
                  borderRadius: 2, padding:'1px 4px',
                  letterSpacing: 0.8, textTransform:'uppercase',
                }}>{p.src}</span>
                {p.update && (
                  <span style={{
                    fontFamily:"'JetBrains Mono', monospace", fontSize: 7.5,
                    color: m, background: `${m}1a`,
                    border: `1px solid ${m}55`,
                    borderRadius: 2, padding:'1px 4px',
                    letterSpacing: 0.8, textTransform:'uppercase',
                  }}>↑ {p.update}</span>
                )}
              </div>
              <div style={{fontSize: 10, color: theme.textDim, lineHeight: 1.3, letterSpacing: 0.05}}>
                {p.desc}
              </div>
              <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5, color: theme.textMuted, marginTop: 2, letterSpacing: 0.4}}>
                {p.ver}
              </div>
            </div>
            <MiniToggle theme={theme} on={p.on}/>
          </div>
        );
      })}

      <ActionFooter theme={theme} primary="Browse Marketplace" secondary="Sideload .tplg"/>
    </MenuShell>
  );
}

// ─── 4. Proxy Wiring ──────────────────────────────────────────────────

function DetailProxy({ theme, palette, icon, onBack }) {
  const a = theme.accent;
  const m = theme.metalBright;
  const [mode, setMode] = useStateS('manual');
  const [auth, setAuth] = useStateS(true);

  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="Proxy Wiring"
        sub="Outbound routing · MK VII" onBack={onBack}
        badge={<GearBadge theme={theme} label="Proxy"/>}/>
      <FiberDivider color={a}/>

      {/* Mode selector */}
      <div style={{padding:'12px 14px 8px'}}>
        <FormLabel theme={theme}>Routing mode</FormLabel>
        <SegRadio theme={theme} value={mode} onChange={setMode}
          options={[
            { label: 'Direct', value: 'direct' },
            { label: 'Auto',   value: 'auto'   },
            { label: 'Manual', value: 'manual' },
            { label: 'PAC',    value: 'pac'    },
          ]}/>
      </div>

      <FiberDivider color={a} dim/>

      {/* Manual fields */}
      <div style={{padding:'10px 14px 8px', display:'flex', gap: 8}}>
        <div style={{flex: 2}}>
          <FormLabel theme={theme}>Host</FormLabel>
          <FauxInput theme={theme} value="proxy.harborline.co"/>
        </div>
        <div style={{flex: 1}}>
          <FormLabel theme={theme}>Port</FormLabel>
          <FauxInput theme={theme} value="8080" accent/>
        </div>
      </div>

      <div style={{padding:'4px 14px 8px'}}>
        <FormLabel theme={theme}>Bypass list</FormLabel>
        <FauxInput theme={theme} value="*.local, 10.0.0.0/8, 100.64.0.0/10"/>
      </div>

      <FiberDivider color={a} dim/>

      {/* Auth toggle row */}
      <div style={{
        padding:'10px 14px', display:'flex', alignItems:'center', gap: 10,
        borderBottom:'1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{flex: 1}}>
          <div style={{fontSize: 11.5, color: theme.text, letterSpacing: 0.1}}>Authenticate</div>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9, color: theme.textMuted, letterSpacing: 0.4, marginTop: 2}}>
            user · ••••••••
          </div>
        </div>
        <MiniToggle theme={theme} on={auth} onClick={() => setAuth(v => !v)}/>
      </div>

      {/* Test-connection status */}
      <div style={{
        padding:'10px 14px',
        display:'flex', alignItems:'center', gap: 9,
        background:`${a}0c`,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{flexShrink: 0}}>
          <circle cx="7" cy="7" r="5.5" stroke={a} strokeWidth="1.3" fill="none"/>
          <path d="M4.5 7 L 6.2 8.7 L 9.5 5.5" stroke={a} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
                style={{filter:`drop-shadow(0 0 3px ${a}aa)`}}/>
        </svg>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{fontSize: 11, color: theme.text, letterSpacing: 0.1}}>Last test · reachable</div>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5, color: theme.textMuted, letterSpacing: 0.5, marginTop: 2}}>
            14:08:22 · 142 ms · http/1.1 200
          </div>
        </div>
        <StatusPill theme={theme} text="OK"/>
      </div>

      <ActionFooter theme={theme} primary="Save" secondary="Test Connection"/>
    </MenuShell>
  );
}

// ─── 5. Quarterdeck · Account ─────────────────────────────────────────

function DetailAccount({ theme, palette, icon, onBack }) {
  const a = theme.accent;
  const m = theme.metalBright;
  const sessions = [
    { host: 'steamtide-w11',   loc: 'Reykjavík · WIN', when: 'this device', here: true  },
    { host: 'harbor-mac-air',  loc: 'Reykjavík · MAC', when: 'active 12m'                 },
    { host: 'harbor-prod-01',  loc: 'Frankfurt · LNX', when: 'active 4h'                  },
    { host: 'old-sloop-rig',   loc: 'Unknown · LNX',   when: 'idle · 2d'                  },
  ];
  return (
    <MenuShell theme={theme}>
      <DetailHeader theme={theme} title="Quarterdeck · Account"
        sub="Signed in · MK VII seat 0341" onBack={onBack}
        badge={<GearBadge theme={theme} label="Account"/>}/>
      <FiberDivider color={a}/>

      {/* User card */}
      <div style={{
        padding:'13px 14px 12px',
        display:'flex', alignItems:'center', gap: 11,
        background:`linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
        borderBottom:'1px solid rgba(0,0,0,0.28)',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 99,
          background:`linear-gradient(180deg, ${a}55, ${a}22)`,
          border:`1px solid ${a}88`,
          color: theme.accentBright,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:"'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600,
          letterSpacing: 0.4,
          boxShadow: `0 2px 8px ${theme.shadow}, 0 0 10px ${a}44`,
          flexShrink: 0,
        }}>JM</div>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{fontSize: 13, color: theme.text, letterSpacing: 0.1, fontWeight: 500}}>Jess Marlowe</div>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9.5, color: theme.textMuted, marginTop: 3, letterSpacing: 0.5}}>
            jess@harborline.co · Bosun
          </div>
        </div>
        <div style={{
          fontFamily:"'JetBrains Mono', monospace", fontSize: 9,
          color: m,
          background:`${m}1a`,
          border:`1px solid ${m}55`,
          borderRadius: 99, padding:'2px 8px',
          letterSpacing: 0.8, textTransform:'uppercase',
          boxShadow: `inset 0 0 4px ${m}22`,
        }}>MK VII</div>
      </div>

      {/* Spec data */}
      <div style={{padding:'8px 0 6px'}}>
        <DataLine theme={theme} label="org"      value="harborline.co"/>
        <DataLine theme={theme} label="seat"     value="0341 / 0500"/>
        <DataLine theme={theme} label="renews"   value="2026-09-12"/>
        <DataLine theme={theme} label="auth"     value="passkey · webauthn" tone={a}/>
      </div>

      <FiberDivider color={a} dim/>

      {/* Sessions */}
      <div style={{padding:'8px 14px 4px', fontFamily:"'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform:'uppercase', color: theme.textMuted}}>
        ↳ Active sessions · 4
      </div>

      {sessions.map((s, i) => (
        <div key={s.host} style={{
          padding:'6px 14px',
          display:'flex', alignItems:'center', gap: 9,
          borderBottom: i < sessions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 99,
            background: s.here ? a : theme.textMuted,
            boxShadow: s.here ? `0 0 4px ${a}, 0 0 8px ${a}88` : 'none',
            flexShrink: 0,
          }}/>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{display:'flex', alignItems:'center', gap: 6}}>
              <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 10.5, color: theme.text, letterSpacing: 0.2}}>{s.host}</span>
              {s.here && (
                <span style={{
                  fontFamily:"'JetBrains Mono', monospace", fontSize: 7.5,
                  color: a, background: `${a}22`, border: `1px solid ${a}55`,
                  borderRadius: 2, padding:'1px 4px',
                  letterSpacing: 0.8, textTransform:'uppercase',
                }}>this</span>
              )}
            </div>
            <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5, color: theme.textMuted, letterSpacing: 0.5, marginTop: 2}}>
              {s.loc} · {s.when}
            </div>
          </div>
          {!s.here && (
            <button style={{
              padding:'3px 7px',
              fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5,
              color: theme.danger,
              background:`${theme.danger}14`,
              border:`1px solid ${theme.danger}55`,
              borderRadius: 2,
              cursor:'pointer',
              letterSpacing: 0.6, textTransform:'uppercase',
            }}>Revoke</button>
          )}
        </div>
      ))}

      <ActionFooter theme={theme} primary="Log Out" secondary="Switch User" danger/>
    </MenuShell>
  );
}

// ─── Register screens into the dispatch table from detail-screens.jsx ─

if (window.DETAIL_SCREENS) {
  Object.assign(window.DETAIL_SCREENS, {
    'about':   DetailAbout,
    'faq':     DetailFAQ,
    'plugins': DetailPlugins,
    'proxy':   DetailProxy,
    'account': DetailAccount,
  });
}

Object.assign(window, {
  DetailAbout, DetailFAQ, DetailPlugins, DetailProxy, DetailAccount,
  GearBadge, FauxInput, SegRadio, MiniToggle, FormLabel,
});
