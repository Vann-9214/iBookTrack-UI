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
  handleRemoveInspBook,
  brand,
}: InspectionSessionProps) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <InspectionSessionHeader
        inspBox={inspBox}
        inspCurrentBoxBooks={inspCurrentBoxBooks}
        inspUserName={inspUserName}
        loadingInspSession={loadingInspSession}
        inspScannedBooksLength={inspScannedBooks.length}
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
        handleRemoveInspBook={handleRemoveInspBook}
      />
    </div>
  )
}
