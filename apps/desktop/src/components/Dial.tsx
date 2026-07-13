// Analog telegraph-face gauge. 240° arc, clockwise sweep.
// Ported from mac-design/menu-variants.jsx § function Dial.

import { useTheme } from '@/theme/ThemeProvider'

interface Props {
  value: number
  max: number
  label: string   // center reading text (e.g. "12.3")
  sub: string     // unit sub-label (e.g. "MB/S")
  updateAvailable?: boolean
}

const R = 22
const CX = 28
const CY = 28
const START_DEG = -210
const END_DEG = 30

function polar(deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [CX + Math.cos(a) * R, CY + Math.sin(a) * R]
}

export function Dial({ value, max, label, sub, updateAvailable = false }: Props) {
  const { theme } = useTheme()
  const a = theme.accent
  const m = theme.signal

  const clamped = Math.min(value, max)
  const valDeg = START_DEG + (clamped / max) * (END_DEG - START_DEG)

  const [x1, y1] = polar(START_DEG)
  const [x2, y2] = polar(END_DEG)
  const [xv, yv] = polar(valDeg)
  const largeArc = valDeg - START_DEG > 180 ? 1 : 0
  const filterId = `dial-glow-${label.replace(/\s+/g, '-')}`

  return (
    <div style={{ position: 'relative', width: 56, height: 56 }}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer ring */}
        <circle cx="28" cy="28" r="25" fill="rgba(0,0,0,0.4)" stroke={`${a}55`} strokeWidth="1" />

        {/* Background arc (full 240°) */}
        <path
          d={`M${x1} ${y1} A${R} ${R} 0 1 1 ${x2} ${y2}`}
          stroke={`${theme.text}22`} strokeWidth="2.5" fill="none" strokeLinecap="round"
        />

        {/* Value arc */}
        {clamped > 0 && (
          <path
            d={`M${x1} ${y1} A${R} ${R} 0 ${largeArc} 1 ${xv} ${yv}`}
            stroke={a} strokeWidth="2.5" fill="none" strokeLinecap="round"
            filter={`url(#${filterId})`}
          />
        )}

        {/* Tick marks */}
        {[0, 1, 2, 3, 4].map((i) => {
          const tickDeg = START_DEG + (i / 4) * (END_DEG - START_DEG)
          const ar = (tickDeg * Math.PI) / 180
          const [tx1, ty1] = [CX + Math.cos(ar) * (R - 3), CY + Math.sin(ar) * (R - 3)]
          const [tx2, ty2] = [CX + Math.cos(ar) * (R - 7), CY + Math.sin(ar) * (R - 7)]
          return (
            <line key={i} x1={tx1} y1={ty1} x2={tx2} y2={ty2}
              stroke={`${theme.text}66`} strokeWidth="0.7" />
          )
        })}

        {/* Center label */}
        <text x="28" y="30" textAnchor="middle"
          fontFamily={theme.fontMono} fontSize="11" fontWeight="600"
          fill={theme.text}>{label}</text>
        <text x="28" y="40" textAnchor="middle"
          fontFamily={theme.fontMono} fontSize="6" letterSpacing="1"
          fill={a}>{sub}</text>
      </svg>

      {/* Brass update pip */}
      {updateAvailable && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          width: 7, height: 7, borderRadius: '50%',
          background: m,
          boxShadow: `0 0 4px ${m}, 0 0 8px ${m}aa`,
          border: `1px solid ${theme.bg}`,
        }} />
      )}
    </div>
  )
}
