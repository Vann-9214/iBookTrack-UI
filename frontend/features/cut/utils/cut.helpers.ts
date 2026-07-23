import { BoxEntry, SearchType } from '../types/cut.types'

export function buildCutBoxesUrl(apiUrl: string, stage: string, brand: string, searchQuery: string, searchType: SearchType): string {
  const params = new URLSearchParams()
  params.append('current_stage', stage)
  params.append('box_type', brand)
  const query = searchQuery.trim()
  if (query) {
    if (searchType === 'box') params.append('box_number', query)
    if (searchType === 'isbn') params.append('isbn', query)
  }
  return `${apiUrl}/api/boxes?${params.toString()}`
}

export function isIncomingCutBox(box: BoxEntry): boolean {
  return box.box_sessions?.some(s => s.status === 'sent') ?? false
}

export function isOutgoingCutBox(box: BoxEntry): boolean {
  return !(box.box_sessions?.some(s => s.status === 'sent') ?? false)
}

export function filterCutBoxBySearch(box: BoxEntry, searchQuery: string, searchType: SearchType): boolean {
  if (searchType !== 'lot') return true
  const query = searchQuery.trim().toLowerCase()
  if (!query) return true
  return (box.lot?.lot_number || '').toLowerCase().includes(query)
}

export function getBoxBookCount(box: BoxEntry): number {
  return box.box_sessions?.[0]?.total_scanned_books ?? box.total_expected_books ?? 0
}
