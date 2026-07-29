import { useState } from 'react'
import { CircleCheck, CircleX, Package, ScanBarcode } from 'lucide-react'
import { ScannerInput } from '@/components/scanner-input'
import { ConfirmActionModal } from '@/components/ui/confirm-action-modal'
import { InventoryVerificationTables } from './InventoryVerificationTables'
import type { useVerificationSession } from '../hooks/useVerificationSession'

export function InventoryVerificationActiveSession({ brand, verification }: { brand: 'mustang' | 'jaguar'; verification: ReturnType<typeof useVerificationSession> }) {
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

  const [showResetConfirm, setShowResetConfirm] = useState(false)

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
      <div className="premium-gradient-ui-card premium-gradient-ui-card--static border rounded-2xl px-5 py-4">
        <div className="premium-gradient-ui-card__glow" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="premium-gradient-ui-card__icon w-9 h-9 shrink-0">
              <Package className="h-4 w-4" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
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
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-1.5 text-sm rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
            >
              Reset Session
            </button>
            <button
              onClick={handleOpenVerifComplete}
              disabled={completeDisabled}
              className="px-4 py-1.5 text-sm rounded-lg premium-gradient-ui-card--solid text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Complete Session
            </button>
          </div>
        </div>
      </div>

      {/* Book count stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="premium-gradient-ui-card premium-gradient-ui-card--static border rounded-2xl p-4 flex items-center gap-3">
          <div className="premium-gradient-ui-card__icon w-9 h-9 shrink-0">
            <ScanBarcode className="h-4 w-4" />
          </div>
          <div>
            <p className="premium-gradient-ui-card__eyebrow">Total Scanned</p>
            <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{verifScannedBooks.length}</p>
          </div>
        </div>
        <div className="premium-gradient-ui-card premium-gradient-ui-card--static border rounded-2xl p-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25">
            <CircleCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="premium-gradient-ui-card__eyebrow">Processable</p>
            <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{verifProcessableBooks.length}</p>
          </div>
        </div>
        <div className="premium-gradient-ui-card premium-gradient-ui-card--static border rounded-2xl p-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25">
            <CircleX className="h-4 w-4" />
          </div>
          <div>
            <p className="premium-gradient-ui-card__eyebrow">Non-Processable</p>
            <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{verifBlockedBooks.length + verifMissingBooks.length}</p>
          </div>
        </div>
      </div>

      {/* Scanner */}
      <ScannerInput onScan={handleVerifScan} brand={brand} />

      {/* Side-by-Side Tables */}
      <InventoryVerificationTables verification={verification} />

      {/* Legend */}
      <div className="premium-gradient-ui-card premium-gradient-ui-card--static border rounded-2xl p-3">
        <div className="flex items-center justify-center gap-6 text-xs flex-wrap">
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

      <ConfirmActionModal
        open={showResetConfirm}
        title="Reset Session"
        description={<>Are you sure you want to reset this session? All scanned progress will be lost.</>}
        confirmLabel="Yes, Reset"
        variant="destructive"
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={() => {
          setShowResetConfirm(false)
          handleResetVerifSession()
        }}
      />
    </>
  )
}
