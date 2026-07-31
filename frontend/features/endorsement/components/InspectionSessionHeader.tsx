import { useState } from 'react'
import { Package, X } from 'lucide-react'
import { ResetSessionModal } from '@/components/ui/reset-session-modal'
import { IsbnConverterModal } from '@/components/isbn-converter-modal'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BoxEntry } from '../types/endorsement.types'

interface InspectionSessionHeaderProps {
  inspBox: BoxEntry
  inspCurrentBoxBooks: number
  inspUserName: string
  loadingInspSession: boolean
  inspScannedBooksLength: number
  expectedBooksLength: number
  handleResetInspSession: () => void
  handleOpenInspComplete: () => void
  brand: string
}

export function InspectionSessionHeader({
  inspBox,
  inspCurrentBoxBooks,
  inspUserName,
  loadingInspSession,
  inspScannedBooksLength,
  expectedBooksLength,
  handleResetInspSession,
  handleOpenInspComplete,
  brand,
}: InspectionSessionHeaderProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showIsbnModal, setShowIsbnModal] = useState(false)

  const isJaguar = brand === 'jaguar'
  const cardTheme = isJaguar ? 'bg-orange-50/40 border-orange-200/60 ring-1 ring-orange-100' : 'bg-white/60 border-primary/10 ring-1 ring-primary/5'
  const iconTheme = 'premium-gradient-ui-card--solid'
  const labelTheme = isJaguar ? 'text-orange-600/70' : 'text-primary/70'
  const valueTheme = isJaguar ? 'text-orange-900' : 'text-primary'

  return (
    <>
      <div className={cn('relative flex w-full flex-col gap-4 rounded-[20px] border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3 sm:pr-4', cardTheme)}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="flex min-w-0 items-center gap-3 sm:gap-4 z-10">
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg', iconTheme)}>
            <Package className="h-5 w-5" />
          </div>
          
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-5">
            <div className="min-w-[64px]">
              <span className={cn('block text-[9px] font-semibold uppercase tracking-[0.1em]', labelTheme)}>Lot</span>
              <span className={cn('mt-0.5 block truncate text-sm font-semibold tracking-tight', valueTheme)}>{inspBox.lot?.lot_number || '—'}</span>
            </div>
            
            {inspBox.box_number && (
              <>
                <div className="hidden h-7 w-px sm:block bg-primary/10" />
                <div className="min-w-[52px]">
                  <span className={cn('block text-[9px] font-semibold uppercase tracking-[0.1em]', labelTheme)}>Box</span>
                  <span className={cn('mt-0.5 block text-sm font-semibold tracking-tight', valueTheme)}>{inspBox.box_number}</span>
                </div>
              </>
            )}

            <div className="hidden h-7 w-px sm:block bg-primary/10" />
            <div className="min-w-[112px] flex-1 sm:flex-none">
              <span className={cn('block text-[9px] font-semibold uppercase tracking-[0.1em]', labelTheme)}>Operator</span>
              <span className={cn('mt-0.5 block truncate text-sm font-semibold tracking-tight', valueTheme)}>{inspUserName || 'Unknown'}</span>
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
          
          <div className="relative group flex flex-1 sm:flex-none">
            <button
              onClick={handleOpenInspComplete}
              disabled={loadingInspSession || inspScannedBooksLength === 0 || inspScannedBooksLength < expectedBooksLength}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-xs font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 w-full premium-gradient-ui-card--solid"
            >
              <Package className="h-4 w-4" />
              Complete Session
            </button>
            {inspScannedBooksLength < expectedBooksLength && (
              <div className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-2 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                Not all books are scanned yet
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
              </div>
            )}
          </div>
        </div>
      </div>

      <ResetSessionModal
        open={showResetConfirm}
        description="Are you sure you want to reset this session? All scanned progress will be lost."
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => handleResetInspSession()}
      />
      
      <IsbnConverterModal 
        open={showIsbnModal} 
        onClose={() => setShowIsbnModal(false)} 
        brand={brand}
      />
    </>
  )
}
