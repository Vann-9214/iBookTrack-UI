export interface BoxEntry {
  id: string
  box_number: string
  total_expected_books: number
  lot: { lot_number: string } | null
  latest_endorsement_scan_at?: string | null
  box_sessions?: {
    warehouse_time_received?: string
    cut_time_send?: string
    cut_send_profile?: { name: string }
    endorsement_time_received?: string
    endorsement_user_received?: string
    endorsement_received_profile?: { name: string }
    endorsement_session_started_by?: string
    endorsement_started_profile?: { name: string }
    status?: string
    total_scanned_books?: number
    updated_at?: string
  }[]
}

export interface BoxBookEntry {
  id: string
  isbn: string
  title: string | null
  scan_status: string
  flag?: { issue: string; remarks: string }
}

export interface InspScannedBook {
  id: string
  isbn: string
  title: string
  author: string
  scan_status: 'processable' | 'non_processable'
  flag_issue?: string
  flag_remarks?: string
  timestamp: Date
}

export interface WarehouseBook {
  id: string
  isbn: string
  title: string
  scan_status: string
  rejection_reason: string | null
  warehouse_scan_at: string
}

export interface InspSession {
  id: string
  status: string
  total_scanned_books: number
  total_processable: number
  total_non_processable: number
  box_id?: string | null
}
