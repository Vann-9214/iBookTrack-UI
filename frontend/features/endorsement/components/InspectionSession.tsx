import React from 'react'
import { BoxEntry, WarehouseBook, InspScannedBook } from '../types/endorsement.types'
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
  brand: string
}

export const InspectionSession: React.FC<InspectionSessionProps> = ({
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
}) => {
  return (
    <>
      {/* ── Active session bar ── */}
      <InspectionSessionHeader
        inspBox={inspBox}
        inspCurrentBoxBooks={inspCurrentBoxBooks}
        inspUserName={inspUserName}
        loadingInspSession={loadingInspSession}
        inspScannedBooksLength={inspScannedBooks.length}
        handleResetInspSession={handleResetInspSession}
        handleOpenInspComplete={handleOpenInspComplete}
      />

      {/* ── Stats cards ── */}
      <InspectionStats inspCurrentSession={inspCurrentSession} />

      {/* ── Scanner ── */}
      <InspectionScanner onScan={handleInspScan} />

      {/* ── Side-by-Side Warehouse and Endorsement Tables ── */}
      <InspectionComparisonTables
        warehouseBooks={warehouseBooks}
        loadingWarehouseBooks={loadingWarehouseBooks}
        inspScannedBooks={inspScannedBooks}
        openInspFlagModal={openInspFlagModal}
        handleRemoveInspBook={handleRemoveInspBook}
        brand={brand}
      />
    </>
  )
}
