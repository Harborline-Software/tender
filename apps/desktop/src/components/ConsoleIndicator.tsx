import {
  Radio,
  LayoutGrid,
  Waves,
  Cpu,
  Settings,
  Power,
  Container,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'

export type IndicatorKind = 'port' | 'grid' | 'wave' | 'cpu' | 'cog' | 'power' | 'yard' | 'comms'

interface Props {
  kind: IndicatorKind
  color: string
  active?: boolean
  dimColor?: string
}

// P2 brand migration: the custom 11×11 glyphs moved to lucide-react (the
// product icon set) — same kind names, same call sites.
const ICONS: Record<IndicatorKind, LucideIcon> = {
  port: Radio,
  grid: LayoutGrid,
  wave: Waves,
  cpu: Cpu,
  cog: Settings,
  power: Power,
  yard: Container,
  comms: MessageSquare,
}

export function ConsoleIndicator({ kind, color, active = false, dimColor = 'rgba(220,230,240,0.45)' }: Props) {
  const dim = active ? color : dimColor
  const Icon = ICONS[kind]
  return (
    <Icon
      size={11}
      color={dim}
      strokeWidth={2}
      style={{ filter: active ? `drop-shadow(0 0 3px ${color})` : undefined, display: 'block' }}
    />
  )
}
