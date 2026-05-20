import { useTheme } from '../../theme/useTheme';
import { ConsoleRow } from '../../components/ConsoleRow';
import { FiberDivider } from '../../components/FiberDivider';
import { MOCK_LOCAL_SERVICES } from '../../mocks';
import type { DetailId } from '../../state/types';

function fmtBytes(b: number) {
  if (b >= 1024 * 1024 * 1024) return `${(b / (1024 ** 3)).toFixed(1)} GB`;
  if (b >= 1024 * 1024)        return `${(b / (1024 ** 2)).toFixed(0)} MB`;
  return `${b} B`;
}

interface Props {
  onNavigate: (id: DetailId) => void;
}

export function ServicesTab({ onNavigate }: Props) {
  const { theme: t } = useTheme();
  const a = t.accent;

  return (
    <div>
      <div style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: t.textMuted }}>↳ {MOCK_LOCAL_SERVICES.length} services · this node</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: a, letterSpacing: 0.6 }}>all healthy</span>
      </div>

      {MOCK_LOCAL_SERVICES.map((s, i) => (
        <div key={s.name}>
          <ConsoleRow
            indicator="cpu"
            name={s.name}
            subLabel={`cpu ${s.cpu.toFixed(1)}% · mem ${fmtBytes(s.memBytes)}`}
            active={s.isHarborline}
            onClick={() => onNavigate('engine-room')}
          />
          {i < MOCK_LOCAL_SERVICES.length - 1 && <FiberDivider color={a} dim />}
        </div>
      ))}
    </div>
  );
}
