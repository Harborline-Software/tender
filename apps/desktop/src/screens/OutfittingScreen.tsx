/**
 * OutfittingScreen — light first-run setup (CFG-3b).
 *
 * Shown once on a fresh box: no managed apps in install-config AND not yet
 * dismissed this session. Probes hardware via recommendProfile(), renders
 * the probe basis, the recommended profile, and opt-up/down buttons.
 * Continue dismisses to Fleet.
 *
 * Spec: INSTALL-COORDINATE-UX.md §4.2.
 * Voice: competent, terse, nautical-industrial. No emoji.
 */
import { useState, useEffect } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { FiberDivider } from '@/components/FiberDivider'
import { ActionFooter } from '@/components/ActionFooter'
import { recommendProfile } from '@/ipc/tauri'
import type { ProfileRecommendation, ProfileName, CapabilityProfile } from '@/state/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PROFILE_ORDER: ProfileName[] = ['minimum', 'standard', 'capable', 'max']
const PROFILE_LABELS: Record<ProfileName, string> = {
  minimum: 'Minimum',
  standard: 'Standard',
  capable: 'Capable',
  max: 'Max',
}

function fmtBytes(bytes: number, unit: 'GB' | 'MB' = 'GB'): string {
  const divisor = unit === 'GB' ? 1073741824 : 1048576
  return `${Math.round(bytes / divisor)} ${unit}`
}

function archLabel(arch: string): string {
  if (arch === 'arm64') return 'ARM64'
  if (arch === 'x64') return 'x64'
  return arch
}

function osLabel(os: string): string {
  if (os === 'macos') return 'macOS'
  if (os === 'windows') return 'Windows'
  if (os === 'linux') return 'Linux'
  return os
}

function largestFreeDisk(vols: { freeBytes: number; totalBytes: number }[]): number {
  return vols.reduce((max, v) => Math.max(max, v.freeBytes), 0)
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  /** Called when the operator clicks Continue — passes the selected profile. */
  onContinue: (selected: CapabilityProfile) => void
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; rec: ProfileRecommendation; selected: ProfileName }
  | { kind: 'error'; message: string }

