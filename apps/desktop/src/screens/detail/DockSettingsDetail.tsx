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
import {
  getFleetDashboardLink,
  getSettings,
  setFleetDashboardUrl,
  setMode,
} from '@/ipc/tauri'
import type { FleetDashboardLink, Mode } from '@/ipc/tauri'

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
  const [dashboardUrl, setDashboardUrl] = useState('')
  const [savedDashboardUrl, setSavedDashboardUrl] = useState<string | null>(null)
  const [dashboardLink, setDashboardLink] = useState<FleetDashboardLink | null>(null)
  const [dashboardSaving, setDashboardSaving] = useState(false)
  const [dashboardFocused, setDashboardFocused] = useState(false)
  const [dashboardNotice, setDashboardNotice] = useState<string | null>(null)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getSettings(), getFleetDashboardLink()])
      .then(([settings, link]) => {
        setModeState(settings.mode)
        setDashboardUrl(settings.fleetDashboardUrl ?? '')
        setSavedDashboardUrl(settings.fleetDashboardUrl)
        setDashboardLink(link)
      })
      .catch(() => setDashboardError('Could not read Tender settings.'))
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

  const dashboardDirty = dashboardUrl.trim() !== (savedDashboardUrl ?? '')

  const handleDashboardSave = async () => {
    if (dashboardSaving || !dashboardDirty) return
    setDashboardSaving(true)
    setDashboardNotice(null)
    setDashboardError(null)
    try {
      const updated = await setFleetDashboardUrl(dashboardUrl.trim() || null)
      const saved = updated.fleetDashboardUrl
      setDashboardUrl(saved ?? '')
      setSavedDashboardUrl(saved)
      setDashboardLink(await getFleetDashboardLink())
      setDashboardNotice(saved ? 'Fleet Dashboard URL saved.' : 'Saved dashboard URL cleared.')
    } catch (reason) {
      setDashboardError(typeof reason === 'string' ? reason : 'Could not save Fleet Dashboard URL.')
    } finally {
      setDashboardSaving(false)
    }
  }

  return (
    <MenuShell>
      <DetailHeader
        title="Dock Settings"
        sub="Appearance · behavior · connections"
        onBack={onBack}
        badge={
          <StatusPill
            text={dashboardSaving ? 'Saving' : dashboardDirty ? 'Unsaved' : 'Saved'}
            tone={dashboardDirty ? theme.warn : undefined}
          />
        }
      />

      {/* ↳ MODE — dev / end-user toggle */}
      <div style={{
        padding: '8px 14px 4px',
        fontFamily: theme.fontMono,
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
            fontFamily: theme.fontMono,
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
                  fontFamily: theme.fontMono,
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

      <FiberDivider dim />

      <div style={{
        padding: '8px 14px 4px',
        fontFamily: theme.fontMono,
        fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase',
        color: theme.textMuted,
      }}>
        ↳ Connections
      </div>

      <div style={{ padding: '7px 14px 11px' }}>
        <label
          htmlFor="fleet-dashboard-url"
          style={{ display: 'block', fontSize: 11.5, color: theme.text }}
        >
          Fleet Dashboard URL
        </label>
        <div id="fleet-dashboard-help" style={{
          marginTop: 3,
          fontFamily: theme.fontRow,
          fontSize: theme.sizeBody,
          color: theme.textDim,
          lineHeight: 1.4,
        }}>
          Saved settings take priority over the session environment.
        </div>
        <input
          id="fleet-dashboard-url"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={dashboardUrl}
          placeholder="http://dashboard-host:8880/fleet/"
          aria-describedby="fleet-dashboard-help fleet-dashboard-effective"
          onChange={(event) => {
            setDashboardUrl(event.target.value)
            setDashboardNotice(null)
            setDashboardError(null)
          }}
          onFocus={() => setDashboardFocused(true)}
          onBlur={() => setDashboardFocused(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleDashboardSave()
          }}
          style={{
            boxSizing: 'border-box',
            width: '100%',
            minHeight: 32,
            marginTop: 8,
            padding: '6px 8px',
            borderRadius: 4,
            border: `1px solid ${dashboardFocused ? theme.accentBright : theme.border}`,
            outline: dashboardFocused ? `2px solid ${theme.accent}33` : 'none',
            outlineOffset: 1,
            background: theme.bgSoft,
            color: theme.text,
            fontFamily: theme.fontMono,
            fontSize: theme.sizeBody,
          }}
        />
        <div id="fleet-dashboard-effective" style={{
          marginTop: 6,
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel,
          color: theme.textMuted,
          lineHeight: 1.45,
          overflowWrap: 'anywhere',
        }}>
          {dashboardLink?.configured
            ? `Effective: ${dashboardLink.url}`
            : dashboardLink?.detail ?? 'Reading current connection…'}
        </div>
        {(dashboardNotice || dashboardError) && (
          <div
            role={dashboardError ? 'alert' : 'status'}
            aria-live="polite"
            style={{
              marginTop: 6,
              color: dashboardError ? theme.danger : theme.healthy,
              fontFamily: theme.fontRow,
              fontSize: theme.sizeBody,
            }}
          >
            {dashboardError ?? dashboardNotice}
          </div>
        )}
        <button
          type="button"
          disabled={dashboardSaving || !dashboardDirty}
          onClick={handleDashboardSave}
          style={{
            minHeight: 30,
            marginTop: 8,
            padding: '5px 10px',
            borderRadius: 4,
            border: `1px solid ${dashboardSaving || !dashboardDirty ? theme.border : `${theme.accentBright}66`}`,
            background: dashboardSaving || !dashboardDirty ? theme.bgSoft : `${theme.accentBright}14`,
            color: dashboardSaving || !dashboardDirty ? theme.textMuted : theme.accentBright,
            fontFamily: theme.fontRow,
            fontSize: theme.sizeBody,
            cursor: dashboardSaving || !dashboardDirty ? 'not-allowed' : 'pointer',
          }}
        >
          {dashboardSaving ? 'Saving…' : 'Save URL'}
        </button>
      </div>

      <div style={{
        padding: '8px 14px 4px',
        fontFamily: theme.fontMono,
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
