import { useTheme } from '../theme/useTheme';

export type TabId = 'fleet' | 'projects' | 'services';

const TABS: { id: TabId; label: string }[] = [
  { id: 'fleet',    label: 'Fleet'    },
  { id: 'projects', label: 'Projects' },
  { id: 'services', label: 'Services' },
];

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
}

export function TabStrip({ active, onChange }: Props) {
  const { theme: t } = useTheme();
  const a = t.accent;

  return (
    <div style={{ display: 'flex', background: t.bg }}>
      {TABS.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              padding: '10px 0',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              color: isActive ? t.text : t.textDim,
              fontSize: 11.5,
              letterSpacing: 0.3,
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: isActive ? 600 : 500,
              transition: 'color 0.12s',
            }}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = t.text; }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = t.textDim; }}
          >
            {tab.label}
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  bottom: -1,
                  left: '22%',
                  right: '22%',
                  height: 2,
                  background: a,
                  boxShadow: `0 0 6px ${a}, 0 0 10px ${a}88`,
                  borderRadius: 99,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
