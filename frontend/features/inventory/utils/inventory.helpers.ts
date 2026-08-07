import type { InventoryBox } from '../types/inventory.types'
import { FLAG_ISSUES } from '@/constants/flag-issues'

export const INVENTORY_STAGE_COLORS: Record<string, string> = {
  warehouse: 'bg-gray-100 text-gray-700',
  inventory: 'bg-gray-100 text-gray-700',
  cut: 'bg-orange-100 text-orange-700',
  qc: 'bg-yellow-100 text-yellow-700',
  scan: 'bg-blue-100 text-blue-700',
  qa: 'bg-purple-100 text-purple-700',
  transmit: 'bg-green-100 text-green-700',
  storage: 'bg-emerald-100 text-emerald-700',
}

export const PRINT_PROCESS_ROWS = ['Inventory & Registration', 'Cutting', 'Book Endorsement', 'Scanning', 'Book Storage']

export function boxMatchesBrand(box: InventoryBox, brand: string) {
  return !box.lot?.type || box.lot.type.toLowerCase() === brand.toLowerCase()
}

export function getInventoryBoxGroups(boxes: InventoryBox[], brand: string) {
  const matchingBoxes = boxes.filter((box) => boxMatchesBrand(box, brand))
  return {
    incoming: matchingBoxes.filter(
      (box) => box.current_stage === 'warehouse' && box.box_sessions?.some((session) => session.status === 'completed')
    ),
    verification: matchingBoxes
      .filter(
        (box) =>
          box.current_stage === 'inventory' &&
          !box.box_sessions?.some((session) => session.status === 'completed' || session.status === 'sent')
      )
      .sort((a, b) => {
        const aStatus = a.box_sessions?.[0]?.status
        const bStatus = b.box_sessions?.[0]?.status
        const aIsActive = aStatus === 'in_progress' || aStatus === 'delayed'
        const bIsActive = bStatus === 'in_progress' || bStatus === 'delayed'
        if (aIsActive && !bIsActive) return -1
        if (!aIsActive && bIsActive) return 1
        return 0
      }),
    outgoing: matchingBoxes.filter(
      (box) => box.current_stage === 'inventory' && box.box_sessions?.some((session) => session.status === 'completed')
    ),
  }
}

export function normalizeInventoryIsbn(isbn: string) {
  return isbn.trim().toLowerCase()
}

export function issueLabel(value: string) {
  return FLAG_ISSUES.find((issue) => issue.value === value)?.label || value
}

export function getBookCount(box: InventoryBox) {
  const books = box.books as Array<{ count?: number }>
  return books[0]?.count ?? books.length ?? 0
}
