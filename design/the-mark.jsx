// The Mark — steampunk-tech fleur-de-lis. Dark gunmetal petals carry a
// cold cyan fiber-optic glow tracing their centers, a brass-bolted collar
// crosses the midpoint with a glowing cyan gem at center. Reads like a
// piece of Victorian-era industrial machinery wired up with cold optical
// light — what you'd find on the engine-room bulkhead of an airship.

const TM_GUNMETAL    = '#0f1115';
const TM_GUNMETAL_2  = '#1a1d22';
const TM_GUNMETAL_3  = '#2a2e35';
const TM_BRASS_OXID  = '#8b6d34';  // oxidized brass — band + rivets
const TM_BRASS_LIT   = '#c4923d';  // brass highlight
const TM_CYAN        = '#5fb8e0';  // fiber-optic glow
const TM_CYAN_BRIGHT = '#a3dcf5';
const TM_COOL_GRAY   = '#dde2ea';

// ── A small reusable rivet glyph used along the collar
function Rivet({ cx, cy, r = 0.7 }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={TM_BRASS_LIT}/>
      <circle cx={cx} cy={cy} r={r * 0.45} fill={TM_GUNMETAL}/>
    </>
  );
}

// The mark is now an image asset (assets/fleur-mark.png) — the dark
// gunmetal + cyan-glow fleur the user provided. We render it inside a
// rounded container so it sits cleanly as a tray icon. The palette param
// is preserved for API compatibility but the image is brand-locked.
function FleurMarkSVG({ palette, bg, rounded = 7, showGlow = true, whiten = false }) {
  // We accept the same props as the previous SVG implementation but render
  // the supplied PNG. Background is intrinsic to the image, but we still
  // honour the rounded prop by clipping the image with border-radius.
  // `whiten` collapses the source colors to pure white via filter, used
  // when the icon sits as a tray glyph on a dark menu bar so it reads
  // as a monochrome accessory — same convention as macOS template
  // images and Windows tray icons.
  return (
    <div style={{
      width:'100%', height:'100%',
      borderRadius: rounded,
      overflow:'hidden',
      background: bg || TM_GUNMETAL,
      display:'block',
    }}>
      <img
        src="assets/fleur-mark.png"
        alt="Tender mark"
        draggable={false}
        style={{
          width:'100%', height:'100%',
          display:'block',
          // New transparent-bg source: keep the whole fleur in view and
          // let the gunmetal background plate show through its empty
          // areas. A slight scale fills the visible area without cropping
          // the tips of the petals.
          objectFit:'contain',
          transform: 'scale(1.04)',
          transformOrigin: 'center',
          // brightness(0) crushes RGB to black, invert(1) flips it to
          // white, preserving the alpha channel for a clean silhouette.
          filter: whiten ? 'brightness(0) invert(1)' : 'none',
        }}
      />
    </div>
  );
}

// Tile version of the mark (for tray icon). Transparent background so the
// fleur sits on whatever surface the menu header / tray button provides,
// rather than punching a black square through it.
function FleurMark({ size = 32, palette, whiten = false }) {
  return (
    <div style={{width:size, height:size, display:'block'}}>
      <FleurMarkSVG palette={palette} bg="transparent" rounded={0}
                    showGlow={size >= 24} whiten={whiten}/>
    </div>
  );
}