export function OutfittingScreen({ onContinue }: Props) {
  const { theme } = useTheme()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    recommendProfile()
      .then(rec => {
        setState({ kind: 'loaded', rec, selected: rec.recommended.name })
      })
      .catch((err: unknown) => {
        setState({
          kind: 'error',
          message: `Hardware probe failed. Check system access. (${String(err)})`,
        })
      })
  }, [])

  const mono = theme.fontMono
  const accent = theme.accent

  // Build the selected CapabilityProfile from the recommendation — the
  // recommended profile carries the per-axis selections; for opt-up/down
  // we carry the same axes (Commission will re-probe and confirm at install
  // time). The name is the only thing the operator is choosing here.
  function buildProfile(name: ProfileName, rec: ProfileRecommendation): CapabilityProfile {
    return {
      ...rec.recommended,
      name,
      userOverridden: name !== rec.recommended.name,
    }
  }

  // Pill color: cyan for probed, accent-dim for loading, danger for error
  const pillColor = state.kind === 'error' ? theme.danger
    : state.kind === 'loading' ? theme.textMuted
    : accent
  const pillText = state.kind === 'loading' ? 'Probing'
    : state.kind === 'error' ? 'Error'
    : 'Probed · MK VII'

  return (
    <MenuShell>
      {/* Custom header — no back button; Outfitting is a first-run gate */}
      <div style={{
        padding: '11px 14px',
        display: 'flex', alignItems: 'center', gap: 9,
        background: `linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
        borderBottom: '1px solid rgba(0,0,0,0.28)',
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1, letterSpacing: 0.2, color: theme.text }}>
            Outfitting
          </div>
          <div style={{
            fontFamily: mono,
            fontSize: 8.5, letterSpacing: 1.4, color: theme.textMuted,
            marginTop: 4, textTransform: 'uppercase',
          }}>
            Commission your tools
          </div>
        </div>
        {/* Status pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '2px 7px', borderRadius: 99,
          background: `${pillColor}1a`,
          border: `1px solid ${pillColor}55`,
          fontFamily: mono, fontSize: theme.sizeLabel,
          letterSpacing: 0.8, color: pillColor, textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: 99, background: pillColor, boxShadow: `0 0 4px ${pillColor}`, display: 'inline-block' }} />
          {pillText}
        </div>
      </div>
      <FiberDivider />

      {state.kind === 'loading' && (
        <div style={{
          padding: '28px 14px',
          textAlign: 'center',
          fontFamily: mono,
          fontSize: theme.sizeLabel,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: theme.textMuted,
        }}>
          Reading hardware signals…
        </div>
      )}

      {state.kind === 'error' && (
        <div style={{
          padding: '16px 14px',
          fontFamily: mono,
          fontSize: theme.sizeLabel,
          letterSpacing: 0.8,
          color: theme.danger,
        }}>
          {state.message}
        </div>
      )}

      {state.kind === 'loaded' && (() => {
        const { rec, selected } = state
        const { probe } = rec
        const hw = probe.profile
        const freeDisk = largestFreeDisk(hw.diskVolumes)
        const incompleteProbe = !probe.keyingComplete

        return (
          <>
            {/* Probe summary */}
            <div style={{ padding: '10px 14px 4px' }}>
              <div style={{
                fontFamily: mono,
                fontSize: theme.sizeLabel,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: theme.textMuted,
                marginBottom: 6,
              }}>
                This machine
              </div>

              <div style={{
                fontFamily: mono,
                fontSize: theme.sizeMetric,
                color: theme.text,
                letterSpacing: 0.4,
                lineHeight: 1.6,
              }}>
                {fmtBytes(hw.totalRamBytes)} · {hw.physicalCores > 0 ? `${hw.physicalCores} cores` : '— cores'} · {freeDisk > 0 ? fmtBytes(freeDisk) + ' free' : '— free'} · {archLabel(hw.architecture)}
              </div>

              <div style={{
                fontFamily: mono,
                fontSize: theme.sizeLabel,
                color: theme.textDim,
                letterSpacing: 0.3,
                marginTop: 3,
              }}>
                {osLabel(hw.osFamily)}
                {hw.hasDiscreteGpu ? ' · GPU' : ''}
              </div>
            </div>

            <FiberDivider dim />

            {/* Probe-incomplete warning */}
            {incompleteProbe && (
              <div style={{
                padding: '8px 14px',
                fontFamily: mono,
                fontSize: theme.sizeLabel,
                color: theme.warn,
                letterSpacing: 0.6,
                borderBottom: `1px solid ${theme.border}`,
              }}>
                Couldn't read all signals — recommending the safe minimum.
              </div>
            )}

            {/* Recommended profile */}
            <div style={{ padding: '8px 14px 4px' }}>
              <div style={{
                fontFamily: mono,
                fontSize: theme.sizeLabel,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: theme.textMuted,
                marginBottom: 5,
              }}>
                Recommended
              </div>
              <div style={{
                fontFamily: mono,
                fontSize: theme.sizeRowTitle,
                color: accent,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}>
                {PROFILE_LABELS[rec.recommended.name]}
              </div>
              {rec.recommended.axes['persistence'] && (
                <div style={{
                  fontFamily: mono,
                  fontSize: theme.sizeLabel,
                  color: theme.textMuted,
                  letterSpacing: 0.4,
                  marginTop: 3,
                }}>
                  persistence: {rec.recommended.axes['persistence']}
                </div>
              )}
            </div>

            <FiberDivider dim />

            {/* Profile selector */}
            <div style={{ padding: '8px 14px 4px' }}>
              <div style={{
                fontFamily: mono,
                fontSize: theme.sizeLabel,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: theme.textMuted,
                marginBottom: 8,
              }}>
                Select profile
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {PROFILE_ORDER.map(name => {
                  const isSelected = selected === name
                  const isRecommended = name === rec.recommended.name
                  return (
                    <button
                      key={name}
                      onClick={() => setState({ ...state, selected: name })}
                      style={{
                        fontFamily: mono,
                        fontSize: theme.sizeLabel,
                        letterSpacing: 1.1,
                        textTransform: 'uppercase',
                        padding: '4px 10px',
                        borderRadius: 3,
                        border: `1px solid ${isSelected ? accent + '88' : theme.border}`,
                        background: isSelected ? `${accent}22` : 'transparent',
                        color: isSelected ? accent : theme.textDim,
                        cursor: 'pointer',
                        transition: 'background 0.1s, color 0.1s, border-color 0.1s',
                        boxShadow: isSelected ? `0 0 6px ${accent}33` : 'none',
                      }}
                    >
                      {PROFILE_LABELS[name]}
                      {isRecommended && !isSelected && (
                        <span style={{ color: theme.textMuted, marginLeft: 4 }}>·</span>
                      )}
                    </button>
                  )
                })}
              </div>
              {selected !== rec.recommended.name && (
                <div style={{
                  fontFamily: mono,
                  fontSize: theme.sizeLabel,
                  color: theme.textMuted,
                  letterSpacing: 0.4,
                  marginTop: 6,
                }}>
                  Overrides recommendation ({PROFILE_LABELS[rec.recommended.name]}).
                </div>
              )}
            </div>

            <FiberDivider dim />

            <div style={{
              padding: '8px 14px',
              fontFamily: mono,
              fontSize: theme.sizeLabel,
              color: theme.textMuted,
              letterSpacing: 0.4,
              lineHeight: 1.5,
            }}>
              Next — commission your tools.
            </div>

            <ActionFooter
              primary={`Continue →`}
              onPrimary={() => onContinue(buildProfile(selected, rec))}
            />
          </>
        )
      })()}
    </MenuShell>
  )
}
