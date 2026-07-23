import { ScanBarcode } from "lucide-react"
import { BoxEntry, BookInBox } from "../types/scan.types"
import { ScanBoxRow } from "./ScanBoxRow"

interface IncomingScanBoxListProps {
  boxes: BoxEntry[]
  expandedBoxId: string | null
  boxBooks: Record<string, BookInBox[]>
  loadingBoxBooks: string | null
  receivingBox: string | null
  toggleBox: (boxId: string) => void
  openConfirm: (box: BoxEntry) => void
}

export function IncomingScanBoxList({
  boxes,
  expandedBoxId,
  boxBooks,
  loadingBoxBooks,
  receivingBox,
  toggleBox,
  openConfirm,
}: IncomingScanBoxListProps) {
  if (boxes.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
        <ScanBarcode className="h-10 w-10 mb-3 text-primary" />
        <p className="font-semibold text-foreground">No incoming boxes</p>
        <p className="text-sm">Boxes sent from Endorsement will appear here.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {boxes.map(box => (
        <ScanBoxRow
          key={box.id}
          box={box}
          isExpanded={expandedBoxId === box.id}
          onToggle={() => toggleBox(box.id)}
          books={boxBooks[box.id] || []}
          loadingBooks={loadingBoxBooks === box.id}
          receivingBox={receivingBox}
          onOpenConfirm={openConfirm}
        />
      ))}
    </div>
  )
}
