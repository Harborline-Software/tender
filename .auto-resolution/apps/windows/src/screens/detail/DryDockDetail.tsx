import { useTheme } from '../../theme/useTheme';

interface Props { onBack: () => void }

export function DryDockDetail({ onBack }: Props) {
  const { theme: t } = useTheme();

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: t.textDim, fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", padding: 0, alignSelf: 'flex-start' }}>
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M7 1.5 L3.5 5 L7 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Cancel
      </button>

      <div style={{ fontSize: 13, fontWeight: 600, color: t.danger }}>Dry Dock — Graceful Shutdown</div>
      <div style={{ fontSize: 11, color: t.textDim, lineHeight: 1.5 }}>
        This will stop all running Harborline services and close Tender.<br />
        Logs and state are preserved.
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onBack} style={{ flex: 1, padding: '8px 0', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 11, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
          Cancel
        </button>
        <button
          style={{ flex: 1, padding: '8px 0', background: `${t.danger}22`, border: `1px solid ${t.danger}88`, borderRadius: 4, color: t.danger, fontSize: 11, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", boxShadow: `0 0 8px ${t.danger}33, inset 0 0 6px ${t.danger}1a` }}
          onClick={() => { /* M4: invoke graceful_shutdown */ }}
        >
          Shut down
        </button>
      </div>
    </div>
  );
}
