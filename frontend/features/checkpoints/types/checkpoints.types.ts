import type { ElementType } from 'react'

export type Stage =
  | 'warehouse'
  | 'inventory'
  | 'cut'
  | 'endorsement'
  | 'scan'
  | 'transmit'
  | 'storage'

export interface Lot {
  lot_number: string
}

export interface BoxSessionProfile {
  name?: string
}

export interface BoxSession {
  warehouse_time_received?: string
  inventory_time_received?: string
  inventory_time_send?: string
  inventory_complete_at?: string
  inventory_session_started_at?: string
  cut_time_received?: string
  cut_time_send?: string
  endorsement_time_received?: string
  endorsement_time_send?: string
  endorsement_complete_at?: string
  endorsement_session_started_at?: string
  scan_time_received?: string
  updated_at?: string
  status?: string
  total_scanned_books?: number
  total_processable_books?: number

  warehouse_received_profile?: BoxSessionProfile
  inventory_received_profile?: BoxSessionProfile
  inventory_started_profile?: BoxSessionProfile
  inventory_complete_profile?: BoxSessionProfile
  inventory_send_profile?: BoxSessionProfile
  cut_received_profile?: BoxSessionProfile
  cut_send_profile?: BoxSessionProfile
  endorsement_received_profile?: BoxSessionProfile
  endorsement_started_profile?: BoxSessionProfile
  endorsement_complete_profile?: BoxSessionProfile
  endorsement_send_profile?: BoxSessionProfile
  scan_received_profile?: BoxSessionProfile
}

export interface BoxItem {
  id: string
  box_number: string
  current_stage: Stage
  total_expected_books: number
  total_transmitted_books?: number
  is_fully_completed_in_simflex?: boolean

  lot: Lot | null
  box_sessions?: BoxSession[]

  latest_inventory_scan_at?: string
  latest_inventory_scan_by_name?: string
  latest_endorsement_scan_at?: string
  latest_endorsement_scan_by_name?: string
}

export interface ScannedBook {
  id: string
  isbn: string
  title: string | null
  author?: string | null
  scan_status: string
  transmission_status?: string | null
  flag?: {
    issue: string
    remarks: string
  } | null
}

export interface TransitionBox {
  box_number: string
  lot: Lot | null
  current_stage: Stage
  total_expected_books: number
  total_transmitted_books?: number
  created_at: string
}

export interface Transition {
  id: string
  from_stage: string | null
  to_stage: string
  moved_by_name: string | null
  notes: string | null
  created_at: string
  box: TransitionBox | null

  warehouse_user_name?: string
  warehouse_time_received?: string
  warehouse_scan_name?: string
  warehouse_scan_at?: string

  inventory_user_name?: string
  inventory_time_received?: string
  inventory_scan_name?: string
  inventory_scan_at?: string
  inventory_send_name?: string
  inventory_time_send?: string

  cut_user_name?: string
  cut_time_received?: string
  cut_send_name?: string
  cut_time_send?: string

  endorsement_user_name?: string
  endorsement_time_received?: string
  endorsement_scan_name?: string
  endorsement_scan_at?: string
  endorsement_send_name?: string
  endorsement_time_send?: string

  scan_user_name?: string
  scan_time_received?: string

  storage_user_name?: string
  storage_time_assigned?: string

  total_scanned_books?: number
  total_processable_books?: number
  updated_at?: string
}

export interface SimflexStatusResult {
  latestStatus: string | null
  transmissionCompleted: boolean
}

export interface SimflexRow {
  ISBN: string
  BoxNumber: string
  LotNumber?: string
  ScanUser?: string
  Title?: string
  Status?: string
}

export interface UndoEntry {
  box: BoxItem
  fromStage: string
  toStage: string
}

export interface AdvanceError {
  box: BoxItem
  message: string
  pending_isbns: string[]
}

export interface StageBoxDetail {
  books: ScannedBook[]
  simflex: Record<string, SimflexStatusResult>
  loading: boolean
  loadingSimflex: boolean
}

export interface SimflexCheckResult {
  boxId: string
  message: string
  success: boolean
  autoAdvanced?: boolean
}

export type ConfirmActionType = 'receive' | 'send_forward' | 'advance'

export interface StageMeta {
  label: string
  icon: ElementType
  color: string
  solidBg: string
}

export interface StatusConfig {
  nodeRing: string
  countColor: string
  bar: string
  cardBg: string
  dot: string
  label: string
  borderTop: string
  borderGradient: string
  iconColorCls: string
}
