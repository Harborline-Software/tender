import { useState } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { FiberDivider } from '@/components/FiberDivider'
import { ActionFooter } from '@/components/ActionFooter'
import { DataLine } from '@/components/DataLine'
import { ToggleSwitch } from '@/components/ToggleSwitch'

const INITIAL_TOGGLES = [
  { label: 'Auto-start with login',     on: true  },
  { label: 'Notifications · sound',     on: true  },
  { label: 'Notifications · banner',    on: false },
  { label: 'Pulse animations',          on: true  },
  { label: 'Telemetry to Harborline',   on: false },
]

interface Props {
  onBack: () => void
}

export function DockSettingsDetail({ onBack }: Props) {
  const { theme } = useTheme()
  const [toggles, setToggles] = useState(INITIAL_TOGGLES)

  const flip = (i: number) => setToggles((t) => t.map((x, j) => j === i ? { ...x, on: !x.on } : x))

  return (
    <MenuShell>
      <DetailHeader
        title="Dock Settings"
        sub="6 routes wired · MK VII"
        onBack={onBack}
        badge={<StatusPill text="Saved" />}
      />

      <div style={{ padding: '8px 14px 4px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: theme.textMuted }}>
        ↳ Wiring
      </div>

      {toggles.map((t, i) => (
        <div key={t.label} style={{
          padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          borderBottom: i < toggles.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <span style={{ flex: 1, fontSize: 11.5, color: theme.text }}>{t.label}</span>
          <ToggleSwitch on={t.on} onClick={() => flip(i)} />
        </div>
      ))}

      <FiberDivider dim />

      <DataLine label="theme"       value="Engine Room · dark" />
      <DataLine label="route count" value="6" />

      <ActionFooter primary="Edit Routes" secondary="Reset" />
    </MenuShell>
  )
}
