import { authFetch } from "@/lib/auth-api"
import { BoxEntry, BookInBox, SearchType } from "../types/scan.types"
import { isIncomingBox } from "../utils/scan.helpers"

const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is missing in environment variables.')

export async function fetchIncomingBoxes(brand: string, searchQuery: string, searchType: SearchType): Promise<BoxEntry[]> {
  const params = new URLSearchParams()
  params.append('current_stage', 'endorsement')
  const query = searchQuery.trim()
  if (query) {
    if (searchType === 'box') params.append('box_number', query)
    if (searchType === 'isbn') params.append('isbn', query)
  }
  params.append('box_type', brand)
  const resIncoming = await authFetch(`${API_URL}/api/boxes?${params.toString()}`)
  const incomingData = await resIncoming.json()
  return (incomingData.boxes || []).filter(isIncomingBox)
}

export async function fetchBoxDetails(boxId: string): Promise<BookInBox[]> {
  const res = await authFetch(`${API_URL}/api/boxes/${boxId}`)
  const data = await res.json()
  return data.box?.books || []
}

export async function advanceBoxToScan(boxId: string): Promise<any> {
  const res = await authFetch(`${API_URL}/api/boxes/${boxId}/advance`, {
    method: 'POST',
    body: JSON.stringify({ notes: 'Received at Scan' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to receive box')
  return data
}
