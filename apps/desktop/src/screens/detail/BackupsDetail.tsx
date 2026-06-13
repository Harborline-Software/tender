/**
 * BackupsDetail — R8 operator-companion backup surface.
 *
 * Self-hosted operators MUST be able to back up + restore their own data.
 * The no-operator-backdoor model (ADR 0031) means device/key loss = data
 * loss without an operator-owned backup. This surface makes the backup
 * story tangible and accessible.
 *
 * Scope of a backup:
 *   - Sunfish desktop SQLite (local-authoritative store; includes crdt_doc
 *     columns from the sync-inversion pilot)
 *   - Stronghold vault (wrapped DEK + auth token — ENCRYPTED, never
 *     plaintext; useless without the OS keychain master key)
 *
 * Key-loss warning (displayed prominently): restoring a backup from a
 * DIFFERENT device requires the original Keychain entry that holds the
 * Stronghold master key. Without that key, the restored vault cannot be
 * decrypted. "Key-loss = data loss" is the honest v1 reality.
 *
 * Path-A a11y rules apply: semantic tokens, WCAG-AA multimodal status,
 * empty/loading/error states per BundlesDetail pattern.
 */
import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { FiberDivider } from '@/components/FiberDivider'
import { DataLine } from '@/components/DataLine'
import { ActionFooter } from '@/components/ActionFooter'
import { MeterBar } from '@/components/MeterBar'
import { listBackups, runBackup, restoreBackupFromArchive } from '@/ipc/tauri'
import type { BackupEntry } from '@/state/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void
}

type Phase = 'idle' | 'running' | 'confirm-restore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

function relativeTime(isoTs: string): string {
  const ms = Date.now() - new Date(isoTs).getTime()
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/** Derive status pill color + label from the most recent backup entry. */
function backupStatus(entries: BackupEntry[]): { label: string; tone?: string } {
  if (entries.length === 0) return { label: 'No backups' }
  const latest = entries[0]
  const ageMs = Date.now() - new Date(latest.createdAt).getTime()
  const ageDays = ageMs / 86_400_000

  if (!latest.complete) return { label: 'Incomplete', tone: undefined }
  if (ageDays > 7) return { label: `Stale (${Math.floor(ageDays)}d)`, tone: 'warn' }
  return { label: 'Current' }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KeyLossWarning() {
  const { theme } = useTheme()
  return (
    <div style={{
      margin: '0 14px 10px',
      background: `${theme.warn}15`,
      border: `1px solid ${theme.warn}44`,
      borderRadius: 5,
      padding: '8px 10px',
    }}>
      <div style={{
        fontFamily: theme.fontMono,
        fontSize: theme.sizeLabel,
        letterSpacing: 1.2,
        color: theme.warn,
        textTransform: 'uppercase',
        marginBottom: 4,
      }}>
        Key-loss notice
      </div>
      <p style={{
        margin: 0,
        fontFamily: theme.fontRow,
        fontSize: theme.sizeBody,
        color: theme.textDim,
        lineHeight: 1.55,
      }}>
        Backups include the encrypted vault (your wrapped DEK). Restoring on a
        <em> different device</em> requires the macOS Keychain entry from the
        original device. Without it the vault cannot be decrypted.{' '}
        <strong style={{ color: theme.text }}>Key-loss = data-loss.</strong>
      </p>
    </div>
  )
}

function BackupRow({
  entry,
  isLatest,
  onRestore,
}: {
  entry: BackupEntry
  isLatest: boolean
  onRestore: (entry: BackupEntry) => void
}) {
  const { theme } = useTheme()
  const a = theme.accent
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        padding: '7px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: `1px solid ${theme.border}`,
        background: hovered ? `${a}0d` : 'transparent',
        transition: 'background 100ms',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Status glyph */}
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: entry.complete ? theme.healthy : theme.warn,
          boxShadow: entry.complete ? `0 0 4px ${theme.healthy}` : 'none',
          flexShrink: 0,
        }}
      />

      {/* Timestamp + scope */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: theme.sizeRowTitle,
          color: theme.text,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}>
          {relativeTime(entry.createdAt)}
          {isLatest && (
            <span style={{
              fontFamily: theme.fontMono,
              fontSize: theme.sizeLabel,
              color: a,
              background: `${a}22`,
              border: `1px solid ${a}55`,
              borderRadius: 2,
              padding: '1px 4px',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
            }}>
              latest
            </span>
          )}
        </div>
        <div style={{
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel,
          color: theme.textMuted,
          marginTop: 2,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}>
          {entry.scope} · {formatBytes(entry.sizeBytes)}
        </div>
      </div>

      {/* Restore button */}
      <button
        onClick={() => onRestore(entry)}
        title={`Restore from ${relativeTime(entry.createdAt)} backup`}
        style={{
          background: 'transparent',
          border: `1px solid ${theme.border}`,
          borderRadius: 3,
          padding: '3px 8px',
          color: theme.textDim,
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = theme.warn }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = theme.border }}
      >
        Restore
      </button>
    </div>
  )
}

