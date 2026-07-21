import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Boxes, Table2, CircleDot, DollarSign, Archive, ArrowLeftRight, Gauge, ScrollText } from 'lucide-react'
import { MasterRow, MasterHeader, DetailPlaceholder, EmptyState } from '../ui'
import { StatusPill } from '@/components/StatusPill'
import { LogViewer } from '../LogViewer'
import { BundlesDetail } from '@/screens/detail/BundlesDetail'
import { ModelInventoryDetail } from '@/screens/detail/ModelInventoryDetail'
import { ModelResidencyDetail } from '@/screens/detail/ModelResidencyDetail'
import { PaidComputeDetail } from '@/screens/detail/PaidComputeDetail'
import { BackupsDetail } from '@/screens/detail/BackupsDetail'
import { RelayDetail } from '@/screens/detail/RelayDetail'
import { EngineRoomDetail } from '@/screens/detail/EngineRoomDetail'

type ConsoleId =
  | 'bundles' | 'model-inventory' | 'model-residency' | 'paid-compute'
  | 'backups' | 'relay' | 'engine-room' | 'logs'

interface Entry {
  id: ConsoleId
  label: string
  sub: string
  icon: ReactNode
}

const ENTRIES: Entry[] = [
  { id: 'bundles', label: 'Bundles & Plugins', sub: 'Manifests · provider health', icon: <Boxes size={15} /> },
  { id: 'model-inventory', label: 'Model Inventory', sub: 'Installed models across the zoo', icon: <Table2 size={15} /> },
  { id: 'model-residency', label: 'Model Residency', sub: "What's loaded on the GPU now", icon: <CircleDot size={15} /> },
  { id: 'paid-compute', label: 'Paid Compute', sub: 'Gateway spend ledger · balances', icon: <DollarSign size={15} /> },
  { id: 'backups', label: 'Backups', sub: 'Snapshot DB + vault · restore', icon: <Archive size={15} /> },
  { id: 'relay', label: 'Sync & Relay', sub: 'Bridge relay · tailnet status', icon: <ArrowLeftRight size={15} /> },
  { id: 'engine-room', label: 'Diagnostics', sub: 'System metrics · collect diagnostics', icon: <Gauge size={15} /> },
  { id: 'logs', label: 'Logs', sub: 'Full-height service log tail', icon: <ScrollText size={15} /> },
]

function renderDetail(id: ConsoleId, narrow: boolean, onBack: () => void): ReactNode {
  switch (id) {
    case 'bundles': return <BundlesDetail onBack={onBack} />
    case 'model-inventory': return <ModelInventoryDetail onBack={onBack} />
    case 'model-residency': return <ModelResidencyDetail onBack={onBack} />
    case 'paid-compute': return <PaidComputeDetail onBack={onBack} />
    case 'backups': return <BackupsDetail onBack={onBack} />
    case 'relay': return <RelayDetail onBack={onBack} />
    case 'engine-room': return <EngineRoomDetail onBack={onBack} />
    case 'logs': return <LogViewer narrow={narrow} onBack={onBack} />
    default: return null
  }
}

interface Props {
  narrow: boolean
  query: string
  focusItem: string | null
  /** Portal target in the shell's navigation region (CIC design amendment,
   *  tender#103) — see FleetSection for the pattern. */
  masterSlotEl: HTMLElement | null
}

export function ConsoleSection({ narrow, query, focusItem, masterSlotEl }: Props) {
  const [selected, setSelected] = useState<ConsoleId | null>(null)

  useEffect(() => {
    if (focusItem && ENTRIES.some((e) => e.id === focusItem)) setSelected(focusItem as ConsoleId)
  }, [focusItem])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ENTRIES
    return ENTRIES.filter((e) => e.label.toLowerCase().includes(q) || e.sub.toLowerCase().includes(q))
  }, [query])

  const clear = () => setSelected(null)

  const master = (
    <div>
      <MasterHeader label="Operator management" count={`${filtered.length}`} />
      {filtered.length === 0 && (
        <EmptyState title="No matches" hint="No operator surface matches your search. Clear the filter to see all." />
      )}
      {filtered.map((e) => (
        <MasterRow
          key={e.id}
          icon={e.icon}
          title={e.label}
          sub={e.sub}
          selected={e.id === selected}
          onClick={() => setSelected(e.id)}
        />
      ))}
    </div>
  )

  const detail = selected ? (
    renderDetail(selected, narrow, clear)
  ) : (
    <DetailPlaceholder
      icon={<Gauge size={28} />}
      message="Select an operator surface — bundles, model inventory, GPU residency, paid-compute ledger, backups, relay, diagnostics, or the full-height log viewer."
      sectionTitle="Console"
      sectionHint="Operator management"
      statusChip={<StatusPill text={`${ENTRIES.length} surfaces`} />}
    />
  )

  return (
    <>
      {masterSlotEl && createPortal(master, masterSlotEl)}
      {detail}
    </>
  )
}
