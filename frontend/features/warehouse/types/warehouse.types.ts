import type { FlagIssue } from '@/constants/flag-issues'

export interface ILMSBookData {
  Title?: string
  AuthorName?: string
  LotNo?: string
  BoxNo?: string
  'Received-Status'?: string
  [key: string]: any
}

export interface ScannedBook {
  id: string
  isbn: string
  title: string
  author: string
  scan_status: 'processable' | 'non_processable'
  flag_issue?: string
  flag_remarks?: string
  mismatch_details?: {
    ilms_title: string
    physical_title: string
    physical_author?: string
  }
  timestamp: Date
  ilmsData?: ILMSBookData | null
}

export interface WarehouseSession {
  id: string
  status: string
  type?: string
  total_scanned_books: number
  total_processable: number
  total_non_processable: number
  box_id?: string | null
}

export interface Lot {
  lot_number: string
  type?: string
  boxes: string[]
}

export type ConflictType = 'zero_books' | 'has_books'

export interface ConflictModalState {
  open: boolean
  type: ConflictType | null
  message: string
  boxInfo?: any
}

export interface SimilarLotModalState {
  open: boolean
  typedLot: string
  matchedLot: string
  onContinue: () => void
}

export interface IlmsMismatchModalState {
  open: boolean
  isbn: string
  title: string
  author?: string
  expectedLot: string
  expectedBox: string
  ilmsLot: string
  ilmsBox: string
  onConfirm: () => void
}

export interface MissingIssue {
  isbn: string
  type: 'missing'
  title?: string
  author?: string
}
