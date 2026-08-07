import { authFetch } from '@/lib/auth-api'
import { BookInBox, BoxEntry, SearchType } from '../types/cut.types'
import { buildCutBoxesUrl, isIncomingCutBox, isOutgoingCutBox } from '../utils/cut.helpers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""


export const cutService = {
  async fetchBoxes(brand: string, searchQuery: string, searchType: SearchType): Promise<{ incoming: BoxEntry[]; outgoing: BoxEntry[] }> {
    const [resIncoming, resOutgoing] = await Promise.all([
      authFetch(buildCutBoxesUrl(API_URL, 'inventory', brand, searchQuery, searchType)),
      authFetch(buildCutBoxesUrl(API_URL, 'cut', brand, searchQuery, searchType))
    ])
    
    const [incomingData, outgoingData] = await Promise.all([
      resIncoming.json(),
      resOutgoing.json()
    ])
    
    const incoming = (incomingData.boxes || []).filter(isIncomingCutBox)
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
