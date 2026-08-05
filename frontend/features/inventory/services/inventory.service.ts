import { authFetch, getApiBaseUrl } from '@/lib/auth-api'
import type { InventoryBox, InventoryIssue, VerificationSession } from '../types/inventory.types'

const apiUrl = getApiBaseUrl()

async function json<T = unknown>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `Inventory request failed with ${response.status}.`)
  return data as T
}

export async function fetchInventoryBoxes(brand: string, searchQuery: string) {
  const params = new URLSearchParams({ box_type: brand, current_stage: 'warehouse,inventory' })
  const query = searchQuery.trim().toLowerCase()
  const data = await authFetch(`${apiUrl}/api/boxes?${params}`).then(json<{ boxes?: InventoryBox[] }>)
  const boxes = data.boxes || []
  if (!query) return boxes
  return boxes.filter((box) =>
    box.box_number.toLowerCase().includes(query) ||
    (box.lot?.lot_number || '').toLowerCase().includes(query)
  )
}

export async function fetchInventoryBox(boxId: string) {
  return authFetch(`${apiUrl}/api/boxes/${boxId}`).then(json<{ box?: InventoryBox }>)
}

export async function fetchBoxBookTypes(boxId: string) {
  return authFetch(`${apiUrl}/api/books?box_id=${boxId}`).then(json<{ books?: Array<{ book_type?: string }> }>)
}

export async function deleteInventoryBox(boxId: string) {
  return authFetch(`${apiUrl}/api/boxes/${boxId}`, { method: 'DELETE' }).then(json)
}

export async function receiveInventoryBox(boxId: string, notes = 'Received at Inventory') {
  return authFetch(`${apiUrl}/api/boxes/${boxId}/advance`, {
    method: 'POST',
    body: JSON.stringify({ notes, expected_stage: 'warehouse' }),
  }).then(json)
}

export async function advanceInventoryBox(boxId: string) {
  return authFetch(`${apiUrl}/api/boxes/${boxId}/advance`, { method: 'POST', body: JSON.stringify({}) }).then(json)
}

export async function sendInventoryBoxToCut(boxId: string, notes = 'Sent from Inventory to Cut') {
  return authFetch(`${apiUrl}/api/boxes/${boxId}/send-forward`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  }).then(json)
}

export async function fetchSimflexStatuses(isbns: string[], brand: string) {
  const params = new URLSearchParams({ isbns: isbns.join(','), location: brand })
  return authFetch(`${apiUrl}/api/scanning/simflex-status?${params}`).then(json)
}

export async function checkBoxSimflex(boxId: string) {
  return authFetch(`${apiUrl}/api/boxes/${boxId}/check-simflex`, { method: 'POST' }).then(json)
}

export async function printInventoryBox(boxId: string) {
  return authFetch(`${apiUrl}/api/boxes/${boxId}/print`, { method: 'POST' }).then(json)
}

export async function resumeInventorySession(boxId: string) {
  return authFetch(`${apiUrl}/api/warehouse/boxes/${boxId}/resume-session`, { method: 'POST' }).then(json<{ session?: VerificationSession }>)
}

export async function fetchWarehouseBooks(boxId: string) {
  return authFetch(`${apiUrl}/api/warehouse/boxes/${boxId}/scans`).then(json<{ success?: boolean; warehouse_books?: unknown[] }>)
}

export async function searchIlmsBook(isbn: string) {
  return authFetch(`${apiUrl}/api/books/ilms/search/${encodeURIComponent(isbn)}`).then(json<{ success?: boolean; data?: { ISBN?: string; Title?: string; Author?: string; Message?: string } }>)
}

export async function saveInventoryScan(
  sessionId: string,
  payload: {
    isbn: string
    title: string
    author: string
    scan_status: 'processable' | 'non_processable'
    rejection_reason?: string
    notes?: string
    mismatch_details?: { ilms_title: string; physical_title: string; physical_author?: string }
  }
) {
  return authFetch(`${apiUrl}/api/warehouse/sessions/${sessionId}/scan`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, stage: 'inventory' }),
  }).then(json)
}

export async function tagInventoryScan(scanId: string, rejection_reason: string, notes?: string, ilms_title?: string, physical_title?: string, physical_author?: string) {
  return authFetch(`${apiUrl}/api/warehouse/scans/${scanId}/tag`, {
    method: 'POST',
    body: JSON.stringify({ status: 'non_processable', rejection_reason, notes, stage: 'inventory', ilms_title, physical_title, physical_author }),
  }).then(json)
}

export async function completeInventorySession(sessionId: string, issues: InventoryIssue[]) {
  return authFetch(`${apiUrl}/api/warehouse/sessions/${sessionId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ stage: 'inventory', issues }),
  }).then(json)
}

export async function cancelInventorySession(boxId: string) {
  return authFetch(`${apiUrl}/api/warehouse/boxes/${boxId}/cancel-session`, { method: 'POST' }).then(json)
}
