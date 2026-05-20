import { useState } from 'react'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { Panel } from '@/screens/Panel'
import { type Screen, type DetailId } from '@/state/types'
import { SignalBridgeDetail } from '@/screens/detail/SignalBridgeDetail'
import { SunfishDetail } from '@/screens/detail/SunfishDetail'
import { FlightDeckDetail } from '@/screens/detail/FlightDeckDetail'
import { EngineRoomDetail } from '@/screens/detail/EngineRoomDetail'
import { DockSettingsDetail } from '@/screens/detail/DockSettingsDetail'
import { DryDockDetail } from '@/screens/detail/DryDockDetail'
import { ReleaseNotesDetail } from '@/screens/detail/ReleaseNotesDetail'
import '@/animations.css'

function DetailScreen({ id, onBack }: { id: DetailId; onBack: () => void }) {
  switch (id) {
    case 'signal-bridge':  return <SignalBridgeDetail  onBack={onBack} />
    case 'sunfish':        return <SunfishDetail        onBack={onBack} />
    case 'flight-deck':    return <FlightDeckDetail     onBack={onBack} />
    case 'engine-room':    return <EngineRoomDetail      onBack={onBack} />
    case 'dock-settings':  return <DockSettingsDetail   onBack={onBack} />
    case 'dry-dock':       return <DryDockDetail         onBack={onBack} />
    case 'release-notes':  return <ReleaseNotesDetail   onBack={onBack} />
    default:               return null
  }
}

function AppContent() {
  const [screen, setScreen] = useState<Screen>({ kind: 'main' })

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
