// Shared stub used by all detail screens until M2 implements them fully.
import { useTheme } from '../../theme/useTheme';

interface Props {
  title: string;
  onBack: () => void;
}

export function DetailStub({ title, onBack }: Props) {
  const { theme: t } = useTheme();
  const a = t.accent;

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: t.textDim, fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", padding: 0, alignSelf: 'flex-start' }}
        onMouseEnter={e => (e.currentTarget.style.color = t.text)}
        onMouseLeave={e => (e.currentTarget.style.color = t.textDim)}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M7 1.5 L3.5 5 L7 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, letterSpacing: 0.1 }}>{title}</div>

      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: t.textMuted }}>
        Detail view — milestone 2
      </div>

      <div style={{ height: 1, background: `${a}22` }} />

      <div style={{ fontSize: 11, color: t.textDim, lineHeight: 1.5 }}>
        This screen is scaffolded. Live data wiring is planned for Milestone 2 once the telemetry IPC contract is finalized (Admiral UPF pending).
      </div>
    </div>
  );
}
