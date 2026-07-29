import { BoxEntry } from '../types/scan.types'

export function isIncomingBox(box: BoxEntry): boolean {
  return box.box_sessions?.some(s => s.status === 'sent') ?? false
}

export function filterIncomingBoxes(boxes: BoxEntry[], searchQuery: string): BoxEntry[] {
  const query = searchQuery.trim().toLowerCase()
  if (!query) return boxes
  return boxes.filter(box => {
    const boxMatch = box.box_number.toLowerCase().includes(query)
    const lotMatch = (box.lot?.lot_number || '').toLowerCase().includes(query)
    return boxMatch || lotMatch
  })
}

export function formatBookCount(box: BoxEntry): number {
  return box.box_sessions?.[0]?.total_scanned_books ?? box.total_expected_books ?? 0
}
