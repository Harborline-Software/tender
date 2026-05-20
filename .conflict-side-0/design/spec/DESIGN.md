# Tender · Design System

The aesthetic is **Engine Room** — cold industrial steampunk-meets-tech.
Dark gunmetal surfaces carry cold cyan fiber-optic glow, with brass for
heritage detail (rivets, gears, update indicators). Everything else
(typography, motion, components) supports that.

## Brand axioms

1. **Surfaces are metal.** Use the frosted-steel plate gradient for any
   bounded content area. No flat panels — they always have a top highlight
   and a bottom shadow.
2. **Light is fiber-optic, not lamps.** Glow uses `box-shadow` with the
   accent color. Glow is thin and cyan, never warm.
3. **Brass is for heritage, not chrome.** Rivets, gears, and update
   indicators only. Brass is not an accent for active state.
4. **Cyan is for active state and live links.** Active dots, pulse
   dividers, hover stripes, button glow.
5. **Amber-red is reserved for danger.** Dry Dock, destructive actions,
   warnings.

---

## Color palette — Engine Room

The product ships with **one palette** in **two modes**. There are no
other palettes.

### Dark mode (default)

| Token | Hex | Used for |
|---|---|---|
| `bg` | `#15171c` | Menu background base |
| `bgSoft` | `#1e2128` | Plate gradient top, header background |
| `surface` | `#1a1d22` | Hover state surface |
| `text` | `#dde2ea` | Primary text |
| `textDim` | `rgba(221,226,234,0.62)` | Secondary text |
| `textMuted` | `rgba(221,226,234,0.42)` | Tertiary text, inactive icons |
| `border` | `rgba(95,184,224,0.18)` | Cyan-tinted dividers / panel borders |
| `shadow` | `rgba(0,0,0,0.7)` | Drop shadows |
| `accent` | `#5fb8e0` | Active state, glow, fiber lines |
| `accentBright` | `#a3dcf5` | Emphasized accent text, gem highlights |
| `metal` | `#7a5a28` | Oxidized brass — collar fill |
| `metalBright` | `#b8893d` | Brass highlights, rivets, update pips |
| `danger` | `#e87560` | Dry Dock, destructive UI |

### Light mode

Mode-specific overrides so contrast stays legible on cool-gray surfaces.

| Token | Hex | Notes |
|---|---|---|
| `bg` | `#dde0e6` | Cool gray surface |
| `bgSoft` | `#c8cdd6` | Plate gradient top |
| `surface` | `#d2d6df` | Hover state |
| `text` | `#15171c` | Inverted from dark |
| `textDim` | `rgba(21,23,28,0.7)` | |
| `textMuted` | `rgba(21,23,28,0.55)` | Stronger than dark mode's muted so icons stay visible |
| `border` | `rgba(21,23,28,0.18)` | |
| `shadow` | `rgba(21,23,28,0.22)` | |
| `accent` | `#1d6f9a` | **Deeper cyan** — light cyan on light bg fails contrast |
| `accentBright` | `#0f5277` | Even deeper for emphasized text |
| `danger` | `#a13325` | Deeper red for the same reason |

`metal` and `metalBright` are the same in both modes (brass reads on
either surface).

### System chrome (palette-agnostic)

The macOS desktop + menu bar behind the panel does **not** adopt the
palette. They use neutral macOS-style values so the panel is the only
thing carrying brand color.

| Token (dark) | Value |
|---|---|
| `wallpaper` | `linear-gradient(160deg, #2c2f36 0%, #1d2026 45%, #14171c 100%)` |
| `menuBar` (alias `taskbar`) | `rgba(30,30,32,0.65)` — translucent dark, expects `backdrop-filter: blur(20px) saturate(180%)` |
| `menuBarText` | `rgba(255,255,255,0.85)` |
| `menuBarDim` | `rgba(255,255,255,0.55)` |

| Token (light) | Value |
|---|---|
| `wallpaper` | `linear-gradient(160deg, #d0d8e2 0%, #b8c4d2 45%, #98a7b8 100%)` |
| `menuBar` (alias `taskbar`) | `rgba(244,244,244,0.78)` — translucent light + blur |
| `menuBarText` | `rgba(0,0,0,0.85)` |
| `menuBarDim` | `rgba(0,0,0,0.5)` |

The older `taskbar*` token names are kept as aliases for the menu-bar
role so existing component code doesn't need to be renamed.

---

## Typography

Three families, all served from Google Fonts (or self-hosted if offline).

| Family | Weights | Use |
|---|---|---|
| **Cormorant Garamond** | 500, 600 (italic + roman) | "Tender" wordmark in the header; detail screen titles |
| **Space Grotesk** | 400, 500, 600, 700 | All UI text (rows, buttons, body) |
| **JetBrains Mono** | 400, 500, 600 | Numbers, status codes, sub-labels (uppercase letterspaced) |

