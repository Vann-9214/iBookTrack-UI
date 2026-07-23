import { CircleCheck, CircleX, ClipboardCheck, Loader2, ScanBarcode } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { useVerificationSession } from '../hooks/useVerificationSession'

export function InventoryVerificationCompleteModal({ verification }: { verification: ReturnType<typeof useVerificationSession> }) {
  const {
    verifConfirmComplete,
    setVerifConfirmComplete,
    verifScannedBooks,
    warehouseBooks,
    loadingVerifBooks,
    handleCompleteVerifSession,
    setVerifIssues,
    setVerifTotalBooksExpected,
  } = verification

  if (!verifConfirmComplete) return null

  const verifProcessableBooks = verifScannedBooks.filter((book) => book.scan_status === 'processable')
  const verifBlockedBooks = verifScannedBooks.filter((book) => book.scan_status === 'non_processable')
  const verifMissingBooks = warehouseBooks.filter((book) =>
    book.rejection_reason === 'missing' &&
    !verifScannedBooks.some((scanned) => scanned.isbn.trim().toLowerCase() === book.isbn.trim().toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setVerifConfirmComplete(false)}>
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="h-0.5 w-full bg-primary/80" />
        <div className="p-6 overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">Complete Verification</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Review the ISBNs before sending verified books into iLMS.</p>
            </div>
          </div>

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

          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Processable ISBNs</p>
                  <p className="text-[11px] text-muted-foreground">These are the only ISBNs that will be updated or edited in iLMS.</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold uppercase tracking-wide">Update in iLMS</span>
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-border">
                {verifProcessableBooks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No processable books scanned.</div>
                ) : (
                  verifProcessableBooks.map((book, idx) => (
                    <div key={`${book.id}-${idx}`} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
                      <span className="text-xs font-semibold w-24 shrink-0">{book.isbn}</span>
                      <span className="text-[11px] truncate flex-1">{book.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">Processable</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Non-Processable and Missing ISBNs</p>
                  <p className="text-[11px] text-muted-foreground">These are the ISBNs that can't be updated or edited in iLMS.</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold uppercase tracking-wide">Blocked from iLMS</span>
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-border">
                {verifBlockedBooks.length === 0 && verifMissingBooks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No non-processable or missing books.</div>
                ) : (
                  [
                    ...verifBlockedBooks.map((book) => ({
                      id: book.id,
                      isbn: book.isbn,
                      title: book.title,
                      statusLabel: 'Non-Processable',
                      statusClass: 'bg-red-100 text-red-700 border border-red-200',
                    })),
                    ...verifMissingBooks.map((book, idx) => ({
                      id: `missing-${book.isbn}-${idx}`,
                      isbn: book.isbn,
                      title: book.title || 'Missing book',
                      statusLabel: 'Missing',
                      statusClass: 'bg-slate-100 text-slate-700 border border-slate-200',
                    })),
                  ].map((book, idx) => (
                    <div key={`${book.id}-${idx}`} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
                      <span className="text-xs font-semibold w-24 shrink-0">{book.isbn}</span>
                      <span className="text-[11px] truncate flex-1">{book.title}</span>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', book.statusClass)}>{book.statusLabel}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">* Total {verifScannedBooks.length} scanned books will be saved to the database when you confirm.</p>
          </div>

          <div className="flex gap-2 justify-end pt-5 mt-5 border-t border-border">
            <button
              onClick={() => { setVerifConfirmComplete(false); setVerifTotalBooksExpected(''); setVerifIssues([]); }}
              className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteVerifSession}
              disabled={loadingVerifBooks}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50"
            >
              {loadingVerifBooks ? 'Completing...' : 'Confirm Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
