/**
 * DockSettingsDetail — Appearance & behavior settings.
 *
 * R8: toggle state is persisted via localStorage so settings survive
 * panel opens / app restarts without a full IPC round-trip.
 * Key: `tender:dock-settings-toggles` (JSON array of booleans, index-stable).
 */
import { useState, useEffect } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { FiberDivider } from '@/components/FiberDivider'
import { ActionFooter } from '@/components/ActionFooter'
import { DataLine } from '@/components/DataLine'
import { ToggleSwitch } from '@/components/ToggleSwitch'
import { getSettings, setMode } from '@/ipc/tauri'
import type { Mode } from '@/ipc/tauri'

// ── Constants ─────────────────────────────────────────────────────────────────

const TOGGLE_LABELS = [
  'Start at login',
  'Notifications · sound',
  'Notifications · banner',
  'Pulse animations',
  'Telemetry to Harborline',
]

/** Default on/off for each toggle (index-matched with TOGGLE_LABELS). */
const DEFAULT_STATES = [true, true, false, true, false]

/** localStorage key for persisted toggle state. */
const LS_KEY = 'tender:dock-settings-toggles'

// ── Persistence helpers ───────────────────────────────────────────────────────

function loadToggles(): { label: string; on: boolean }[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const saved: unknown = JSON.parse(raw)
      if (
        Array.isArray(saved) &&
        saved.length === TOGGLE_LABELS.length &&
        saved.every((v) => typeof v === 'boolean')
      ) {
        return TOGGLE_LABELS.map((label, i) => ({ label, on: saved[i] as boolean }))
      }
    }
  } catch {
    // Ignore parse errors — fall through to defaults.
  }
  return TOGGLE_LABELS.map((label, i) => ({ label, on: DEFAULT_STATES[i] }))
}

function saveToggles(toggles: { label: string; on: boolean }[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(toggles.map((t) => t.on)))
  } catch {
    // Best-effort; ignore storage errors (private/incognito mode, quota, etc.).
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void
}

export function DockSettingsDetail({ onBack }: Props) {
  const { theme } = useTheme()

  // Lazy initial state from localStorage (falls back to defaults if absent/invalid).
  const [toggles, setToggles] = useState(loadToggles)
  const [mode, setModeState] = useState<Mode>('dev')
  const [modeChanging, setModeChanging] = useState(false)

  useEffect(() => {
    getSettings().then(s => setModeState(s.mode)).catch(() => {})
  }, [])

  const handleModeToggle = async (newMode: Mode) => {
    if (modeChanging || newMode === mode) return
    setModeChanging(true)
    try {
      const updated = await setMode(newMode)
      setModeState(updated.mode)
    } catch {
      // Fail silently — mode stays unchanged; next poll in Panel will reconcile
    } finally {
      setModeChanging(false)
    }
  }

  const flip = (i: number) => {
    setToggles((t) => {
      const next = t.map((x, j) => (j === i ? { ...x, on: !x.on } : x))
      saveToggles(next)
      return next
    })
  }

  const handleReset = () => {
    const defaults = TOGGLE_LABELS.map((label, i) => ({ label, on: DEFAULT_STATES[i] }))
    saveToggles(defaults)
    setToggles(defaults)
  }

  return (
    <MenuShell>
      <DetailHeader
        title="Dock Settings"
        sub="6 routes wired · MK VII"
        onBack={onBack}
        badge={<StatusPill text="Saved" />}
      />

      {/* ↳ MODE — dev / end-user toggle */}
      <div style={{
        padding: '8px 14px 4px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase',
        color: theme.textMuted,
      }}>
        ↳ Mode
      </div>

      <div style={{
        padding: '8px 14px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div>
          <span style={{ fontSize: 11.5, color: theme.text }}>Dev / End-User</span>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, color: theme.textMuted, marginTop: 3, lineHeight: 1.4,
          }}>
            Dev installs packaged builds + shows caveats.
          </div>
        </div>
        {/* Segmented control: Dev | End-User */}
        <div style={{
          display: 'flex',
          border: `1px solid ${theme.border}`,
          borderRadius: 4,
          overflow: 'hidden',
          opacity: modeChanging ? 0.55 : 1,
          transition: 'opacity 0.15s',
          flexShrink: 0,
        }}>
          {(['dev', 'end-user'] as const).map((m, i) => {
            const active = mode === m
            return (
              <button
                key={m}
                onClick={() => handleModeToggle(m)}
                disabled={modeChanging}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 1.1,
                  textTransform: 'uppercase',
                  padding: '4px 9px',
                  border: 'none',
                  borderLeft: i > 0 ? `1px solid ${theme.border}` : 'none',
                  background: active ? `${theme.accent}22` : 'transparent',
                  color: active ? theme.accent : theme.textMuted,
                  cursor: modeChanging ? 'default' : 'pointer',
                  transition: 'background 0.12s, color 0.12s',
                }}
              >
                {m === 'dev' ? 'Dev' : 'End-User'}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{
        padding: '8px 14px 4px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase',
        color: theme.textMuted,
      }}>
        ↳ Wiring
      </div>

      {toggles.map((t, i) => (
        <div key={t.label} style={{
          padding: '8px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          borderBottom: i < toggles.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <span style={{ flex: 1, fontSize: 11.5, color: theme.text }}>{t.label}</span>
          <ToggleSwitch on={t.on} onClick={() => flip(i)} />
        </div>
      ))}

      <FiberDivider dim />

      <DataLine label="theme"       value="Engine Room · dark" />
      <DataLine label="route count" value="6" />

      <ActionFooter primary="Edit Routes" secondary="Reset" onSecondary={handleReset} />
    </MenuShell>
  )
}