### Scale

| Role | Size | Family | Notes |
|---|---|---|---|
| Wordmark | 16 px | Cormorant italic 600 | letter-spacing 0.2 |
| Detail screen title | 13 px | Space Grotesk 600 | |
| Row name | 12.5 px | Space Grotesk 400 | letter-spacing 0.1 |
| Sub-label | 8.5 px | JetBrains Mono 400 | uppercase, letter-spacing 1.2 |
| Meter / status code | 10 px | JetBrains Mono 500 | letter-spacing 0.4 |
| Mono numeral large | 16–18 px | JetBrains Mono 600 | for big readouts |
| Button label | 11 px | Space Grotesk 500 | |

---

## Spacing & dimensions

| Token | Value |
|---|---|
| Menu width | 360 px |
| Detail screen width | 360 px (matches menu) |
| Header height | ~52 px |
| Tab strip height | 38 px |
| Row height (ConsoleRow) | ~46 px |
| Row padding | 8 px 14 px 8 px 12 px |
| Indicator column width | 14 px |
| Gap between row children | 11 px |
| Menu border radius | 8 px |
| Inner pill radius | 99 px (full round) |
| Plate divider thickness | 1 px |
| Fiber-optic divider thickness | 1 px (with glow shadow) |

---

## Components

### MenuShell

The outer panel frame. Used for the main menu and every detail screen.

- Background: `linear-gradient(180deg, bgSoft 0%, bg 100%)`
- Border: `1px solid rgba(0,0,0,0.55)`
- Border radius: `8px`
- Box shadow: `0 28px 70px {shadow}, 0 0 32px {accent}28, 0 0 0 1px {accent}1a`
  — drop shadow + outer cyan glow + thin crisp outline
- Always wraps content with a `FiberDivider` directly under the top edge.

### Frosted-steel plate (ConsoleRow)

Every list row. Recognizable by:

- Background gradient `linear-gradient(180deg, bgSoft 0%, bg 100%)`
- Border top `1px solid rgba(255,255,255,0.025)` (highlight)
- Border bottom `1px solid rgba(0,0,0,0.28)` (shadow)
- Hover: background shifts to `linear-gradient(180deg, surface 0%, bgSoft 100%)`,
  inset box-shadow `inset 0 0 16px {accent}14, inset 2px 0 0 {accent}` —
  a glowing cyan stripe on the left edge.
- Padding `8px 14px 8px 12px`, gap `11px`.

### FiberDivider

The glowing horizontal line between plates. Two flavors:

- **Strong** (`dim=false`): full-intensity, slow pulse (3s)
- **Dim** (`dim=true`): faint, longer pulse (5s)

Both implemented as a thin gradient with `box-shadow` glow and a
`consoleFiberPulse` CSS animation:

```css
@keyframes consoleFiberPulse {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}
```

### Brass collar & rivets (used in the logomark + Refit indicators)

A brass horizontal rect (`metal` fill) with a 0.5 px highlight strip at
the top (`metalBright`) and small rivets (`metalBright` with a tiny dark
center) spaced evenly along it. See `the-mark.jsx` for canonical
geometry.

### Indicator glyphs

Small 11×11 SVGs prefixing each row. Their inactive color is `textMuted`
(theme-aware); active color is `accent` with a `0 0 6px {accent}` glow.

| Kind | Use | Glyph |
|---|---|---|
| `port` | Service link (Signal-Bridge / Sunfish / Flight-Deck) | Ring + center dot |
| `grid` | Services Grid / Project list | 2×2 squares |
| `wave` | Fiber Traces | 3 stacked waves |
| `cpu` | Local node / OS service | Chip with pins |
| `cog` | Settings | Gear |
| `power` | Dry Dock / shutdown | Power symbol |
| `yard` | Updates | Crate + up-arrow |
| `comms` | Crew comms | Speech bubble + dots |

### Pills & badges

- **334-style counter pill** (not used anymore but pattern is): cyan
  background `{a}22`, border `{a}66`, dot with `box-shadow 0 0 8px {a}, 0 0 14px {a}88`,
  text in `accentBright`.
- **Update count pill**: brass-tinted version. Background `{metal}22`,
  border `{metal}66`, text in `metalBright`.
- **Unread message pip**: full cyan circle, min-width 14, padding `0 4px`,
  cyan glow.
- **Status pill** (`HEALTHY`, `LIVE`, etc.): same cyan recipe, mono caps.
- **NEW/FIX/PERF tags** in release notes: small rounded rects, kind-colored.

### Workspace dropdown button

Cyan-tinted pill: `background {a}1a`, `border 1px solid {a}55`,
`box-shadow 0 0 6px {a}22, inset 0 0 4px {a}1a`. Contains a pulsing
cyan dot, current device label (e.g. `Local`), and a small chevron.

### Icon buttons (update + gear)

