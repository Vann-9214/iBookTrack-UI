export type BookEntry = {
  isbn: string
  title: string
}

export type Assignment = {
  assignment_id: string
  status?: 'pending' | 'confirmed'
  assigned_at: string
  box_id: string
  box_number: string
  lot_number: string | null
  total_books: number
  books: BookEntry[]
}

export type PendingAssignment = {
  assignment_id: string
  status: 'pending' | 'confirmed'
  assigned_at: string
  box_id: string
  box_number: string
  lot_number: string | null
  total_books: number
  location_id: string
  shelf: number
  rack: string
  level: number
  location_label: string
}

export type StorageLocation = {
  id: string
  shelf: number
  rack: string
  level: number
  capacity: number
  used: number
  assignments: Assignment[]
}

export type ReadyBox = {
  id: string
  box_number: string
  lot_number: string | null
  total_books: number
  books: BookEntry[]
}

export type SearchResult = {
  assignment_id: string
  status?: 'pending' | 'confirmed'
  box_id: string
  box_number: string
  lot_number: string | null
  shelf: number
  rack: string
  level: number
  location_id: string
  location_label: string
}

export type SearchKind = 'box' | 'lot' | 'isbn' | null
