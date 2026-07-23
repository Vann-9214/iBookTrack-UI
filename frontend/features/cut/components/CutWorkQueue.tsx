import React from 'react'
import { Send } from 'lucide-react'
import { BookInBox, BoxEntry } from '../types/cut.types'
import { CutBoxRow } from './CutBoxRow'

interface CutWorkQueueProps {
  boxes: BoxEntry[]
  expandedBoxId: string | null
  onToggleBox: (boxId: string) => void
  onActionClick: (action: 'receive' | 'send', box: BoxEntry) => void
  sendingBoxId: string | null
  boxBooks: Record<string, BookInBox[]>
  loadingBoxBooksId: string | null
}

export const CutWorkQueue: React.FC<CutWorkQueueProps> = ({
  boxes,
  expandedBoxId,
  onToggleBox,
  onActionClick,
  sendingBoxId,
  boxBooks,
  loadingBoxBooksId,
}) => {
  if (boxes.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
        <Send className="h-10 w-10 mb-3 text-primary" />
        <p className="font-semibold text-foreground">No outgoing boxes</p>
        <p className="text-sm">Received boxes will appear here.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {boxes.map(box => (
        <CutBoxRow
          key={box.id}
          box={box}
          type="outgoing"
          isExpanded={expandedBoxId === box.id}
          onToggle={() => onToggleBox(box.id)}
          onActionClick={onActionClick}
          isProcessing={sendingBoxId === box.id}
          books={boxBooks[box.id] || []}
          isLoadingBooks={loadingBoxBooksId === box.id}
        />
      ))}
    </div>
  )
}
