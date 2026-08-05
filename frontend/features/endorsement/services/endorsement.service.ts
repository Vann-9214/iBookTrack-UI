import { authFetch } from '@/lib/auth-api'
import { BoxEntry, BoxBookEntry, WarehouseBook, InspScannedBook } from '../types/endorsement.types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""


export const endorsementService = {
  async fetchIncomingBoxes(brand: string, searchQuery: string, searchType: 'box' | 'lot' | 'isbn'): Promise<BoxEntry[]> {
    const params = new URLSearchParams()
    params.append('current_stage', 'cut')
    params.append('box_type', brand)
    const query = searchQuery.trim()
    if (query) {
      if (searchType === 'box') params.append('box_number', query)
      if (searchType === 'isbn') params.append('isbn', query)
    }
    const res = await authFetch(`${API_URL}/api/boxes?${params.toString()}`)
    const data = await res.json()
    return (data.boxes || []).filter((b: BoxEntry) => b.box_sessions?.some((s) => s.status === 'sent'))
  },

  async receiveBox(boxId: string): Promise<void> {
    const res = await authFetch(`${API_URL}/api/boxes/${boxId}/advance`, {
      method: 'POST',
      body: JSON.stringify({ notes: 'Received at Endorsement', expected_stage: 'cut' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to receive box')
  },

  async fetchEndorsementBoxes(brand: string, searchQuery: string, searchType: 'box' | 'lot' | 'isbn'): Promise<BoxEntry[]> {
    const params = new URLSearchParams()
    params.append('current_stage', 'endorsement')
    params.append('box_type', brand)
    const query = searchQuery.trim()
    if (query) {
      if (searchType === 'box') params.append('box_number', query)
      if (searchType === 'isbn') params.append('isbn', query)
    }
    const res = await authFetch(`${API_URL}/api/boxes?${params.toString()}`)
    const data = await res.json()
    if (data.boxes) {
      return data.boxes.filter((b: BoxEntry) => !b.box_sessions?.some((s) => s.status === 'sent'))
    }
    return []
  },

  async sendToScan(boxId: string): Promise<void> {
    const res = await authFetch(`${API_URL}/api/boxes/${boxId}/send-forward`, {
      method: 'POST',
      body: JSON.stringify({ notes: 'Sent from Endorsement' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send to scan')
  },

  async fetchBoxDetails(boxId: string): Promise<BoxBookEntry[]> {
    const res = await authFetch(`${API_URL}/api/boxes/${boxId}`)
    const data = await res.json()
    return data.box?.books || []
  },

  async fetchWarehouseScans(boxId: string): Promise<WarehouseBook[]> {
    const res = await authFetch(`${API_URL}/api/warehouse/boxes/${boxId}/scans`)
    const data = await res.json()
    if (res.ok && data.success) {
      return data.warehouse_books || []
    }
    return []
  },

  async resumeSession(boxId: string) {
    const res = await authFetch(`${API_URL}/api/warehouse/boxes/${boxId}/resume-session`, {
      method: 'POST',
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to start session')
    return data.session
  },

  async searchIlms(isbn: string) {
    const res = await authFetch(`${API_URL}/api/books/ilms/search/${isbn}`)
    return await res.json()
  },

  async saveScanBook(sessionId: string, book: InspScannedBook) {
    const res = await authFetch(`${API_URL}/api/warehouse/sessions/${sessionId}/scan`, {
      method: 'POST',
      body: JSON.stringify({
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        scan_status: book.scan_status,
        rejection_reason: book.flag_issue || null,
        notes: book.flag_remarks || null,
        mismatch_details: book.mismatch_details || null,
        stage: 'endorsement',
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to save book')
    return data.scanLog?.id
  },

  async completeSession(sessionId: string, expectedCount: number) {
    const res = await authFetch(`${API_URL}/api/warehouse/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        total_expected_books: expectedCount,
        stage: 'endorsement',
        issues: [],
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to complete session')
  },

  async cancelSession(boxId: string) {
    const res = await authFetch(`${API_URL}/api/warehouse/boxes/${boxId}/cancel-session`, {
      method: 'POST',
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to cancel session')
  },
}
