import { useState, useEffect } from 'react'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { Panel } from '@/screens/Panel'
import { OutfittingScreen } from '@/screens/OutfittingScreen'
import { type Screen, type DetailId } from '@/state/types'
import { SignalBridgeDetail } from '@/screens/detail/SignalBridgeDetail'
import { SunfishDetail } from '@/screens/detail/SunfishDetail'
import { FlightDeckDetail } from '@/screens/detail/FlightDeckDetail'
import { EngineRoomDetail } from '@/screens/detail/EngineRoomDetail'
import { DockSettingsDetail } from '@/screens/detail/DockSettingsDetail'
import { DryDockDetail } from '@/screens/detail/DryDockDetail'
import { ReleaseNotesDetail } from '@/screens/detail/ReleaseNotesDetail'
import { BundlesDetail } from '@/screens/detail/BundlesDetail'
import { BackupsDetail } from '@/screens/detail/BackupsDetail'
import { RelayDetail } from '@/screens/detail/RelayDetail'
import { ModelInventoryDetail } from '@/screens/detail/ModelInventoryDetail'
import { ModelResidencyDetail } from '@/screens/detail/ModelResidencyDetail'
import { PaidComputeDetail } from '@/screens/detail/PaidComputeDetail'
import { getInstallConfig } from '@/ipc/tauri'
import type { CapabilityProfile } from '@/state/types'
import '@/animations.css'

/** In-memory flag: once dismissed (Continue clicked), don't show Outfitting again this session. */
let outfittingDismissed = false

function DetailScreen({ id, onBack }: { id: DetailId; onBack: () => void }) {
  switch (id) {
    case 'signal-bridge':  return <SignalBridgeDetail  onBack={onBack} />
    case 'sunfish':        return <SunfishDetail        onBack={onBack} />
    case 'flight-deck':    return <FlightDeckDetail     onBack={onBack} />
    case 'engine-room':    return <EngineRoomDetail      onBack={onBack} />
    case 'dock-settings':  return <DockSettingsDetail   onBack={onBack} />
    case 'dry-dock':       return <DryDockDetail         onBack={onBack} />
    case 'release-notes':  return <ReleaseNotesDetail   onBack={onBack} />
    case 'bundles':        return <BundlesDetail        onBack={onBack} />
    case 'backups':        return <BackupsDetail        onBack={onBack} />
    case 'relay':          return <RelayDetail          onBack={onBack} />
    case 'model-inventory': return <ModelInventoryDetail onBack={onBack} />
    case 'model-residency': return <ModelResidencyDetail onBack={onBack} />
    case 'paid-compute':    return <PaidComputeDetail    onBack={onBack} />
    default:               return null
  }
}

function AppContent() {
  const [screen, setScreen] = useState<Screen>({ kind: 'main' })
  const [outfittingChecked, setOutfittingChecked] = useState(false)
  // Holds the selected profile from Outfitting; passed to Fleet for pre-fill (future use).
  const [_outfittingProfile, setOutfittingProfile] = useState<CapabilityProfile | null>(null)

  // On mount: check if this is a fresh box (no managed apps). If so, show Outfitting.
  useEffect(() => {
    if (outfittingDismissed) {
      setOutfittingChecked(true)
      return
    }
    getInstallConfig()
      .then(cfg => {
        const noApps = Object.keys(cfg.apps).length === 0
        if (noApps && !outfittingDismissed) {
          setScreen({ kind: 'outfitting' })
        }
      })
      .catch(() => {
        // Fail-soft: can't determine install state; skip Outfitting, proceed to Fleet.
      })
      .finally(() => {
        setOutfittingChecked(true)
      })
  }, [])

  const handleOutfittingContinue = (selected: CapabilityProfile) => {
    outfittingDismissed = true
    setOutfittingProfile(selected)
    setScreen({ kind: 'main' })
  }

  // Don't render until we've checked whether to show Outfitting —
  // avoids a flash of the main panel before the redirect.
  if (!outfittingChecked) return null

  if (screen.kind === 'outfitting') {
    return <OutfittingScreen onContinue={handleOutfittingContinue} />
  }

  return screen.kind === 'main'
    ? <Panel onNavigate={setScreen} />
    : <DetailScreen id={screen.id} onBack={() => setScreen({ kind: 'main' })} />
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
