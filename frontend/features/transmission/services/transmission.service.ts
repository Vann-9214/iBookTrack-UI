import { authFetch, getApiBaseUrl } from '@/lib/auth-api'
import type {
  LiveResponse,
  MachineBooksResponse,
  RankingResponse,
  LotsSearchResponse,
  LotSummaryResponse,
  EnrichResponse,
  TransmissionBrand,
} from '../types/transmission.types'

const apiUrl = getApiBaseUrl()

export async function fetchLiveTransmissionData({
  from,
  to,
  location,
  newProcessOnly,
}: {
  from: string
  to: string
  location: TransmissionBrand
  newProcessOnly: boolean
}): Promise<LiveResponse> {
  const res = await authFetch(
    `${apiUrl}/api/scanning/live?from=${from}&to=${to}&location=${location}&newProcessOnly=${newProcessOnly}`
  )
  return res.json()
}

export async function fetchMachineBooks({
  machine,
  from,
  to,
  location,
  newProcessOnly,
}: {
  machine: string
  from: string
  to: string
  location: TransmissionBrand
  newProcessOnly: boolean
}): Promise<MachineBooksResponse> {
  const params = new URLSearchParams({
    machine,
    from,
    to,
    location,
    newProcessOnly: String(newProcessOnly),
  })
  const res = await authFetch(`${apiUrl}/api/scanning/machine-books?${params}`)
  return res.json()
}

export async function fetchRanking(location: TransmissionBrand): Promise<RankingResponse> {
  const res = await authFetch(`${apiUrl}/api/scanning/ranking?location=${location}`)
  return res.json()
}

export async function exportTransmissionCsv({
  date,
  location,
}: {
  date: string
  location: TransmissionBrand
}): Promise<Blob> {
  const res = await authFetch(`${apiUrl}/api/scanning/export?date=${date}&location=${location}`)
  return res.blob()
}

export async function searchLots({
  query,
  page,
  pageSize,
  type,
}: {
  query: string
  page: number
  pageSize: number
  type: string
}): Promise<LotsSearchResponse> {
  const offset = (page - 1) * pageSize
  const params = new URLSearchParams({
    limit: String(pageSize),
    offset: String(offset),
    type,
  })
  if (query.trim()) params.set('search', query.trim())
  const res = await authFetch(`${apiUrl}/api/lots?${params}`)
  return res.json()
}

export async function fetchLotTransmissionSummary({
  lotNumber,
  type,
}: {
  lotNumber: string
  type: string
}): Promise<LotSummaryResponse> {
  const params = new URLSearchParams({ type })
  const res = await authFetch(
    `${apiUrl}/api/lots/${encodeURIComponent(lotNumber)}/transmission-summary?${params}`
  )
  return res.json()
}

export async function flagScan({
  scanId,
  issue,
  remarks,
}: {
  scanId: string
  issue: string
  remarks: string
}): Promise<void> {
  const res = await authFetch(`${apiUrl}/api/warehouse/scans/${scanId}/tag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'non_processable',
      rejection_reason: issue,
      notes: remarks,
      stage: 'scan',
    }),
  })

  if (!res.ok) {
    const d = (await res.json()) as { error?: string }
    throw new Error(d.error || 'Failed to flag ISBN')
  }
}

export async function enrichIlms({
  isbns,
}: {
  isbns: string[]
}): Promise<EnrichResponse> {
  const res = await authFetch(`${apiUrl}/api/scanning/enrich-ilms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isbns }),
  })
  return res.json()
}
