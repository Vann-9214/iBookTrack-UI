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

export interface StartSessionError extends Error {
  status?: number
  code?: string
}

export interface StartSessionResult {
  session: { id: string; status: string; box_id?: string | null }
  lot_id: string
  lot_number: string
  message?: string
}

export async function startWarehouseSession(
  lot_number: string,
  box_number: string,
  type?: string,
  force = false
): Promise<StartSessionResult> {
  const res = await authFetch(`${baseUrl}/api/warehouse/sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lot_number, box_number, type, force }),
  })
  const data = await res.json()
  if (!res.ok) {
    const err: StartSessionError = new Error(data.message || data.error || 'Failed to start session')
    err.status = res.status
    err.code = data.error
    throw err
  }
  return data as StartSessionResult
}

export interface BulkSavePayload {
  lot_number: string
  box_number: string
  session_id?: string
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

export interface OverviewBox {
  id: string
  box_number: string
  current_stage: string | null
  total_expected_books: number
  status: 'in_progress' | 'delayed' | 'completed' | null
  session_id?: string | null
  last_touched_by?: string | null
}

export interface OverviewLot {
  id: string
  lot_number: string
  type: string | null
  total_boxes: number
  boxes: OverviewBox[]
  created_by?: string | null
  created_by_name?: string | null
}

export interface OverviewPagination {
  currentPage: number
  totalPages: number
  totalItems: number
}

export interface WarehouseOverviewResponse {
  lots: OverviewLot[]
  pagination: OverviewPagination
}

export async function fetchWarehouseOverview(
  page: number,
  limit: number,
  type?: string,
  search?: string,
  status?: string
): Promise<WarehouseOverviewResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (type) params.set('type', type)
  if (search) params.set('search', search)
  if (status && status !== 'all') params.set('status', status)
  const res = await authFetch(`${baseUrl}/api/warehouse/overview?${params.toString()}`)
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load warehouse overview')
  return { lots: data.lots || [], pagination: data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0 } }
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
