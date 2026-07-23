import { CircleCheck, CircleX, ClipboardCheck, Package, ScanBarcode } from 'lucide-react'
import { ScannerInput } from '@/components/scanner-input'
import { InventoryVerificationTables } from './InventoryVerificationTables'
import type { useVerificationSession } from '../hooks/useVerificationSession'

export function InventoryVerificationActiveSession({ verification }: { verification: ReturnType<typeof useVerificationSession> }) {
  const {
    verifBox,
    verifUserName,
    verifCurrentBoxBooks,
    verifScannedBooks,
    warehouseBooks,
    handleResetVerifSession,
    handleOpenVerifComplete,
    handleVerifScan,
  } = verification

  const verifProcessableBooks = verifScannedBooks.filter((book) => book.scan_status === 'processable')
  const verifBlockedBooks = verifScannedBooks.filter((book) => book.scan_status === 'non_processable')
  const verifMissingBooks = warehouseBooks.filter((book) =>
    book.rejection_reason === 'missing' &&
    !verifScannedBooks.some((scanned) => scanned.isbn.trim().toLowerCase() === book.isbn.trim().toLowerCase())
  )

  const completeDisabled =
    verification.loadingVerifBooks ||
    verifScannedBooks.length === 0 ||
    verifScannedBooks.length !== warehouseBooks.filter((wb) => wb.rejection_reason !== 'missing').length ||
    !warehouseBooks.filter((wb) => wb.rejection_reason !== 'missing').every((wb) => verifScannedBooks.some((vb) => vb.isbn === wb.isbn))

  return (
    <>
      {/* Active session bar */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4">
        <div className="flex items-center gap-4">
          <Package className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Active Lot</p>
            <p className="text-sm font-semibold text-foreground">{verifBox?.lot?.lot_number || '—'}</p>
          </div>
          {verifBox?.box_number && (
            <div>
              <p className="text-xs text-muted-foreground">Current Box</p>
              <p className="text-sm font-semibold text-foreground">{verifBox.box_number} ({verifCurrentBoxBooks} books)</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">User</p>
            <p className="text-sm font-semibold text-foreground">{verifUserName || 'Unknown User'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleResetVerifSession}
            className="px-4 py-1.5 text-sm rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
          >
            Reset Session
          </button>
          <button
            onClick={handleOpenVerifComplete}
            disabled={completeDisabled}
            className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete Session
          </button>
        </div>
      </div>

      {/* Book count stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
            <ScanBarcode className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Total Scanned</p>
            <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{verifScannedBooks.length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 shrink-0">
            <CircleCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Processable</p>
            <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{verifProcessableBooks.length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/10 shrink-0">
            <CircleX className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Non-Processable</p>
            <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{verifBlockedBooks.length + verifMissingBooks.length}</p>
          </div>
        </div>
      </div>

      {/* Scanner */}
      <ScannerInput onScan={handleVerifScan} />

      {/* Side-by-Side Tables */}
      <InventoryVerificationTables verification={verification} />

      {/* Legend */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex items-center justify-center gap-6 text-xs">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-muted-foreground">Match (Warehouse = Inventory)</span>
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
    </>
  )
}
