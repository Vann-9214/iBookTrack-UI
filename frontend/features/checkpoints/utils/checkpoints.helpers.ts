import type { ElementType } from 'react'
import {
  Scan,
  Package,
  Scissors,
  CheckCircle,
  Camera,
  Radio,
  Warehouse,
} from 'lucide-react'
import type { Stage, StageMeta, StatusConfig, BoxItem } from '../types/checkpoints.types'

export const STAGE_ORDER: Stage[] = [
  'warehouse',
  'inventory',
  'cut',
  'endorsement',
  'scan',
  'transmit',
  'storage',
]

export const STAGE_META: Record<Stage, StageMeta> = {
  warehouse: {
    label: 'Warehouse',
    icon: Package,
    color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    solidBg: 'bg-indigo-500',
  },
  inventory: {
    label: 'Inventory',
    icon: Warehouse,
    color: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    solidBg: 'bg-cyan-500',
  },
  cut: {
    label: 'Cut',
    icon: Scissors,
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    solidBg: 'bg-orange-500',
  },
  endorsement: {
    label: 'Endorsement',
    icon: CheckCircle,
    color: 'bg-amber-100 text-amber-700 border-amber-300',
    solidBg: 'bg-amber-500',
  },
  scan: {
    label: 'Scan',
    icon: Camera,
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    solidBg: 'bg-primary',
  },
  transmit: {
    label: 'Transmit',
    icon: Radio,
    color: 'bg-violet-100 text-violet-700 border-violet-300',
    solidBg: 'bg-violet-500',
  },
  storage: {
    label: 'Storage',
    icon: Warehouse,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    solidBg: 'bg-primary',
  },
}

export const STAGE_LABELS: Record<string, string> = {
  warehouse: 'Warehouse',
  inventory: 'Inventory',
  cut: 'Cut',
  endorsement: 'Endorsement',
  scan: 'Scan',
  storage: 'Storage',
}

export const SIMFLEX_STAGE_LABELS: Record<string, string> = {
  Scanning: 'Scan',
  Tif2PDF: 'PDF',
  Preval: 'Preval',
  Transmission_Archive: 'Transmission',
  Transmission_Archived: 'Transmission',
}

export const SIMFLEX_PAGE_SIZE = 50

export function getStepStatus(count: number): 'idle' | 'active' {
  if (count === 0) return 'idle'
  return 'active'
}

export function getStatusConfig(status: string, brand: string): StatusConfig {
  if (status === 'active') {
    return {
      nodeRing:
        brand === 'jaguar'
          ? 'border-primary text-primary'
          : 'border-primary text-primary',
      countColor: 'text-primary',
      bar: brand === 'jaguar' ? 'bg-primary' : 'bg-primary',
      cardBg: brand === 'jaguar' ? 'bg-green-50' : 'bg-blue-50',
      dot: brand === 'jaguar' ? 'bg-primary' : 'bg-primary',
      label: 'Active',
      borderTop:
        brand === 'jaguar' ? 'border-t-green-400' : 'border-t-blue-400',
      borderGradient: 'bg-gradient-to-r from-primary via-primary/50 to-transparent',
      iconColorCls:
        brand === 'jaguar'
          ? 'bg-green-100 text-green-700 border-green-200'
          : 'bg-blue-100 text-blue-700 border-blue-200',
    }
  }

  return {
    nodeRing: 'border-gray-200 text-gray-400',
    countColor: 'text-gray-400',
    bar: 'bg-gray-200',
    cardBg: 'bg-background',
    dot: 'bg-gray-300',
    label: 'Idle',
    borderTop: 'border-t-transparent',
    borderGradient: '',
    iconColorCls: 'bg-gray-50 text-gray-400 border-gray-200',
  }
}

export function getRelevantTimeForBox(
  box: BoxItem,
  stage: Stage | string
): string | null {
  const session = box.box_sessions?.[0]
  if (!session) return null

  const status = session.status

  if (stage === 'warehouse') {
    if (status === 'completed') return session.updated_at || null
    if (status === 'received')
      return session.warehouse_time_received || session.updated_at || null
    if (status === 'sent') return session.updated_at || null
  } else if (stage === 'inventory') {
    if (status === 'completed')
      return session.inventory_time_send || session.updated_at || null
    if (status === 'received')
      return session.inventory_time_received || session.updated_at || null
    if (status === 'sent')
      return session.inventory_time_send || session.updated_at || null
    if (box.latest_inventory_scan_at) return box.latest_inventory_scan_at
  } else if (stage === 'cut') {
    if (status === 'completed')
      return session.cut_time_send || session.updated_at || null
    if (status === 'received')
      return session.cut_time_received || session.updated_at || null
    if (status === 'sent')
      return session.cut_time_send || session.updated_at || null
  } else if (stage === 'endorsement') {
    if (status === 'completed')
      return session.endorsement_time_send || session.updated_at || null
    if (status === 'received')
      return session.endorsement_time_received || session.updated_at || null
    if (status === 'sent')
      return session.endorsement_time_send || session.updated_at || null
    if (box.latest_endorsement_scan_at) return box.latest_endorsement_scan_at
  } else if (stage === 'scan') {
    return session.scan_time_received || session.updated_at || null
  }

  return session.updated_at || null
}

