import { CheckCircle2 } from 'lucide-react'
import type { InspScannedBook } from '../types/endorsement.types'

interface CompleteInspectionModalProps {
  inspConfirmComplete: boolean
  inspScannedBooks: InspScannedBook[]
  loadingInspSession: boolean
  onClose: () => void
  onConfirm: () => void
}

export function CompleteInspectionModal({
  inspConfirmComplete,
  inspScannedBooks,
  loadingInspSession,
  onClose,
  onConfirm,
}: CompleteInspectionModalProps) {
  if (!inspConfirmComplete) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="premium-gradient-ui-card premium-gradient-ui-card--static border-2 rounded-2xl shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="premium-gradient-ui-card__glow" />
        <div className="relative flex items-center gap-3 mb-4">
          <div className="premium-gradient-ui-card__icon w-9 h-9">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="premium-gradient-ui-card__eyebrow">Review & Confirm</p>
            <h3 className="text-lg font-black tracking-tight text-foreground leading-none">Complete Inspection</h3>
          </div>
        </div>

        {/* Scan Log Summary */}
        <div className="mb-4">
          {inspScannedBooks.length === 0 ? (
            <div className="border border-border rounded-lg bg-card p-4 text-center text-xs text-muted-foreground">
              No books scanned.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Processable Books */}
              {inspScannedBooks.filter((b) => b.scan_status === 'processable').length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground mb-2 block uppercase tracking-wider">
                    Processable Books
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-border rounded-lg bg-card divide-y divide-border">
                    {inspScannedBooks
                      .filter((b) => b.scan_status === 'processable')
                      .map((book, idx) => (
                        <div key={`proc-${book.id}-${idx}`} className="flex items-center gap-3 px-3 py-2 bg-muted/30">
                          <span className="text-xs font-semibold w-24 shrink-0">{book.isbn}</span>
                          <span className="text-[11px] break-words flex-1">{book.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-primary/20 text-primary">Processable</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Previously Flagged Books */}
              {inspScannedBooks.filter((b) => b.scan_status === 'non_processable' && !b.flag_issue).length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-orange-600 mb-1 block uppercase tracking-wider">Previously Flagged Books</label>
                  <p className="text-[10px] text-muted-foreground mb-2">These books were flagged as non-processable in a previous stage.</p>
                  <div className="max-h-60 overflow-y-auto border border-orange-200 rounded-lg bg-orange-50/50 divide-y divide-orange-100">
                    {inspScannedBooks
                      .filter((b) => b.scan_status === 'non_processable' && !b.flag_issue)
                      .map((book, idx) => (
                        <div key={`old-flag-${book.id}-${idx}`} className="flex items-center gap-3 px-3 py-2">
                          <span className="text-xs font-semibold w-24 shrink-0 text-orange-900">{book.isbn}</span>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[11px] break-words text-orange-900 font-medium">{book.title}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-orange-100 text-orange-700 shrink-0">Previously Flagged</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Newly Flagged Books */}
              {inspScannedBooks.filter((b) => b.scan_status === 'non_processable' && !!b.flag_issue).length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-red-600 mb-1 block uppercase tracking-wider">Newly Flagged Books</label>
                  <p className="text-[10px] text-muted-foreground mb-2">These books were newly flagged during this inspection session.</p>
                  <div className="max-h-60 overflow-y-auto border border-red-200 rounded-lg bg-red-50/50 divide-y divide-red-100">
                    {inspScannedBooks
                      .filter((b) => b.scan_status === 'non_processable' && !!b.flag_issue)
                      .map((book, idx) => (
                        <div key={`new-flag-${book.id}-${idx}`} className="flex items-center gap-3 px-3 py-2">
                          <span className="text-xs font-semibold w-24 shrink-0 text-red-900">{book.isbn}</span>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[11px] break-words text-red-900 font-medium">{book.title}</span>
                            {(book.flag_issue || book.flag_remarks) && (
                              <span className="text-[10px] text-red-700 mt-0.5 truncate">
                                {book.flag_issue} {book.flag_remarks ? `— ${book.flag_remarks}` : ''}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-red-100 text-red-700 shrink-0">Newly Flagged</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-4">
            * Total {inspScannedBooks.length} scanned books will be saved to the database when you confirm.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loadingInspSession}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50"
          >
            {loadingInspSession ? 'Completing…' : 'Confirm Complete'}
          </button>
        </div>
      </div>
    </div>
  )
}
