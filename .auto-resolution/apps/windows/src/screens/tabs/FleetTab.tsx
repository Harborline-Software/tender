import { useTheme } from '../../theme/useTheme';
import { ConsoleRow } from '../../components/ConsoleRow';
import { FiberDivider } from '../../components/FiberDivider';
import { GaugeCard } from '../../components/GaugeCard';
import { UpdateCountBadge } from '../../components/UpdateCountBadge';
import { MOCK_SERVICES, MOCK_DIAL_SIGNAL_BRIDGE, MOCK_DIAL_SUNFISH, MOCK_DIAL_FLIGHT_DECK } from '../../mocks';
import type { DetailId } from '../../state/types';

interface Props {
  onNavigate: (id: DetailId) => void;
}

export function FleetTab({ onNavigate }: Props) {
  const { theme: t } = useTheme();
  const a = t.accent;

  const sb = MOCK_DIAL_SIGNAL_BRIDGE;
  const sf = MOCK_DIAL_SUNFISH;
  const fd = MOCK_DIAL_FLIGHT_DECK;

  return (
    <div>
      {/* Telegraph gauges row */}
      <div style={{ padding: '14px 14px 12px', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', gap: 8, background: `linear-gradient(180deg, ${t.bgSoft} 0%, ${t.bg} 100%)`, borderBottom: '1px solid rgba(0,0,0,0.3)' }}>
        <GaugeCard uid="sb"  value={sb.value} max={sb.max}  reading={sb.reading} sub={sb.sub}  bottomLabel="Signal-Bridge" onClick={() => onNavigate('signal-bridge')} />
        <GaugeCard uid="sf"  value={sf.value} max={sf.max}  reading={sf.reading} sub={sf.sub}  bottomLabel="Sunfish"       onClick={() => onNavigate('sunfish')} />
        <GaugeCard uid="fd"  value={fd.value} max={fd.max}  reading={fd.reading} sub={fd.sub}  bottomLabel="Flight-Deck"   onClick={() => onNavigate('flight-deck')} />
      </div>

      <div style={{ padding: '8px 14px 4px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: t.textMuted }}>
        ↳ Installed · {MOCK_SERVICES.length} tools
      </div>

      {MOCK_SERVICES.map((svc, i) => {
        const isRunning = svc.status === 'running';
        const meter = isRunning ? 'running' : 'stopped';
        const detail: DetailId = svc.id;

        return (
          <div key={svc.id}>
            <ConsoleRow
              indicator="port"
              name={svc.displayName}
              subLabel={`${svc.version} · ${svc.status}`}
              meter={meter}
              active={isRunning}
              badge={svc.updateAvailable ? <UpdateCountBadge count={1} /> : undefined}
              onClick={() => onNavigate(detail)}
            />
            {i < MOCK_SERVICES.length - 1 && <FiberDivider color={a} dim />}
          </div>
        );
      })}
    </div>
  );
}
