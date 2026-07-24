import { useState } from 'react';
import { useTheme } from '../../theme/useTheme';
import { FiberDivider } from '../../components/FiberDivider';
import { DetailHeader } from '../../components/detail/DetailHeader';
import { StatusPill } from '../../components/detail/StatusPill';
import { ActionFooter } from '../../components/detail/ActionFooter';
import { DataLine } from '../../components/detail/DataLine';
import { ToggleRow } from '../../components/detail/ToggleRow';

interface Props { onBack: () => void }

export function DockSettingsDetail({ onBack }: Props) {
  const { theme: t, mode } = useTheme();
  const a = t.accent;

  const [toggles, setToggles] = useState([
    { label: 'Auto-start with Windows', on: true  },
    { label: 'Notifications · sound',   on: true  },
    { label: 'Notifications · banner',  on: false },
    { label: 'Pulse animations',        on: true  },
    { label: 'Telemetry to Harborline', on: false },
  ]);

  const flip = (i: number) =>
    setToggles(prev => prev.map((t, idx) => idx === i ? { ...t, on: !t.on } : t));

  return (
    <div>
      <DetailHeader
        title="Dock Settings"
        sub="6 routes wired · MK VII"
        badge={<StatusPill text="Saved" />}
        onBack={onBack}
      />
      <FiberDivider color={a} />

      <div style={{ padding: '8px 14px 4px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: t.textMuted }}>
        ↳ Wiring
      </div>

      {toggles.map((tog, i) => (
        <ToggleRow
          key={tog.label}
          label={tog.label}
          on={tog.on}
          onChange={() => flip(i)}
          borderTop={i > 0}
        />
      ))}

      <FiberDivider color={a} dim />
      <DataLine label="Theme"       value={`Engine Room · ${mode}`} />
      <DataLine label="Route Count" value="6" />

      <ActionFooter primary="Edit Routes" secondary="Reset" />
    </div>
  );
}
