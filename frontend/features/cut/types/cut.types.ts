export interface BookInBox {
  id: string
  isbn: string
  title: string | null
  scan_status: string
  scanned_at: string
  book_type?: string
  flag?: {
    issue: string
  }
}

export interface BoxSession {
  status: string
  inventory_time_send?: string
  cut_time_received?: string
  total_scanned_books?: number
}

export interface BoxEntry {
  id: string
  box_number: string
  total_expected_books: number
  lot: { lot_number: string } | null
  box_sessions?: BoxSession[]
}

export type SearchType = 'box' | 'lot' | 'isbn'
export type CutTab = 'incoming' | 'outgoing'

export interface ConfirmModalState {
  open: boolean
  action: 'receive' | 'send' | null
  box: BoxEntry | null
}
