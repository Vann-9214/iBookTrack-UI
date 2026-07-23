export interface BookEntry {
  no: number
  isbn: string
  title: string
  status: string
  rejectionReason?: string
}

// Result from a QR scan (pipe-delimited box label)
export interface QrResult {
  kind: 'qr'
  lot: string
  box: string
  bookCount: number
  type: string
  books: BookEntry[]
}

// Result from a barcode scan (single ISBN)
export interface BarcodeResult {
  kind: 'barcode'
  isbn: string
  title: string
  lot: string
  box: string
  bookType: string      // 'Mustang' | 'Jaguar' | '—'
  status: string        // 'P' | 'NP' | ''
  rejectionReason: string
  loading: boolean
  notFound: boolean
}

export type ScanResult = QrResult | BarcodeResult

export interface IsbnLookupBook {
  title?: string
  lot_number?: string
  box_number?: string
  book_type?: string
  scan_status?: string
  rejection_reason?: string
}

export interface IsbnLookupResponse {
  success: boolean
  book?: IsbnLookupBook
  message?: string
}