export function formatSimflexStatus(raw: string | undefined | null): string | null | undefined {
  if (!raw) return raw
  const parts = raw.split(' ')
  const stage = parts[0]
  const status = parts.slice(1).join(' ')
  const label = SIMFLEX_STAGE_LABELS[stage] ?? stage
  const prettyStatus = status
    ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    : ''
  return `${label} ${prettyStatus}`.trim()
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function hasDataChanged<T>(oldData: T[], newData: T[]): boolean {
  if (oldData.length !== newData.length) return true
  return oldData.some(
    (item, i) => JSON.stringify(item) !== JSON.stringify(newData[i])
  )
}

export function getStageBoxRowInfo(
  box: BoxItem,
  selectedStage: Stage,
  latestTransition?: { moved_by_name?: string | null; created_at?: string }
) {
  const session = box.box_sessions?.[0]
  const sessionStatus = session?.status || 'pending'

  let actionLabel = 'Received'
  let byName = latestTransition?.moved_by_name || 'N/A'
  let timeStr = latestTransition?.created_at || null

  if (selectedStage === 'warehouse') {
    if (sessionStatus === 'completed') {
      actionLabel = 'Processed'
      byName = session?.warehouse_received_profile?.name || byName
      timeStr = session?.updated_at || timeStr
    } else if (sessionStatus === 'received') {
      actionLabel = 'Received'
      byName = session?.warehouse_received_profile?.name || byName
      timeStr = session?.warehouse_time_received || timeStr
    } else if (sessionStatus === 'sent') {
      actionLabel = 'Sent'
      byName = session?.warehouse_received_profile?.name || byName
      timeStr = session?.updated_at || timeStr
    }
  } else if (selectedStage === 'inventory') {
    if (sessionStatus === 'completed') {
      actionLabel = 'Processed'
      byName = session?.inventory_complete_profile?.name || session?.inventory_send_profile?.name || byName
      timeStr = session?.inventory_complete_at || session?.inventory_time_send || timeStr
    } else if (sessionStatus === 'received') {
      actionLabel = 'Received'
      byName = session?.inventory_received_profile?.name || byName
      timeStr = session?.inventory_time_received || timeStr
    } else if (sessionStatus === 'sent') {
      actionLabel = 'Sent'
      byName = session?.inventory_send_profile?.name || byName
      timeStr = session?.inventory_time_send || timeStr
    } else if (sessionStatus === 'in_progress' || sessionStatus === 'delayed') {
      actionLabel = 'Processing'
      byName = session?.inventory_started_profile?.name || session?.inventory_received_profile?.name || byName
      timeStr = session?.inventory_session_started_at || session?.inventory_time_received || timeStr
    }
    if (byName === 'N/A' && box.latest_inventory_scan_by_name) {
      byName = box.latest_inventory_scan_by_name
      timeStr = box.latest_inventory_scan_at || timeStr
    }
  } else if (selectedStage === 'cut') {
    if (sessionStatus === 'completed') {
      actionLabel = 'Processed'
      byName = session?.cut_send_profile?.name || byName
      timeStr = session?.cut_time_send || timeStr
    } else if (sessionStatus === 'received') {
      actionLabel = 'Received'
      byName = session?.cut_received_profile?.name || byName
      timeStr = session?.cut_time_received || timeStr
    } else if (sessionStatus === 'sent') {
      actionLabel = 'Sent'
      byName = session?.cut_send_profile?.name || byName
      timeStr = session?.cut_time_send || timeStr
    }
  } else if (selectedStage === 'endorsement') {
    if (sessionStatus === 'completed') {
      actionLabel = 'Processed'
      byName = session?.endorsement_complete_profile?.name || session?.endorsement_send_profile?.name || byName
      timeStr = session?.endorsement_complete_at || session?.endorsement_time_send || timeStr
    } else if (sessionStatus === 'received') {
      actionLabel = 'Received'
      byName = session?.endorsement_received_profile?.name || byName
      timeStr = session?.endorsement_time_received || timeStr
    } else if (sessionStatus === 'sent') {
      actionLabel = 'Sent'
      byName = session?.endorsement_send_profile?.name || byName
      timeStr = session?.endorsement_time_send || timeStr
    } else if (sessionStatus === 'in_progress' || sessionStatus === 'delayed') {
      actionLabel = 'Processing'
      byName = session?.endorsement_started_profile?.name || session?.endorsement_received_profile?.name || byName
      timeStr = session?.endorsement_session_started_at || session?.endorsement_time_received || timeStr
    }
    if (byName === 'N/A' && box.latest_endorsement_scan_by_name) {
      byName = box.latest_endorsement_scan_by_name
      timeStr = box.latest_endorsement_scan_at || timeStr
    }
  } else if (selectedStage === 'scan') {
    actionLabel = 'Scanned'
    byName = session?.scan_received_profile?.name || byName
    timeStr = session?.scan_time_received || timeStr
  } else if (selectedStage === 'storage') {
    actionLabel = 'Completed'
  }

  return { actionLabel, byName, timeStr }
}
