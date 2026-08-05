export interface BookInBox {
  id: string
  isbn: string
  title: string | null
  author?: string | null
  scan_status: string
  scanned_at: string
  book_type?: string
  flag?: { issue: string; remarks?: string }
}

export interface BoxSession {
  status: string
  endorsement_time_send?: string
  endorsement_send_profile?: { name: string }
  scan_time_received?: string
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
