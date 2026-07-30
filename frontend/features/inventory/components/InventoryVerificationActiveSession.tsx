import { useState } from 'react'
import { CircleCheck, CircleX, Package, ScanBarcode, BookOpen, X } from 'lucide-react'
import { ScannerInput } from '@/components/scanner-input'
import { ResetSessionModal } from '@/components/ui/reset-session-modal'
import { IsbnConverterModal } from '@/components/isbn-converter-modal'
import { InventoryVerificationTables } from './InventoryVerificationTables'
import { cn } from '@/lib/utils'
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
  const [showIsbnModal, setShowIsbnModal] = useState(false)

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

  const isJaguar = brand === 'jaguar'
  const cardTheme = isJaguar ? 'bg-orange-50/40 border-orange-200/60 ring-1 ring-orange-100' : 'bg-white/60 border-primary/10 ring-1 ring-primary/5'
  const iconTheme = 'premium-gradient-ui-card--solid'
  const labelTheme = isJaguar ? 'text-orange-600/70' : 'text-primary/70'
  const valueTheme = isJaguar ? 'text-orange-900' : 'text-primary'

  const stats = [
    {
      label: 'Total scanned',
      value: verifScannedBooks.length,
      icon: ScanBarcode,
      card: 'bg-white/68 border border-primary/15 ring-1 ring-primary/10 hover:shadow-primary/20',
      iconBg: 'premium-gradient-ui-card--solid',
      text: 'text-primary',
      accent: 'bg-primary/20',
    },
    {
      label: 'Processable',
      value: verifProcessableBooks.length,
      icon: CircleCheck,
      card: 'border-emerald-200/80 bg-emerald-50 ring-emerald-100/70 hover:shadow-emerald-200/60',
      iconBg: 'bg-emerald-600 shadow-emerald-500/25',
      text: 'text-emerald-700',
      accent: 'bg-emerald-400/20',
    },
    {
      label: 'Non-processable',
      value: verifBlockedBooks.length + verifMissingBooks.length,
      icon: CircleX,
      card: 'border-rose-200/80 bg-red-50 ring-rose-100/70 hover:shadow-rose-200/60',
      iconBg: 'bg-red-600 shadow-red-500/25',
      text: 'text-red-600',
      accent: 'bg-red-400/20',
    },
  ]

  return (
    <>
      {/* Active session bar */}
      <div className={cn('relative flex w-full flex-col gap-4 rounded-[20px] border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3 sm:pr-4', cardTheme)}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="flex min-w-0 items-center gap-3 sm:gap-4 z-10">
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg', iconTheme)}>
            <Package className="h-5 w-5" />
          </div>
          
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-5">
            <div className="min-w-[64px]">
              <span className={cn('block text-[9px] font-semibold uppercase tracking-[0.1em]', labelTheme)}>Lot</span>
              <span className={cn('mt-0.5 block truncate text-sm font-semibold tracking-tight', valueTheme)}>{verifBox?.lot?.lot_number || '—'}</span>
            </div>
            
            {verifBox?.box_number && (
              <>
                <div className="hidden h-7 w-px sm:block bg-primary/10" />
                <div className="min-w-[52px]">
                  <span className={cn('block text-[9px] font-semibold uppercase tracking-[0.1em]', labelTheme)}>Box</span>
                  <span className={cn('mt-0.5 block text-sm font-semibold tracking-tight', valueTheme)}>{verifBox.box_number} ({verifCurrentBoxBooks})</span>
                </div>
              </>
            )}

            <div className="hidden h-7 w-px sm:block bg-primary/10" />
            <div className="min-w-[112px] flex-1 sm:flex-none">
              <span className={cn('block text-[9px] font-semibold uppercase tracking-[0.1em]', labelTheme)}>Operator</span>
              <span className={cn('mt-0.5 block truncate text-sm font-semibold tracking-tight', valueTheme)}>{verifUserName || 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 gap-2 sm:w-auto z-10">
          <button onClick={() => setShowIsbnModal(true)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-semibold text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/10 sm:flex-none">
            <BookOpen className="h-4 w-4" />
            Convert ISBN
          </button>
          
          <button onClick={() => setShowResetConfirm(true)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200/80 bg-white/80 px-4 py-3 text-xs font-semibold text-red-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-red-200/40 sm:flex-none">
            <X className="h-4 w-4" />
            Reset
          </button>
          
          <button
            onClick={handleOpenVerifComplete}
            disabled={completeDisabled}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-xs font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:flex-none premium-gradient-ui-card--solid"
          >
            <CircleCheck className="h-4 w-4" />
            Complete Session
          </button>
        </div>
      </div>

      {/* Book count stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map(({ label, value, icon: Icon, card, iconBg, text, accent }) => (
          <div key={label} className={cn('relative min-w-0 overflow-hidden rounded-2xl border p-2 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-3', card)}>
            <div className={cn('absolute -right-5 -top-5 h-20 w-20 rounded-full blur-xl', accent)} />
            <div className="relative flex h-full items-center justify-between gap-3">
              <div className={cn('hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg sm:flex', iconBg)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="ml-auto min-w-0 text-right">
                <p className={cn('truncate text-[9px] font-bold uppercase tracking-[0.12em] sm:text-[10px]', text)}>{label}</p>
                <p className={cn('mt-0.5 text-2xl font-black leading-none tracking-tight sm:text-3xl', text)}>{value}</p>
              </div>
            </div>
          </div>
        ))}
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

      <ResetSessionModal
        open={showResetConfirm}
        description="Are you sure you want to reset this session? All scanned progress will be lost."
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => handleResetVerifSession()}
      />
      
      <IsbnConverterModal 
        open={showIsbnModal} 
        onClose={() => setShowIsbnModal(false)} 
        brand={brand}
      />
    </>
  )
}
