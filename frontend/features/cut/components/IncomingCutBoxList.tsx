import React from 'react'
import { Inbox } from 'lucide-react'
import { BookInBox, BoxEntry } from '../types/cut.types'
import { CutBoxRow } from './CutBoxRow'

interface IncomingCutBoxListProps {
  boxes: BoxEntry[]
  expandedBoxId: string | null
  onToggleBox: (boxId: string) => void
  onActionClick: (action: 'receive' | 'send', box: BoxEntry) => void
  receivingBoxId: string | null
  boxBooks: Record<string, BookInBox[]>
  loadingBoxBooksId: string | null
}

export const IncomingCutBoxList: React.FC<IncomingCutBoxListProps> = ({
  boxes,
  expandedBoxId,
  onToggleBox,
  onActionClick,
  receivingBoxId,
  boxBooks,
  loadingBoxBooksId,
}) => {
  if (boxes.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
        <Inbox className="h-10 w-10 mb-3 text-primary" />
        <p className="font-semibold text-foreground">No incoming boxes</p>
        <p className="text-sm">Boxes sent from Inventory will appear here.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {boxes.map(box => (
        <CutBoxRow
          key={box.id}
          box={box}
          type="incoming"
          isExpanded={expandedBoxId === box.id}
          onToggle={() => onToggleBox(box.id)}
          onActionClick={onActionClick}
          isProcessing={receivingBoxId === box.id}
          books={boxBooks[box.id] || []}
          isLoadingBooks={loadingBoxBooksId === box.id}
        />
      ))}
    </div>
  )
}
