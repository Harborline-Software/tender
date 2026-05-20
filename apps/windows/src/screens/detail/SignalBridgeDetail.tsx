import { useTheme } from '../../theme/useTheme';
import { FiberDivider } from '../../components/FiberDivider';
import { ConsoleIndicator } from '../../components/ConsoleIndicator';
import { DetailHeader } from '../../components/detail/DetailHeader';
import { StatusPill } from '../../components/detail/StatusPill';
import { ActionFooter } from '../../components/detail/ActionFooter';
import { Sparkline } from '../../components/detail/Sparkline';

const THROUGHPUT_SAMPLES = [9.1,10.2,11.8,10.5,12.0,11.3,13.4,12.8,11.5,12.1,13.6,14.2,13.0,12.4,11.8,12.9,13.1,12.7,11.9,12.5,13.8,12.6,12.0,11.7,12.4,13.2,12.9,12.1,11.8,12.3];

const LINKS = [
  { name: 'harbor-east.tender.local', up: 4.2, down: 6.8 },
  { name: 'harbor-west.tender.local', up: 2.1, down: 3.4 },
  { name: 'flight-deck.local',        up: 1.9, down: 2.1 },
];

interface Props { onBack: () => void }

export function SignalBridgeDetail({ onBack }: Props) {
  const { theme: t } = useTheme();
  const a = t.accent;

  return (
    <div>
      <DetailHeader
        title="Signal-Bridge Linkage"
        sub="Fiber-routed services · 3 links"
        badge={<StatusPill text="Healthy" />}
        onBack={onBack}
      />
      <FiberDivider color={a} />

      {/* Throughput hero */}
      <div style={{ padding: '12px 14px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: t.textMuted }}>
            Throughput · 5 min
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: t.accentBright, textShadow: `0 0 6px ${a}88` }}>
            12.3 <span style={{ fontSize: 9, color: t.textDim }}>MB/S</span>
          </span>
        </div>
        <Sparkline values={THROUGHPUT_SAMPLES} color={a} width={296} height={56} />
      </div>

      <FiberDivider color={a} dim />

      {/* Active links */}
      <div style={{ padding: '10px 14px 4px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: t.textMuted }}>
        ↳ Active fiber links
      </div>
      {LINKS.map((l, i) => (
        <div key={l.name} style={{
          padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 9,
          borderBottom: i < LINKS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <ConsoleIndicator kind="port" color={a} active />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: t.text, letterSpacing: 0.1 }}>{l.name}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, color: t.textMuted, marginTop: 2, letterSpacing: 0.6 }}>
              ↑ {l.up} mb/s &nbsp; ↓ {l.down} mb/s
            </div>
          </div>
        </div>
      ))}

      <ActionFooter primary="Restart Link" secondary="View Logs" />
    </div>
  );
}
