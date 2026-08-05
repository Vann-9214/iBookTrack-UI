import type { BoxEntry, WarehouseBook, InspScannedBook } from '../types/endorsement.types'
import type { Brand } from '@/hooks/use-brand'
import { InspectionSessionHeader } from './InspectionSessionHeader'
import { InspectionStats } from './InspectionStats'
import { InspectionScanner } from './InspectionScanner'
import { InspectionComparisonTables } from './InspectionComparisonTables'

interface InspectionSessionProps {
  inspBox: BoxEntry
  inspCurrentBoxBooks: number
  inspUserName: string
  loadingInspSession: boolean
  inspScannedBooks: InspScannedBook[]
  inspCurrentSession: any
  warehouseBooks: WarehouseBook[]
  loadingWarehouseBooks: boolean
  handleResetInspSession: () => void
  handleOpenInspComplete: () => void
  handleInspScan: (isbn: string) => void
  openInspFlagModal: (book: InspScannedBook) => void
  openInspMismatchModal: (book: InspScannedBook) => void
  handleRemoveInspBook: (bookId: string) => void
  brand: Brand
}

export function InspectionSession({
  inspBox,
  inspCurrentBoxBooks,
  inspUserName,
  loadingInspSession,
  inspScannedBooks,
  inspCurrentSession,
  warehouseBooks,
  loadingWarehouseBooks,
  handleResetInspSession,
  handleOpenInspComplete,
  handleInspScan,
  openInspFlagModal,
  openInspMismatchModal,
  handleRemoveInspBook,
  brand,
}: InspectionSessionProps) {
  const expectedBooksLength = warehouseBooks.filter((wb) => wb.rejection_reason !== 'missing').length

  return (
    <div className="flex flex-col gap-3">
      <InspectionSessionHeader
        inspBox={inspBox}
        inspCurrentBoxBooks={inspCurrentBoxBooks}
        inspUserName={inspUserName}
        loadingInspSession={loadingInspSession}
        inspScannedBooksLength={inspScannedBooks.length}
        expectedBooksLength={expectedBooksLength}
        handleResetInspSession={handleResetInspSession}
        handleOpenInspComplete={handleOpenInspComplete}
        brand={brand}
      />

      <InspectionStats inspCurrentSession={inspCurrentSession} />

      <InspectionScanner onScan={handleInspScan} brand={brand} />

      <InspectionComparisonTables
        warehouseBooks={warehouseBooks}
        loadingWarehouseBooks={loadingWarehouseBooks}
        inspScannedBooks={inspScannedBooks}
        openInspFlagModal={openInspFlagModal}
        openInspMismatchModal={openInspMismatchModal}
        handleRemoveInspBook={handleRemoveInspBook}
      />

      {/* Legend */}
      <div className="premium-gradient-ui-card premium-gradient-ui-card--static border rounded-2xl p-3">
        <div className="flex items-center justify-center gap-6 text-xs flex-wrap">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-muted-foreground">Match (Inventory = Endorsement)</span>
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-muted-foreground">Mismatch (Different status)</span>
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
            <span className="text-muted-foreground">Missing (Not Required)</span>
          </span>
        </div>
      </div>
    </div>
  )
}
