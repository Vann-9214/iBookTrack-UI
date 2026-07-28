'use client'

import { CircleCheck, Package, AlertTriangle, PackageMinus, X } from 'lucide-react'
import type { MissingIssue, WarehouseSession } from '../types/warehouse.types'

interface WarehouseCompleteSessionModalProps {
  confirmCompleteOpen: boolean
  setConfirmCompleteOpen: (open: boolean) => void
  totalBooksExpected: string
  setTotalBooksExpected: (value: string) => void
  issueIsbn: string
  setIssueIsbn: (value: string) => void
  issueType: 'missing'
  setIssueType: (value: 'missing') => void
  issues: MissingIssue[]
  setIssues: (issues: MissingIssue[]) => void
  fetchingIssueBook: boolean
  handleAddIssue: () => void
  handleRemoveIssue: (isbn: string) => void
  handleIssueKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void
  currentSession: WarehouseSession | null
  loading: boolean
  confirmCloseSession: (skipSimilarLotCheck?: boolean) => void
}

export function WarehouseCompleteSessionModal({
  confirmCompleteOpen,
  setConfirmCompleteOpen,
  totalBooksExpected,
  setTotalBooksExpected,
  issueIsbn,
  setIssueIsbn,
  issueType,
  setIssueType,
  issues,
  setIssues,
  fetchingIssueBook,
  handleAddIssue,
  handleRemoveIssue,
  handleIssueKeyPress,
  currentSession,
  loading,
  confirmCloseSession,
}: WarehouseCompleteSessionModalProps) {
  if (!confirmCompleteOpen) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-0 bg-black/50 backdrop-blur-sm overflow-y-auto" style={{ bottom: 0, minHeight: '100%' }} onClick={() => setConfirmCompleteOpen(false)}>
      <div className="animate-modal-origin bg-card rounded-2xl shadow-2xl w-full max-w-4xl mx-auto flex flex-col max-h-none sm:max-h-[90vh] overflow-hidden my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <CircleCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Complete Session</h3>
              <p className="text-xs text-muted-foreground">Finalize scan log and resolve discrepancies</p>
            </div>
          </div>
          <button
            onClick={() => setConfirmCompleteOpen(false)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-3 bg-blue-500/5 border-t border-blue-500/50">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
                <Package className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <label className="text-xs font-bold text-foreground tracking-tight">Total Books Expected</label>
                  <span className="text-destructive font-bold text-xs">*</span>
                </div>
                <p className="text-[10px] text-muted-foreground">The actual physical count of books inside this box</p>
              </div>
            </div>
            <input
              type="number"
              value={totalBooksExpected}
              onChange={(e) => setTotalBooksExpected(e.target.value)}
              placeholder="e.g. 100"
              className="w-full max-w h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
            />
          </div>
          <div className="px-6 py-5 space-y-4 bg-amber-500/5 border-t border-b border-amber-500/50">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/10">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div>
                <label className="text-sm font-bold text-foreground tracking-tight">Discrepancies</label>
                <p className="text-[11px] text-muted-foreground">Log any missing books from the physical box</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={issueIsbn}
                  onChange={(e) => setIssueIsbn(e.target.value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase())}
                  onKeyPress={handleIssueKeyPress}
                  placeholder="Input missing ISBN..."
                  className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
                <button
                  onClick={handleAddIssue}
                  disabled={!issueIsbn.trim() || fetchingIssueBook}
                  className={`px-4 h-10 rounded-lg font-semibold disabled:opacity-50 transition-colors text-xs shrink-0 shadow-sm ${
                    issueType === 'missing'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {fetchingIssueBook ? 'Adding...' : 'Add Book'}
                </button>
              </div>
              {issues.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {issues.length} {issues.length === 1 ? 'issue' : 'issues'} logged
                  </p>
                  <div className="border border-border rounded-lg p-2 bg-background/50">
                    <div
                      className="space-y-1.5 max-h-48 overflow-y-auto pr-1
                        [&::-webkit-scrollbar]:w-1.5
                        [&::-webkit-scrollbar-track]:bg-transparent
                        [&::-webkit-scrollbar-thumb]:bg-amber-500/60
                        [&::-webkit-scrollbar-thumb]:rounded-full
                        [&::-webkit-scrollbar-thumb:hover]:bg-amber-500/80
                        [&::-webkit-scrollbar-button]:hidden
                        [&::-webkit-scrollbar-button]:h-0
                        [&::-webkit-scrollbar-button]:w-0"
                      style={{ scrollbarColor: 'rgba(245, 158, 11, 0.6) transparent', scrollbarWidth: 'thin' }}
                    >
                      {issues.map((issue, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors shadow-sm bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-red-500/10">
                            <PackageMinus className="h-4 w-4 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="items-center gap-2">
                              <span className="text-xs font-semibold text-foreground truncate">ISBN: {issue.isbn}</span>
                              <p className="text-[13px] font-semibold text-foreground line-clamp-1 leading-tight">{issue.title || 'Unknown Title'}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium shrink-0 bg-red-500/10 text-red-500">
                            Missing
                          </span>
                          <button
                            onClick={() => handleRemoveIssue(issue.isbn)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-muted/10 shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div><span className="font-semibold text-foreground">{totalBooksExpected || 0}</span> Expected</div>
            <div className="w-px h-3 bg-border" />
            <div><span className="font-semibold text-foreground">{currentSession?.total_scanned_books || 0}</span> Scanned</div>
            {issues.length > 0 && (
              <>
                <div className="w-px h-3 bg-border" />
                <div><span className="font-semibold text-destructive">{issues.length}</span> Issues</div>
              </>
            )}
          </div>
          <div className="flex gap-2 sm:shrink-0">
            <button onClick={() => { setConfirmCompleteOpen(false); setTotalBooksExpected(''); setIssueIsbn(''); setIssueType('missing'); setIssues([]) }} className="flex-1 sm:flex-none px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
            <button onClick={() => confirmCloseSession()} disabled={loading} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50 transition-colors shadow-sm">
              <CircleCheck className="h-4 w-4" />
              {loading ? 'Completing...' : 'Confirm Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
