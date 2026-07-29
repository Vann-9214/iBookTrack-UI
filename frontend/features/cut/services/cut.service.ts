import { authFetch } from '@/lib/auth-api'
import { BookInBox, BoxEntry, SearchType } from '../types/cut.types'
import { buildCutBoxesUrl, isIncomingCutBox, isOutgoingCutBox } from '../utils/cut.helpers'

const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is missing in environment variables.')

export const cutService = {
  async fetchBoxes(brand: string, searchQuery: string, searchType: SearchType): Promise<{ incoming: BoxEntry[]; outgoing: BoxEntry[] }> {
    // Fetch incoming: still in 'inventory' stage but session status is 'sent'
    const resIncoming = await authFetch(buildCutBoxesUrl(API_URL, 'inventory', brand, searchQuery, searchType))
    const incomingData = await resIncoming.json()
    const incoming = (incomingData.boxes || []).filter(isIncomingCutBox)

    // Fetch outgoing: current stage is 'cut', but NOT sent to endorsement yet
    const resOutgoing = await authFetch(buildCutBoxesUrl(API_URL, 'cut', brand, searchQuery, searchType))
    const outgoingData = await resOutgoing.json()
    const outgoing = (outgoingData.boxes || []).filter(isOutgoingCutBox)

    return { incoming, outgoing }
  },

  async fetchBoxDetails(boxId: string): Promise<BookInBox[]> {
    const res = await authFetch(`${API_URL}/api/boxes/${boxId}`)
    const data = await res.json()
    return data.box?.books || []
  },

  async receiveBox(boxId: string): Promise<void> {
    const res = await authFetch(`${API_URL}/api/boxes/${boxId}/advance`, {
      method: 'POST',
      body: JSON.stringify({ notes: 'Received at Cut', expected_stage: 'inventory' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to receive box')
  },

  async sendBoxForward(boxId: string): Promise<void> {
    const res = await authFetch(`${API_URL}/api/boxes/${boxId}/send-forward`, {
      method: 'POST',
      body: JSON.stringify({ notes: 'Sent to Endorsement from Cut' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send box')
  }
}
