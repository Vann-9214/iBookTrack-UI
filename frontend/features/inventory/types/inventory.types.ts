export type InventoryTab = 'incoming' | 'verification' | 'outgoing'
export type VerificationIssueType = 'missing' | 'extra'
export type InventoryConfirmAction = 'receive' | 'send_to_cut'

export interface BookInBox {
  id: string
  isbn: string
  title: string | null
  author?: string | null
  scan_status: string
  scanned_at: string
  book_type?: string
  flag?: { issue: string; remarks: string }
}

export interface InventoryBoxSession {
  id?: string
  status: string
  updated_at?: string
  warehouse_user_received?: string
  inventory_user_received?: string
  endorsement_user_received?: string
  inventory_user_send?: string
  warehouse_time_received?: string
  total_scanned_books?: number
  inventory_time_received?: string
  inventory_time_send?: string
  inventory_printed_by?: string
  inventory_session_started_by?: string
  inventory_session_started_at?: string
  inventory_printed_at?: string
  warehouse_received_profile?: { name: string }
  inventory_received_profile?: { name: string }
  inventory_started_profile?: { name: string }
  inventory_send_profile?: { name: string }
  cut_received_profile?: { name: string }
  cut_send_profile?: { name: string }
  endorsement_received_profile?: { name: string }
  endorsement_send_profile?: { name: string }
  scan_received_profile?: { name: string }
}

export interface InventoryBox {
  id: string
  box_number: string
  lot_id: string
  total_expected_books: number
  total_transmitted_books: number
  current_stage: string
  created_at: string
  lot: { lot_number: string; status: string; type?: string }
  books: BookInBox[] | { count: number }[]
  scans: { count: number }[]
  box_sessions?: InventoryBoxSession[]
  latest_inventory_scan_at?: string | null
}

export interface VerificationScannedBook {
  id: string
  isbn: string
  title: string
  author: string
  scan_status: 'processable' | 'non_processable'
  flag_issue?: string
  flag_remarks?: string
  mismatch_details?: { ilms_title: string; ilms_author?: string; physical_title: string; physical_author?: string }
  timestamp: Date
}

export interface VerificationSession {
  id: string
  status: string
  total_scanned_books: number
  total_processable: number
  total_non_processable: number
  box_id?: string | null
}

export interface WarehouseBook {
  id?: string
  isbn: string
  title: string
  author?: string | null
  scan_status: 'processable' | 'non_processable'
  rejection_reason?: string
  notes?: string
  scanned_at: string
  scanned_by_name: string
}

export interface InventoryIssue {
  isbn: string
  type: VerificationIssueType
  title?: string
  author?: string
}

export interface SimflexResult {
  isbn: string
  transmissionCompleted: boolean
  latestStatus: string | null
  boxNumber: string | null
}

export interface SimflexCheckResult {
  autoAdvanced: boolean
  allCompleted: boolean
  finalStage: string
  totalProcessable: number
  completedCount: number
  pendingCount: number
  message: string
  simflexResults: SimflexResult[]
  notCompleted: Array<{ isbn: string; latestStatus: string | null }>
}

export interface SimflexModalState {
  box: InventoryBox
  loading: boolean
  result: SimflexCheckResult | null
  error: string | null
}

export interface PrintState {
  box: InventoryBox
  book?: BookInBox
}
