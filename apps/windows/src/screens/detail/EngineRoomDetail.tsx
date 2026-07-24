import { useTheme } from '../../theme/useTheme';
import { FiberDivider } from '../../components/FiberDivider';
import { DetailHeader } from '../../components/detail/DetailHeader';
import { StatusPill } from '../../components/detail/StatusPill';
import { ActionFooter } from '../../components/detail/ActionFooter';
import { MeterBar } from '../../components/detail/MeterBar';

const PROCS = [
  { name: 'sunfish.indexer', cpu: 14, mem: '1.2 G' },
  { name: 'flight-deck',     cpu: 11, mem: '982 M' },
  { name: 'signal-bridge',   cpu: 6,  mem: '648 M' },
  { name: 'tender',          cpu: 3,  mem: '124 M' },
  { name: 'dock-router',     cpu: 2,  mem: '88 M'  },
];

interface Props { onBack: () => void }

export function EngineRoomDetail({ onBack }: Props) {
  const { theme: t } = useTheme();
  const a = t.accent;

  return (
    <div>
      <DetailHeader
        title="Engine Room"
        sub="Local node · steamtide-w11"
        badge={<StatusPill text="Healthy" />}
        onBack={onBack}
      />
      <FiberDivider color={a} />

      <MeterBar label="CPU"     value={38}  max={100}  unit="%" />
      <MeterBar label="Memory"  value={4.2} max={16}   unit=" G" />
      <MeterBar label="Disk"    value={240} max={1000} unit=" G" />
      <MeterBar label="Network" value={42}  max={100}  unit=" mb/s" />

      <FiberDivider color={a} dim />

      <div style={{ padding: '8px 14px 4px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: t.textMuted }}>
        ↳ Top processes
      </div>

      {PROCS.map((p, i) => (
        <div key={p.name} style={{
          padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: i < PROCS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <span style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: t.text, letterSpacing: 0.2 }}>{p.name}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: a, letterSpacing: 0.3, width: 36, textAlign: 'right' }}>{p.cpu}%</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: t.textDim, letterSpacing: 0.3, width: 48, textAlign: 'right' }}>{p.mem}</span>
        </div>
      ))}

      <ActionFooter primary="Full Diagnostics" secondary="Restart Tender" />
    </div>
  );
}