26 × 26 borderless square. Hover background `{accent}22` (or `{metal}22`
for the update icon). 14 px SVG centered.

### Popovers

Anchored absolutely to the header:

- Workspace popover: `right: 78px, top: 48px`, width 268 px
- Gear popover: `right: 10px, top: 48px`, width 220 px

Both use the menu's `bg` background, `border 1px solid {border}`,
`box-shadow: 0 12px 30px {shadow}, 0 0 16px {a}33`, border-radius 5 px.

Internal rows: 8 px vertical, 11 px horizontal padding. Hover applies
`background {a}1a`. Danger items (Dry Dock) use `{theme.danger}1a` on
hover instead.

### Tab strip

3 equal-width buttons, 10 px vertical padding. Active tab:
- `fontWeight: 600`, color `text`
- Underline: 2 px high, cyan, `box-shadow: 0 0 6px {a}, 0 0 10px {a}88`,
  positioned at `bottom: -1, left: 22%, right: 22%`

Inactive tabs: `textDim`, weight 500. Hover lifts color to `text`.

### Dial gauge (telegraph face)

For Signal-Bridge / Sunfish / Flight-Deck. 56 × 56 SVG.

- Outer ring: `circle r=25, fill rgba(0,0,0,0.4), stroke {a}55`
- Background arc: 240° from -210° to +30°, stroke `{text}22`, width 2.5
- Value arc: same arc, drawn to current value, stroke `{accent}`, width 2.5,
  with cyan glow filter
- Tick marks: 5 ticks evenly along the arc, stroke `{text}66`, width 0.7
- Center label: `{readingText}` (e.g. "12.3" or "7/7") in JetBrains Mono
  11 px bold, fill `{text}`
- Subtext: `{subText}` (e.g. "MB/S") in 6 px mono, fill `{accent}`
- Update pip (when `updateAvailable`): brass dot in the upper-right
  corner, 7 × 7, glow `0 0 4px {metal}, 0 0 8px {metal}aa`, bordered with
  `{bg}` so it lifts off the gauge.

### Sparkline (telemetry detail)

Width × 44 px line chart with:
- Subtle gradient area fill (`{accent}` at top, fully transparent at bottom)
- Line stroke 1.4 px with `drop-shadow(0 0 4px {accent}88)`
- Trailing-value dot 2.5 px, full accent, with glow

### Meter bar

Horizontal progress bar:
- Track: 4 px high, `rgba(255,255,255,0.06)`, `borderRadius 99`
- Fill: `linear-gradient(90deg, {a}aa, {a})`, `box-shadow 0 0 6px {a}aa`,
  width = `value/max * 100%`
- Label row above: name on left, value `{n}/{max}` on right in mono with
  trailing unit dimmed.

### Toggle switch (settings)

26 × 14 px pill. Off: `rgba(255,255,255,0.08)` background, `{border}`
border, `{textDim}` knob. On: `{a}55` background, `{a}` border + glow,
`{accentBright}` knob with cyan glow. The knob translates `left: 1px`
to `left: 13px` over 150ms.

### Action footer (detail screens)

Bottom row of every detail screen. Two buttons, equal width:
- **Secondary** (left): outlined, `text` color, hairline border, no glow
- **Primary** (right): cyan-glowing, `accentBright` text, accent border,
  inset cyan glow

For destructive screens (Dry Dock confirmation), use `danger` color for
primary glow.

---

## Motion

- **Fiber pulse:** the divider `opacity` animation already specified.
- **Hover transitions:** 120 ms ease for background/shadow changes.
- **Mode flip:** No transition — instant repaint. Light/dark are state,
  not animation.
- **Tab switch:** No transition — content swap is instant. The cyan
  underline jumps (intentional — feels like an industrial switch).
- **Popover open:** Currently instant. Add `opacity 0 → 1 over 120 ms`
  if it feels too abrupt at native size.

---

## The Mark (logomark)

Use `assets/fleur-mark.png` (PNG, 512 × 512) — do not redraw or re-render
as SVG. Scale it as `<img>` inside a rounded-square container.

Required sizes (PNG fits all via CSS scaling):

| Use | Size |
|---|---|
| Hero brand plate | 220–260 px |
| Panel header (in-app) | 26 px (rounded 5) |
| Menu-bar accessory (highlighted state, panel open) | 22 px (rounded 4) |
| Menu-bar accessory (resting state) | 18 px (rounded 3) |
| Finder / Dock listing | 128, 256, 512 px |

For macOS `.icns` deliverables, generate from the PNG with `iconutil`
(produce 16/32/64/128/256/512 in `.iconset/` then `iconutil -c icns`).
The `.icns` is the app bundle's primary icon; the menu-bar accessory
uses the in-bundle PNG at runtime.

The mark must always sit on a dark gunmetal tile. Don't ever put it on a
light or cyan field — the brass + glow read incorrectly.
