import { authFetch, getApiBaseUrl } from '@/lib/auth-api'
import type {
  BoxItem,
  Transition,
  ScannedBook,
  SimflexStatusResult,
  SimflexRow,
  Stage,
} from '../types/checkpoints.types'

const base = () => getApiBaseUrl()

export interface FetchBoxesResponse {
  success?: boolean
  boxes?: BoxItem[]
}

export interface FetchPipelineTransitionsResponse {
  success?: boolean
  transitions?: Transition[]
  totalCount?: number
}

export interface FetchLiveScanResponse {
  success?: boolean
  scanWipCount?: number | null
}

export interface FetchScanRowsResponse {
  success?: boolean
  rows?: SimflexRow[]
}

export interface FetchTransmitRowsResponse {
  success?: boolean
  count?: number
  rows?: SimflexRow[]
}

export interface FetchBoxByIdResponse {
  success?: boolean
  box?: {
    books?: ScannedBook[]
    [key: string]: unknown
  }
}

export interface SimflexStatusResponse {
  success?: boolean
  statuses?: Record<string, SimflexStatusResult>
}

export interface SimflexCheckResponse {
  success?: boolean
  error?: string
  message?: string
  autoAdvanced?: boolean
  from_stage?: string
  to_stage?: string
  pending_isbns?: string[]
}

export async function fetchBoxes(brand: string): Promise<FetchBoxesResponse> {
  const res = await authFetch(
    `${base()}/api/boxes?exclude_assigned_storage=true&box_type=${encodeURIComponent(brand)}`
  )
  return res.json()
}

export async function fetchPipelineTransitions(
  brand: string,
  options: {
    offset?: number
    limit?: number
    stage?: Stage | ''
    search?: string
    dateFrom?: string
    dateTo?: string
  } = {}
): Promise<FetchPipelineTransitionsResponse> {
  const params = new URLSearchParams({
    limit: String(options.limit ?? 50),
    offset: String(options.offset ?? 0),
    box_type: brand,
  })
  if (options.stage) params.append('stage', options.stage)
  if (options.search) params.append('search', options.search)
  if (options.dateFrom) params.append('date_from', options.dateFrom)
  if (options.dateTo) params.append('date_to', options.dateTo)

  const url = `${base()}/api/boxes/pipeline-transitions?${params.toString()}`
  console.log('[checkpoints] fetching pipeline-transitions:', url)
  const res = await authFetch(url)
  return res.json()
}

export async function fetchLiveScanCounts(
  brand: string
): Promise<FetchLiveScanResponse | null> {
  try {
    const res = await authFetch(
      `${base()}/api/scanning/live?newProcessOnly=true&location=${encodeURIComponent(
        brand
      )}&wipOnly=true`
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchScanRows(brand: string): Promise<FetchScanRowsResponse | null> {
  try {
    const res = await authFetch(`${base()}/api/scanning/scan-rows?location=${encodeURIComponent(brand)}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchTransmitRows(
  brand: string
): Promise<FetchTransmitRowsResponse | null> {
  try {
    const res = await authFetch(
      `${base()}/api/scanning/transmit-rows?location=${encodeURIComponent(brand)}`
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchBoxById(boxId: string): Promise<FetchBoxByIdResponse> {
  const res = await authFetch(`${base()}/api/boxes/${boxId}`)
  return res.json()
}

export async function fetchSimflexStatus(
  isbns: string[],
  brand: string
): Promise<SimflexStatusResponse> {
  const res = await authFetch(
    `${base()}/api/scanning/simflex-status?isbns=${encodeURIComponent(
      isbns.join(',')
    )}&location=${encodeURIComponent(brand)}`
  )
  return res.json()
}

export async function checkSimflexForBox(
  boxId: string
): Promise<SimflexCheckResponse> {
  const res = await authFetch(`${base()}/api/boxes/${boxId}/check-simflex`, {
    method: 'POST',
  })
  return res.json()
}

export async function receiveBox(boxId: string): Promise<SimflexCheckResponse> {
  const res = await authFetch(`${base()}/api/boxes/${boxId}/receive`, {
    method: 'POST',
  })
  return res.json()
}

export async function sendForwardBox(boxId: string): Promise<SimflexCheckResponse> {
  const res = await authFetch(`${base()}/api/boxes/${boxId}/send-forward`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  return res.json()
}

export async function advanceBox(boxId: string): Promise<SimflexCheckResponse> {
  const res = await authFetch(`${base()}/api/boxes/${boxId}/advance`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  return res.json()
}

export async function rollbackBox(
  boxId: string,
  toStage: string
): Promise<SimflexCheckResponse> {
  const res = await authFetch(`${base()}/api/boxes/${boxId}/rollback`, {
    method: 'POST',
    body: JSON.stringify({ to_stage: toStage }),
  })
  return res.json()
}
