import { useTheme } from '../../theme/useTheme';
import { FiberDivider } from '../../components/FiberDivider';
import { DetailHeader } from '../../components/detail/DetailHeader';
import { StatusPill } from '../../components/detail/StatusPill';
import { ActionFooter } from '../../components/detail/ActionFooter';

const TASKS = [
  { name: 'sunfish.crawler/12',   status: 'running', pct: 78 },
  { name: 'sunfish.indexer/03',   status: 'running', pct: 42 },
  { name: 'sunfish.ingest/north', status: 'running', pct: 61 },
  { name: 'sunfish.reducer/main', status: 'running', pct: 24 },
  { name: 'sunfish.dedupe/aux',   status: 'queued',  pct: 0  },
];

interface Props { onBack: () => void }

export function SunfishDetail({ onBack }: Props) {
  const { theme: t } = useTheme();
  const a = t.accent;

  return (
    <div>
      <DetailHeader
        title="Sunfish Operations"
        sub="7 active · 12 queued"
        badge={<StatusPill text="Running" />}
        onBack={onBack}
      />
      <FiberDivider color={a} />

      {/* Summary metrics row */}
      <div style={{ padding: '10px 14px 6px', display: 'flex', gap: 16 }}>
        {[
          { label: 'tasks/min', value: '↑ 38', tone: t.accentBright, glow: a },
          { label: 'errors',    value: '0',    tone: t.text,          glow: undefined },
          { label: 'queue',     value: '12',   tone: t.text,          glow: undefined },
        ].map(m => (
          <div key={m.label}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, color: t.textMuted, textTransform: 'uppercase' }}>{m.label}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, color: m.tone, lineHeight: 1.1, textShadow: m.glow ? `0 0 6px ${m.glow}88` : 'none' }}>{m.value}</div>
          </div>
        ))}
      </div>

      <FiberDivider color={a} dim />

      {/* Task list */}
      {TASKS.map((task, i) => (
        <div key={task.name} style={{
          padding: '7px 14px',
          borderBottom: i < TASKS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: t.text, letterSpacing: 0.3 }}>{task.name}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase', color: task.status === 'queued' ? t.textMuted : a }}>{task.status}</span>
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${task.pct}%`, background: `linear-gradient(90deg, ${a}88, ${a})`, boxShadow: `0 0 4px ${a}aa` }} />
          </div>
        </div>
      ))}

      <ActionFooter primary="Open Workspace" secondary="Pause All" />
    </div>
  );
}
