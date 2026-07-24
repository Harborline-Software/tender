import { useTheme } from '../../theme/useTheme';
import { FiberDivider } from '../../components/FiberDivider';
import { DetailHeader } from '../../components/detail/DetailHeader';
import { StatusPill } from '../../components/detail/StatusPill';
import { ActionFooter } from '../../components/detail/ActionFooter';

const WORKERS = [
  { id: 1, util: 88, temp: 71 },
  { id: 2, util: 92, temp: 73 },
  { id: 3, util: 78, temp: 68 },
  { id: 4, util: 95, temp: 76 },
  { id: 5, util: 81, temp: 70 },
  { id: 6, util: 89, temp: 72 },
  { id: 7, util: 83, temp: 69 },
];

interface Props { onBack: () => void }

export function FlightDeckDetail({ onBack }: Props) {
  const { theme: t } = useTheme();
  const a = t.accent;

  return (
    <div>
      <DetailHeader
        title="Flight-Deck Control"
        sub="7 of 7 workers airborne"
        badge={<StatusPill text="Airborne" />}
        onBack={onBack}
      />
      <FiberDivider color={a} />

      {/* GPU worker grid — 4 col */}
      <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {WORKERS.map(w => (
          <div key={w.id} style={{
            padding: '8px 6px 6px',
            background: `linear-gradient(180deg, ${t.bgSoft} 0%, ${t.bg} 100%)`,
            border: `1px solid ${a}33`,
            borderRadius: 4,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            boxShadow: `inset 0 0 8px ${a}10`,
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 0.8, color: t.textMuted }}>GPU·{w.id}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: t.accentBright, textShadow: `0 0 5px ${a}88` }}>
              {w.util}<span style={{ fontSize: 8, opacity: 0.7 }}>%</span>
            </div>
            <div style={{ height: 1.5, width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${w.util}%`, background: a, boxShadow: `0 0 3px ${a}` }} />
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7.5, letterSpacing: 0.4, color: w.temp > 75 ? '#f0b370' : t.textMuted }}>
              {w.temp}°C
            </div>
          </div>
        ))}
        {/* Spare slot */}
        <div style={{
          padding: '8px 6px 6px',
          border: `1px dashed ${t.border}`,
          borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 60,
        }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: t.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>spare</span>
        </div>
      </div>

      <ActionFooter primary="Open Dashboard" secondary="Emergency Stop" danger />
    </div>
  );
}
