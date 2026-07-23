import { authFetch, getApiBaseUrl } from '@/lib/auth-api'
import type { DashboardBrand } from '../utils/dashboard.helpers'

const apiUrl = getApiBaseUrl()

function withParams(path: string, params: Record<string, string | undefined>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  return `${apiUrl}${path}${query.size ? `?${query}` : ''}`
}

async function json(response: Response) {
  if (!response.ok) throw new Error(`Dashboard request failed with ${response.status}.`)
  return response.json()
}

export async function fetchDashboardData(brand: DashboardBrand, lotNumber?: string) {
  const [stats, pipeline, boxes, live, scanRows, transmitRows] = await Promise.all([
    authFetch(withParams('/api/dashboard/stats', { box_type: brand, lot_number: lotNumber })).then(json),
    authFetch(withParams('/api/dashboard/pipeline-stats', { brand, lot_number: lotNumber })).then(json),
    authFetch(withParams('/api/boxes', { exclude_assigned_storage: 'true', box_type: brand, lot_number: lotNumber })).then(json),
    authFetch(withParams('/api/scanning/live', { newProcessOnly: 'true', location: brand })).then(json).catch(() => null),
    authFetch(withParams('/api/scanning/scan-rows', { location: brand })).then(json).catch(() => null),
    authFetch(withParams('/api/scanning/transmit-rows', { location: brand })).then(json).catch(() => null),
  ])

  return { stats, pipeline, boxes, live, scanRows, transmitRows }
}

export async function searchIsbn(isbn: string) {
  return authFetch(`${apiUrl}/api/warehouse/search/isbn/${encodeURIComponent(isbn)}`).then(json)
}

export async function searchLotDetails(lotNumber: string) {
  return authFetch(`${apiUrl}/api/dashboard/lot-details/${encodeURIComponent(lotNumber)}`).then(json)
}

export async function searchLotRange(start: string, end: string) {
  return authFetch(withParams('/api/dashboard/stats', { lot_range_start: start, lot_range_end: end })).then(json)
}

export async function findBoxByNumber(boxNumber: string) {
  return authFetch(`${apiUrl}/api/boxes/by-number/${encodeURIComponent(boxNumber)}`).then(json)
}