// ── Hero brand plate — steampunk industrial: dark gunmetal field with
// subtle dot-grain texture, glowing fiber-optic accent lines, brass
// corner brackets with rivets, big centered fleur and a wordmark.
function FleurMarkHero() {
  return (
    <div style={{
      width:'100%', height:'100%',
      position:'relative',
      backgroundColor: TM_GUNMETAL,
      backgroundImage: `
        radial-gradient(140% 100% at 50% 40%, #1f242c 0%, #131519 60%, #07080b 100%),
        repeating-linear-gradient(90deg, transparent 0 24px, rgba(255,255,255,0.02) 24px 25px),
        radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
        radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 3px 3px, 4px 4px',
      backgroundPosition: '0 0, 0 0, 0 0, 1px 1px',
      backgroundBlendMode: 'normal, overlay, overlay, multiply',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      overflow:'hidden',
      fontFamily:"'Cormorant Garamond', serif",
    }}>
      {/* Glowing fiber-optic perimeter — thin cyan rule near the edges */}
      <div style={{
        position:'absolute', inset: 14,
        border: `1px solid ${TM_CYAN}33`,
        boxShadow: `0 0 16px ${TM_CYAN}22, inset 0 0 16px ${TM_CYAN}14`,
        pointerEvents:'none',
      }}/>

      {/* Brass corner brackets with rivets */}
      {[
        {top: 14, left: 14, rot: 0},
        {top: 14, right: 14, rot: 90},
        {bottom: 14, left: 14, rot: -90},
        {bottom: 14, right: 14, rot: 180},
      ].map((p, i) => (
        <div key={i} style={{
          position:'absolute',
          top: p.top, bottom: p.bottom, left: p.left, right: p.right,
          width: 28, height: 28,
          transform: `rotate(${p.rot}deg)`,
        }}>
          <svg viewBox="0 0 28 28" width="28" height="28">
            <path d="M 0 1.5 L 16 1.5" stroke={TM_BRASS_OXID} strokeWidth="2" strokeLinecap="round"/>
            <path d="M 1.5 0 L 1.5 16" stroke={TM_BRASS_OXID} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="1.5" cy="1.5" r="1.4" fill={TM_BRASS_LIT}/>
            <circle cx="1.5" cy="1.5" r="0.6" fill={TM_GUNMETAL}/>
          </svg>
        </div>
      ))}

      {/* Top-left plate */}
      <div style={{
        position:'absolute', top: 28, left: 56,
        fontFamily:"'JetBrains Mono', monospace",
        fontSize: 9, letterSpacing: 1.6, textTransform:'uppercase',
        color: `${TM_CYAN}`, opacity: 0.85,
      }}>↳ № 001 · The Mark</div>

      {/* Top-right plate */}
      <div style={{
        position:'absolute', top: 28, right: 56,
        fontFamily:"'JetBrains Mono', monospace",
        fontSize: 9, letterSpacing: 1.6, textTransform:'uppercase',
        color: `${TM_BRASS_LIT}`, opacity: 0.85,
      }}>Harborline · MK VII</div>

      {/* The fleur — the provided PNG, large and centered, with a subtle
          outer cyan glow to lift it off the plate */}
      <div style={{
        width: 260, height: 260,
        filter: `drop-shadow(0 0 28px ${TM_CYAN}66) drop-shadow(0 14px 36px rgba(0,0,0,0.7))`,
        marginBottom: 8,
      }}>
        <img
          src="assets/fleur-mark.png"
          alt="Tender mark"
          draggable={false}
          style={{width:'100%', height:'100%', display:'block', objectFit:'contain'}}
        />
      </div>

      {/* Wordmark — Cormorant italic in cool gray */}
      <div style={{
        fontFamily:"'Cormorant Garamond', serif",
        fontStyle:'italic', fontWeight: 500, fontSize: 38,
        color: TM_COOL_GRAY, letterSpacing: 1.2, lineHeight: 1,
        marginTop: 2,
      }}>
        Tender
      </div>

      {/* Glowing rule */}
      <div style={{
        width: 56, height: 1, marginTop: 14, marginBottom: 10,
        background: TM_CYAN, opacity: 0.7,
        boxShadow: `0 0 8px ${TM_CYAN}, 0 0 16px ${TM_CYAN}55`,
      }}/>

      {/* Tagline */}
      <div style={{
        fontFamily:"'JetBrains Mono', monospace",
        fontSize: 10, letterSpacing: 3.5, textTransform:'uppercase',
        color: `${TM_COOL_GRAY}aa`,
      }}>
        Watch · Engine Room · Harborline
      </div>
    </div>
  );
}

// Size ladder card — gunmetal field, the mark at every tray-relevant size
function FleurMarkSizeCard() {
  const sizes = [64, 48, 32, 24, 16, 12];
  return (
    <div style={{
      width:'100%', height:'100%',
      background: TM_GUNMETAL,
      display:'flex', flexDirection:'column',
      fontFamily:"'Space Grotesk', sans-serif",
      color: TM_COOL_GRAY,
    }}>
      <div style={{
        flex:1,
        backgroundImage: `
          radial-gradient(140% 100% at 50% 35%, #1f242c 0%, #131519 60%, #07080b 100%),
          repeating-linear-gradient(0deg, transparent 0 28px, rgba(255,255,255,0.025) 28px 29px)
        `,
        display:'flex', alignItems:'center', justifyContent:'center', gap: 22,
        padding:'30px 22px',
      }}>
        {sizes.map(s => (
          <div key={s} style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 8}}>
            <div style={{
              width: s, height: s,
              borderRadius: Math.max(2, s * 0.22), overflow:'hidden',
              boxShadow: s > 32 ? `0 6px 18px rgba(0,0,0,0.55), 0 0 14px ${TM_CYAN}22` : 'none',
            }}>
              <FleurMarkSVG bg={TM_GUNMETAL} rounded={s * 0.22} showGlow={s >= 24}/>
            </div>
            <div style={{
              fontFamily:"'JetBrains Mono', monospace", fontSize: 9,
              letterSpacing: 0.8, color: `${TM_COOL_GRAY}88`,
            }}>{s}px</div>
          </div>
        ))}
      </div>

      {/* Taskbar context — neutral dark, the icon in the tray */}
      <div style={{
        padding:'11px 18px',
        background: 'rgba(8,10,13,0.95)',
        borderTop: `1px solid ${TM_CYAN}22`,
        display:'flex', alignItems:'center', gap: 12,
        justifyContent:'flex-end',
      }}>
        <span style={{color:'rgba(255,255,255,0.4)', fontSize:12}}>⌃</span>
        <span style={{color:'rgba(255,255,255,0.4)', fontSize:12}}>✦</span>
        <span style={{color:'rgba(255,255,255,0.4)', fontSize:12}}>⌬</span>
        <div style={{
          width: 28, height: 28,
          display:'flex', alignItems:'center', justifyContent:'center',
          borderRadius: 5,
          background: `${TM_CYAN}1e`,
          outline: `1px solid ${TM_CYAN}55`,
          boxShadow: `0 0 8px ${TM_CYAN}33`,
        }}>
          <div style={{width: 18, height: 18, borderRadius: 4, overflow:'hidden'}}>
            <FleurMarkSVG bg={TM_GUNMETAL} rounded={4} showGlow={false}/>
          </div>
        </div>
        <span style={{color:'rgba(255,255,255,0.78)', fontFamily:"'JetBrains Mono', monospace", fontSize:10, marginLeft:4, letterSpacing: 0.4}}>14:08</span>
      </div>

      {/* Label */}
      <div style={{
        padding:'14px 18px 16px',
        background: TM_GUNMETAL,
        borderTop: `1px solid ${TM_CYAN}22`,
      }}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', gap: 12, marginBottom: 8}}>
          <div style={{fontFamily:"'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, fontStyle:'italic', color: TM_COOL_GRAY, letterSpacing: -0.2, lineHeight: 1}}>
            The Mark
          </div>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: 1.2, color: TM_CYAN, textTransform:'uppercase', whiteSpace:'nowrap'}}>
            Engine Room · MK VII
          </div>
        </div>
        <div style={{fontSize: 11.5, color: `${TM_COOL_GRAY}aa`, lineHeight: 1.45}}>
          Gunmetal fleur with fiber-optic cyan conduits down each petal.
          Brass-bolted collar with a glowing cyan gem at center. Cold
          industrial steampunk-tech aesthetic.
        </div>
      </div>
    </div>
  );
}

// Register as the default tray mark
(function registerMark() {
  if (!window.COMPASS_VARIANTS) window.COMPASS_VARIANTS = [];
  // Remove any pre-existing 'tm-fleur' entry
  window.COMPASS_VARIANTS = window.COMPASS_VARIANTS.filter(v => v.id !== 'tm-fleur');
  window.COMPASS_VARIANTS.unshift({
    id: 'tm-fleur',
    name: 'The Mark · Engine Room fleur',
    tag: 'Steampunk-tech',
    note: 'Gunmetal fleur with cyan fiber-optic glow + brass rivets',
    C: FleurMark,
  });
})();

Object.assign(window, { FleurMarkSVG, FleurMark, FleurMarkHero, FleurMarkSizeCard });
