import { authFetch, getApiBaseUrl } from '@/lib/auth-api'
import type { IsbnLookupResponse } from '../types/qr-scanner.types'

export async function fetchIsbnDetails(isbn: string): Promise<IsbnLookupResponse> {
  const res = await authFetch(`${getApiBaseUrl()}/api/warehouse/search/isbn/${isbn}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