/** Destructive confirm screen shown before restore executes. */
function RestoreConfirm({
  entry,
  onConfirm,
  onCancel,
  restoring,
  restoreResult,
}: {
  entry: BackupEntry
  onConfirm: () => void
  onCancel: () => void
  restoring: boolean
  restoreResult: string | null
}) {
  const { theme } = useTheme()

  if (restoreResult) {
    const isError = restoreResult.startsWith('ERROR:')
    return (
      <div style={{ padding: '14px' }}>
        <div
          role="alert"
          style={{
            background: isError ? `${theme.danger}1a` : `${theme.healthy}1a`,
            border: `1px solid ${isError ? theme.danger : theme.healthy}44`,
            borderRadius: 5,
            padding: '10px 12px',
          }}
        >
          <div style={{
            fontFamily: theme.fontMono,
            fontSize: theme.sizeLabel,
            letterSpacing: 1.2,
            color: isError ? theme.danger : theme.healthy,
            textTransform: 'uppercase',
            marginBottom: 5,
          }}>
            {isError ? 'Restore failed' : 'Restore complete'}
          </div>
          <p style={{
            margin: 0,
            fontFamily: theme.fontRow,
            fontSize: theme.sizeBody,
            color: theme.textDim,
            lineHeight: 1.5,
          }}>
            {isError ? restoreResult.slice(7) : restoreResult}
          </p>
        </div>
        <div style={{ marginTop: 10 }}>
          <button
            onClick={onCancel}
            style={{
              width: '100%',
              padding: '8px',
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: 4,
              color: theme.text,
              fontFamily: theme.fontRow,
              fontSize: theme.sizeBody,
              cursor: 'pointer',
            }}
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px' }}>
      <div
        role="alert"
        style={{
          background: `${theme.danger}1a`,
          border: `1px solid ${theme.danger}44`,
          borderRadius: 5,
          padding: '10px 12px',
          marginBottom: 12,
        }}
      >
        <div style={{
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel,
          letterSpacing: 1.2,
          color: theme.danger,
          textTransform: 'uppercase',
          marginBottom: 5,
        }}>
          Destructive action
        </div>
        <p style={{
          margin: 0,
          fontFamily: theme.fontRow,
          fontSize: theme.sizeBody,
          color: theme.textDim,
          lineHeight: 1.55,
        }}>
          This will overwrite the <strong style={{ color: theme.text }}>live Sunfish
          database and vault</strong> with the snapshot from{' '}
          <strong style={{ color: theme.text }}>{relativeTime(entry.createdAt)}</strong>.
          All changes made since that backup will be lost.
        </p>
      </div>

      <DataLine label="scope"    value={entry.scope} />
      <DataLine label="created"  value={entry.createdAt} />
      <DataLine label="size"     value={formatBytes(entry.sizeBytes)} />

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          disabled={restoring}
          style={{
            flex: 1,
            padding: '8px',
            background: 'transparent',
            border: `1px solid ${theme.border}`,
            borderRadius: 4,
            color: theme.text,
            fontFamily: theme.fontRow,
            fontSize: theme.sizeBody,
            cursor: restoring ? 'not-allowed' : 'pointer',
            opacity: restoring ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={restoring}
          style={{
            flex: 1,
            padding: '8px',
            background: `${theme.danger}22`,
            border: `1px solid ${theme.danger}88`,
            borderRadius: 4,
            color: theme.danger,
            fontFamily: theme.fontRow,
            fontSize: theme.sizeBody,
            fontWeight: 600,
            cursor: restoring ? 'not-allowed' : 'pointer',
            opacity: restoring ? 0.5 : 1,
          }}
        >
          {restoring ? 'Restoring…' : 'Yes, Restore'}
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function BackupsDetail({ onBack }: Props) {
  const { theme } = useTheme()

  const [entries, setEntries] = useState<BackupEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)   // 0–100 during backup run
  const [restoreTarget, setRestoreTarget] = useState<BackupEntry | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreResult, setRestoreResult] = useState<string | null>(null)

  const loadBackups = useCallback(() => {
    setLoading(true)
    setError(null)
    listBackups()
      .then((es) => {
        setEntries(es)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(typeof err === 'string' ? err : 'Failed to load backup list')
        setLoading(false)
      })
  }, [])

  useEffect(() => { loadBackups() }, [loadBackups])

  const handleBackUpNow = useCallback(() => {
    setPhase('running')
    setProgress(10)

    // Simulate progress (the Rust command is synchronous; progress is UX-only).
    const tick = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) { clearInterval(tick); return p }
        return p + 15
      })
    }, 300)

    runBackup()
      .then((entry) => {
        clearInterval(tick)
        setProgress(100)
        setTimeout(() => {
          setEntries((prev) => [entry, ...prev])
          setPhase('idle')
          setProgress(0)
        }, 600)
      })
      .catch((err: unknown) => {
        clearInterval(tick)
        setError(typeof err === 'string' ? err : 'Backup failed')
        setPhase('idle')
        setProgress(0)
      })
  }, [])

  const handleRestore = useCallback((entry: BackupEntry) => {
    setRestoreTarget(entry)
    setRestoreResult(null)
    setPhase('confirm-restore')
  }, [])

  const handleRestoreConfirm = useCallback(() => {
    if (!restoreTarget) return
    setRestoring(true)

    restoreBackupFromArchive(restoreTarget.path)
      .then((msg) => {
        setRestoreResult(msg)
        setRestoring(false)
      })
      .catch((err: unknown) => {
        setRestoreResult('ERROR:' + (typeof err === 'string' ? err : 'Restore failed'))
        setRestoring(false)
      })
  }, [restoreTarget])

  const handleRestoreCancel = useCallback(() => {
    setPhase('idle')
    setRestoreTarget(null)
    setRestoreResult(null)
  }, [])

  // Derive header status
  const { label: statusLabel, tone: statusTone } = backupStatus(entries)
  const statusColor = statusTone === 'warn' ? theme.warn : undefined

  const latest = entries[0]
  const subLabel = loading
    ? 'Scanning…'
    : error
      ? 'Load error'
      : entries.length === 0
        ? 'No backups yet'
        : `Last · ${relativeTime(latest.createdAt)}`

  if (phase === 'confirm-restore' && restoreTarget) {
    return (
      <MenuShell>
        <DetailHeader
          title="Restore Backup"
          sub="Destructive — confirm before continuing"
          onBack={handleRestoreCancel}
          badge={<StatusPill text="Confirm" tone={theme.danger} />}
        />
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <KeyLossWarning />
          <RestoreConfirm
            entry={restoreTarget}
            onConfirm={handleRestoreConfirm}
            onCancel={handleRestoreCancel}
            restoring={restoring}
            restoreResult={restoreResult}
          />
        </div>
      </MenuShell>
    )
  }

  return (
    <MenuShell>
      <DetailHeader
        title="Backups"
        sub={subLabel}
        onBack={onBack}
        badge={
          <StatusPill
            text={loading ? 'Scanning' : error ? 'Error' : statusLabel}
            tone={error ? theme.danger : statusColor}
          />
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* Loading state */}
        {loading && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '24px 14px',
              textAlign: 'center',
              fontFamily: theme.fontMono,
              fontSize: theme.sizeLabel,
              letterSpacing: 1.2,
              color: theme.textMuted,
              textTransform: 'uppercase',
            }}
          >
            Scanning backup directory…
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div style={{ padding: '14px' }}>
            <div
              role="alert"
              style={{
                background: `${theme.danger}1a`,
                border: `1px solid ${theme.danger}44`,
                borderRadius: 5,
                padding: '10px 12px',
              }}
            >
              <div style={{
                fontFamily: theme.fontMono,
                fontSize: theme.sizeLabel,
                letterSpacing: 1.2,
                color: theme.danger,
                textTransform: 'uppercase',
                marginBottom: 5,
              }}>
                Backup scan error
              </div>
              <p style={{
                margin: 0,
                fontFamily: theme.fontRow,
                fontSize: theme.sizeBody,
                color: theme.textDim,
                lineHeight: 1.5,
              }}>
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Backup in progress */}
        {phase === 'running' && (
          <div style={{ padding: '10px 14px' }}>
            <MeterBar
              label="Snapshotting…"
              value={progress}
              max={100}
              unit="%"
              direction="higher"
            />
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            <KeyLossWarning />

            {/* Empty state */}
            {entries.length === 0 && phase !== 'running' && (
              <div style={{
                padding: '24px 14px',
                textAlign: 'center',
                fontFamily: theme.fontMono,
                fontSize: theme.sizeLabel,
                letterSpacing: 1.2,
                color: theme.textMuted,
                textTransform: 'uppercase',
              }}>
                No backups yet — run your first backup below
              </div>
            )}

            {/* Backup history list */}
            {entries.length > 0 && (
              <>
                <div style={{
                  padding: '6px 14px 4px',
                  fontFamily: theme.fontMono,
                  fontSize: theme.sizeLabel,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  color: theme.textMuted,
                }}>
                  ↳ {entries.length} snapshot{entries.length !== 1 ? 's' : ''} · newest first
                </div>

                <FiberDivider dim />

                {entries.map((entry, i) => (
                  <BackupRow
                    key={entry.id}
                    entry={entry}
                    isLatest={i === 0}
                    onRestore={handleRestore}
                  />
                ))}
              </>
            )}

            {/* Schedule summary */}
            <FiberDivider dim />
            <DataLine label="storage"  value="~/Documents/Harborline-Backups" mono={false} />
            <DataLine label="scope"    value="DB + Stronghold vault (encrypted)" mono={false} />
            <DataLine label="schedule" value="Manual — no auto-schedule in v1" mono={false} />
            <div style={{
              padding: '6px 14px 10px',
              fontFamily: theme.fontMono,
              fontSize: theme.sizeLabel,
              letterSpacing: 0.8,
              color: theme.textMuted,
              lineHeight: 1.5,
            }}>
              Vault is backed up encrypted (wrapped DEK). Requires Keychain entry from
              this device to decrypt on restore.
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <ActionFooter
        primary={phase === 'running' ? 'Backing up…' : 'Back Up Now'}
        secondary="Refresh"
        onPrimary={phase === 'running' ? undefined : handleBackUpNow}
        onSecondary={loadBackups}
      />
    </MenuShell>
  )
}
