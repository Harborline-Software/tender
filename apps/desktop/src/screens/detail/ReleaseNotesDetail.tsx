import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { ActionFooter } from '@/components/ActionFooter'

type NoteKind = 'new' | 'fix' | 'perf'

const RELEASES = [
  {
    service: 'Signal-Bridge',
    from: 'v2.3.1', to: 'v2.4.0', size: '14.2 MB',
    notes: [
      { kind: 'fix'  as NoteKind, text: 'Fiber link auto-reconnect on slow handshake' },
      { kind: 'new'  as NoteKind, text: 'Multi-route auth token refresh' },
      { kind: 'perf' as NoteKind, text: 'Reduced idle CPU by 38%' },
    ],
  },
  {
    service: 'Sunfish',
    from: 'v1.8.4', to: 'v1.9.0', size: '28.7 MB',
    notes: [
      { kind: 'new'  as NoteKind, text: 'Parallel ingest streams (up to 4)' },
      { kind: 'fix'  as NoteKind, text: 'Indexer race condition on shutdown' },
      { kind: 'fix'  as NoteKind, text: 'Dedupe correctness for nested archives' },
    ],
  },
  {
    service: 'Harborline Toolbox',
    from: 'v7.0.2', to: 'v7.1.0', size: '6.1 MB',
    notes: [
      { kind: 'new'  as NoteKind, text: 'Engine Room console + fiber-optic traces' },
      { kind: 'new'  as NoteKind, text: 'Workspace dropdown (Local/SSH)' },
      { kind: 'perf' as NoteKind, text: 'Tray render time halved' },
    ],
  },
]

interface Props {
  onBack: () => void
}

export function ReleaseNotesDetail({ onBack }: Props) {
  const { theme } = useTheme()
  const m = theme.metalBright
  const a = theme.accent

  const kindColor = (k: NoteKind) => k === 'new' ? a : k === 'fix' ? theme.accentBright : m

  return (
    <MenuShell>
      <DetailHeader
        title="Release Notes"
        sub="3 updates · 49 MB total"
        onBack={onBack}
        badge={<StatusPill text="↑ 3" tone={m} />}
      />

      {RELEASES.map((r, i) => (
        <div key={r.service} style={{
          padding: '10px 14px',
          borderBottom: i < RELEASES.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 12, color: theme.text, letterSpacing: 0.1 }}>{r.service}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: theme.textDim, letterSpacing: 0.5 }}>
              {r.from} <span style={{ color: m }}>→</span> <span style={{ color: theme.accentBright }}>{r.to}</span> · {r.size}
            </div>
          </div>
          {r.notes.map((n, j) => (
            <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '3px 0' }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 7.5,
                color: kindColor(n.kind),
                background: `${kindColor(n.kind)}1a`,
                border: `1px solid ${kindColor(n.kind)}55`,
                borderRadius: 2, padding: '1px 4px',
                letterSpacing: 0.8, textTransform: 'uppercase',
                flexShrink: 0, marginTop: 1,
                minWidth: 28, textAlign: 'center',
              }}>{n.kind}</span>
              <span style={{ fontSize: 10.5, color: theme.text, lineHeight: 1.35 }}>{n.text}</span>
            </div>
          ))}
        </div>
      ))}

      <ActionFooter primary="Install All (49 MB)" secondary="Defer" />
    </MenuShell>
  )
}
