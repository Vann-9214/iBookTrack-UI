import { authFetch } from '@/lib/auth-api'
import { LotStatusRow } from '../types/reports.types'

const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is missing in environment variables.')

export interface LotStatusResponse {
  lots: LotStatusRow[]
}

export const reportsService = {
  async fetchLotStatus(brand: string): Promise<LotStatusRow[]> {
    const res = await authFetch(`${API_URL}/api/reports/lot-status?type=${brand}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to fetch lot status')
    return data.lots || []
  }
}
