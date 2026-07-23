import { BoxEntry, SearchType } from '../types/scan.types'

export function isIncomingBox(box: BoxEntry): boolean {
  return box.box_sessions?.some(s => s.status === 'sent') ?? false
}

export function filterBoxesByLot(boxes: BoxEntry[], searchQuery: string, searchType: SearchType): BoxEntry[] {
  if (searchType !== 'lot') return boxes
  const query = searchQuery.trim().toLowerCase()
  if (!query) return boxes
  return boxes.filter(box => (box.lot?.lot_number || '').toLowerCase().includes(query))
}

export function formatBookCount(box: BoxEntry): number {
  return box.box_sessions?.[0]?.total_scanned_books ?? box.total_expected_books ?? 0
}
