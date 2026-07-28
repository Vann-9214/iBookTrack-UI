export type ComputedStatus = 'closed' | 'open' | 'in-progress'

export interface LotBox {
  box_id: string
  box_number: string
  current_stage: string
  progress: number
  total_books: number
  processable: number
  non_processable: number
  is_stalled?: boolean
  simflex_breakdown?: Record<string, number>
  time_in_stage?: number | null
  turnaround_time?: number | null
  pending_books?: number
  wip_books?: number
  transmitted_books?: number
}

export interface LotStatusRow {
  lot_id: string
  lot_number: string
  lot_status: string
  computed_status: ComputedStatus
  created_at: string
  created_by?: string | null
  created_by_name?: string | null
  total_boxes: number
  active_boxes: number
  stored_boxes: number
  total_scans: number
  transmitted: number
  non_processable: number
  pending: number
  is_stalled?: boolean
  simflex_breakdown?: Record<string, number>
  time_in_stage?: number | null
  turnaround_time?: number | null
  pending_books?: number
  wip_books?: number
  transmitted_books?: number
  boxes?: LotBox[]
}

export type FilterStatus = 'all' | ComputedStatus
export type SortKey = 'lot_number' | 'computed_status' | 'total_boxes' | 'transmitted' | 'pending' | 'progress' | 'created_by_name'
export type SortDir = 'asc' | 'desc'
