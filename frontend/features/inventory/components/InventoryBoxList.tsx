import { InventoryBoxRow } from './InventoryBoxRow'
import type { BookInBox, InventoryBox } from '../types/inventory.types'

export function InventoryBoxList({
  boxes,
  expandedBoxId,
  booksByBox,
  loadingBoxId,
  onToggle,
  renderBadge,
  renderAction,
  renderDate,
  renderBooks,
  showEmpty = true,
  emptyText = 'No boxes found.',
  lotFallback = '—',
}: {
  boxes: InventoryBox[]
  expandedBoxId: string | null
  booksByBox: Record<string, BookInBox[]>
  loadingBoxId: string | null
  onToggle: (boxId: string) => void
  renderBadge?: (box: InventoryBox) => React.ReactNode
  renderAction?: (box: InventoryBox) => React.ReactNode
  renderDate?: (box: InventoryBox) => Date | null
  renderBooks: (box: InventoryBox, books: BookInBox[]) => React.ReactNode
  showEmpty?: boolean
  emptyText?: string
  lotFallback?: string
}) {
  if (!boxes.length) {
    if (!showEmpty) return null
    return <p className="py-12 text-center text-sm text-muted-foreground">{emptyText}</p>
  }
  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col gap-2 pb-2">
          {boxes.map((box) => {
            const expanded = expandedBoxId === box.id
            const books = booksByBox[box.id] || []
            return (
              <InventoryBoxRow
                key={box.id}
                box={box}
                expanded={expanded}
                onToggle={() => onToggle(box.id)}
                badge={renderBadge?.(box)}
                action={renderAction?.(box)}
                date={renderDate?.(box)}
                lotFallback={lotFallback}
              >
                {expanded && renderBooks(box, books)}
              </InventoryBoxRow>
            )
          })}
        </div>
      </div>
    </div>
  )
}
