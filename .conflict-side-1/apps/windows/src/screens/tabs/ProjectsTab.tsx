import { useTheme } from '../../theme/useTheme';
import { ConsoleRow } from '../../components/ConsoleRow';
import { FiberDivider } from '../../components/FiberDivider';
import { MOCK_PROJECTS } from '../../mocks';

export function ProjectsTab() {
  const { theme: t } = useTheme();
  const a = t.accent;
  const active = MOCK_PROJECTS.filter(p => p.status === 'active').length;

  return (
    <div>
      <div style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: t.textMuted }}>↳ {MOCK_PROJECTS.length} projects · {active} active</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: a, letterSpacing: 0.6, cursor: 'pointer' }}>+ new</span>
      </div>

      {MOCK_PROJECTS.map((p, i) => (
        <div key={p.name}>
          <ConsoleRow
            indicator="grid"
            name={p.name}
            subLabel={p.path}
            meter={p.status.toUpperCase()}
            active={p.status === 'active'}
          />
          {i < MOCK_PROJECTS.length - 1 && <FiberDivider color={a} dim />}
        </div>
      ))}
    </div>
  );
}
