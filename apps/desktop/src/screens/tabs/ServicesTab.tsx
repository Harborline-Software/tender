import { useTheme } from '@/theme/ThemeProvider'
import { ConsoleRow } from '@/components/ConsoleRow'
import { FiberDivider } from '@/components/FiberDivider'
import { type DetailId } from '@/state/types'

const SERVICES = [
  { name: 'harborline-router',       cpu: '0.4%', mem: '142 MB', hl: true },
  { name: 'harborline-fiber-relay',  cpu: '0.3%', mem: '88 MB',  hl: true },
  { name: 'harborline-update-agent', cpu: '0.0%', mem: '24 MB',  hl: true },
  { name: 'postgres',                cpu: '1.2%', mem: '512 MB', hl: false },
  { name: 'redis-server',            cpu: '0.1%', mem: '48 MB',  hl: false },
  { name: 'docker-daemon',           cpu: '2.1%', mem: '380 MB', hl: false },
  { name: 'localhost-proxy',         cpu: '0.0%', mem: '12 MB',  hl: false },
  { name: 'mDNSResponder',           cpu: '0.1%', mem: '18 MB',  hl: false },
]

interface Props {
  onNavigate: (id: DetailId) => void
}

export function ServicesTab({ onNavigate }: Props) {
  const { theme } = useTheme()
  const a = theme.accent

  return (
    <div>
      <div style={{
        padding: '8px 14px 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, letterSpacing: 1.4,
          textTransform: 'uppercase', color: theme.textMuted,
        }}>↳ 8 services · this node</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, color: a, letterSpacing: 0.6,
        }}>all healthy</span>
      </div>

      {SERVICES.map((s, i) => (
        <div key={s.name}>
          <ConsoleRow
            indicator="cpu"
            name={s.name}
            subLabel={`cpu ${s.cpu} · mem ${s.mem}`}
            active={s.hl}
            onClick={() => onNavigate('engine-room')}
          />
          {i < SERVICES.length - 1 && <FiberDivider dim />}
        </div>
      ))}
    </div>
  )
}
