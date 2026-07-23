import { authFetch, getApiBaseUrl } from '@/lib/auth-api'
import type {
  ILMSBookData,
  Lot,
  MissingIssue,
  ScannedBook,
} from '../types/warehouse.types'

const baseUrl = getApiBaseUrl()

export async function fetchLots(): Promise<Lot[]> {
  const res = await authFetch(`${baseUrl}/api/warehouse/ilms-lots`)
  const data = await res.json()
  if (!data.success) throw new Error('Failed to load lots from iLMS.')
  return (data.lots || []) as Lot[]
}

export async function checkBoxExists(
  lot_number: string,
  box_number: string,
  type: string
): Promise<boolean> {
  const params = new URLSearchParams({ lot_number, box_number, type })
  const res = await authFetch(`${baseUrl}/api/warehouse/box-exists?${params.toString()}`)
  const data = await res.json()
  return res.ok && data.exists
}

export interface BulkSavePayload {
  lot_number: string
  box_number: string
  type?: string
  force: boolean
  total_expected_books: number
  issues: MissingIssue[]
  scanned_books: ScannedBook[]
  book_type: string
}

export async function bulkSaveSession(payload: BulkSavePayload): Promise<void> {
  const res = await authFetch(`${baseUrl}/api/warehouse/sessions/bulk-save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to bulk save session')
}

export async function deleteSession(sessionId: string): Promise<void> {
  await authFetch(`${baseUrl}/api/warehouse/sessions/${sessionId}`, {
    method: 'DELETE',
  })
}

export interface IsbnQueryResponse {
  success: boolean
  data?: ILMSBookData
  error?: string
}

export async function queryIsbnStream(
  isbn: string,
  type?: string | null,
  allowExisting?: boolean
): Promise<IsbnQueryResponse> {
  const res = await authFetch(`${baseUrl}/api/warehouse/isbn-stream/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isbn, type, allowExisting }),
  })
  return (await res.json()) as IsbnQueryResponse
}
