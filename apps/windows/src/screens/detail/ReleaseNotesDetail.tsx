import { useTheme } from '../../theme/useTheme';
import { FiberDivider } from '../../components/FiberDivider';
import { DetailHeader } from '../../components/detail/DetailHeader';
import { StatusPill } from '../../components/detail/StatusPill';
import { ActionFooter } from '../../components/detail/ActionFooter';

type NoteKind = 'new' | 'fix' | 'perf';

const RELEASES = [
  {
    service: 'Signal-Bridge', from: 'v2.3.1', to: 'v2.4.0', size: '14.2 MB',
    notes: [
      { kind: 'fix'  as NoteKind, text: 'Fiber link auto-reconnect on slow handshake' },
      { kind: 'new'  as NoteKind, text: 'Multi-route auth token refresh' },
      { kind: 'perf' as NoteKind, text: 'Reduced idle CPU by 38%' },
    ],
  },
  {
    service: 'Sunfish', from: 'v1.8.4', to: 'v1.9.0', size: '28.7 MB',
    notes: [
      { kind: 'new'  as NoteKind, text: 'Parallel ingest streams (up to 4)' },
      { kind: 'fix'  as NoteKind, text: 'Indexer race condition on shutdown' },
      { kind: 'fix'  as NoteKind, text: 'Dedupe correctness for nested archives' },
    ],
  },
  {
    service: 'Tender', from: 'v7.0.2', to: 'v7.1.0', size: '6.1 MB',
    notes: [
      { kind: 'new'  as NoteKind, text: 'Engine Room console + fiber-optic traces' },
      { kind: 'new'  as NoteKind, text: 'Workspace dropdown (Local/SSH/CodeCanvas)' },
      { kind: 'perf' as NoteKind, text: 'Tray render time halved' },
    ],
  },
];

interface Props { onBack: () => void }

export function ReleaseNotesDetail({ onBack }: Props) {
  const { theme: t } = useTheme();
  const m = t.metalBright;
  const a = t.accent;

  const kindColor = (k: NoteKind) =>
    k === 'new' ? a : k === 'fix' ? t.accentBright : m;

  return (
    <div>
      <DetailHeader
        title="Release Notes"
        sub="3 updates · 49 MB total"
        badge={<StatusPill text="↑ 3" tone={m} />}
        onBack={onBack}
      />
      <FiberDivider color={m} />

      {RELEASES.map((r, i) => (
        <div key={r.service} style={{
          padding: '10px 14px',
          borderBottom: i < RELEASES.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          {/* Service row */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: t.text, letterSpacing: 0.1 }}>{r.service}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: t.textDim, letterSpacing: 0.5 }}>
              {r.from} <span style={{ color: m }}>→</span> <span style={{ color: t.accentBright }}>{r.to}</span> · {r.size}
            </span>
          </div>
          {/* Notes */}
          {r.notes.map((n, j) => {
            const c = kindColor(n.kind);
            return (
              <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '3px 0' }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 7.5,
                  color: c, background: `${c}1a`,
                  border: `1px solid ${c}55`,
                  borderRadius: 2, padding: '1px 4px',
                  letterSpacing: 0.8, textTransform: 'uppercase',
                  flexShrink: 0, marginTop: 1, minWidth: 28, textAlign: 'center',
                }}>{n.kind}</span>
                <span style={{ fontSize: 10.5, color: t.text, lineHeight: 1.35 }}>{n.text}</span>
              </div>
            );
          })}
        </div>
      ))}

      <ActionFooter primary="Install All (49 MB)" secondary="Defer" />
    </div>
  );
}
