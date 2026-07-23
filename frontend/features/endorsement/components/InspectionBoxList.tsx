import React from 'react'
import { ClipboardCheck, Loader2, ChevronDown, ChevronRight, Package, BookOpen } from 'lucide-react'
import { BoxEntry, BoxBookEntry } from '../types/endorsement.types'

interface InspectionBoxListProps {
  loadingEndorsement: boolean
  filteredInspection: BoxEntry[]
  inspExpandedBoxId: string | null
  inspRowBooks: Record<string, BoxBookEntry[]>
  loadingInspRowBooks: string | null
  isMobile: boolean
  loadingInspSession: boolean
  toggleInspRow: (boxId: string) => void
  openConfirm: (action: 'receive' | 'start_session' | 'send_to_scan', box: BoxEntry) => void
}

export const InspectionBoxList: React.FC<InspectionBoxListProps> = ({
  loadingEndorsement,
  filteredInspection,
  inspExpandedBoxId,
  inspRowBooks,
  loadingInspRowBooks,
  isMobile,
  loadingInspSession,
  toggleInspRow,
  openConfirm,
}) => {
  return (
    <div className="flex-1 flex flex-col">
      {loadingEndorsement ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading boxes...</p>
        </div>
      ) : filteredInspection.length === 0 ? (
        <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
          <ClipboardCheck className="h-10 w-10 mb-3 text-primary" />
          <p className="font-semibold text-foreground">No boxes to inspect</p>
          <p className="text-sm">Receive boxes from the Incoming Boxes tab first.</p>
        </div>
      ) : (
        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="flex flex-col gap-2 pb-2">
              {filteredInspection.map((box) => {
                const isExpanded = inspExpandedBoxId === box.id
                const rowBooks = inspRowBooks[box.id] || []
                const isLoadingBooks = loadingInspRowBooks === box.id
                return (
                  <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 sm:gap-4">
                      {/* Top row: chevron + icon + info + date */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => toggleInspRow(box.id)}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleInspRow(box.id)}>
                          <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                          <p className="text-xs text-muted-foreground">
                            LOT: {box.lot?.lot_number || '—'} · BOOKS:{' '}
                            {box.box_sessions?.[0]?.total_scanned_books ?? box.total_expected_books ?? 0}{' '}
                            <BookOpen className="inline h-3 w-3 mr-0.5" />
                          </p>
                        </div>
                        {box.box_sessions?.[0]?.endorsement_time_received && (
                          <div className="shrink-0 hidden sm:block text-right mr-2">
                            <p className="text-xs text-muted-foreground">
                              {new Date(box.box_sessions[0].endorsement_time_received).toLocaleDateString()}
                            </p>
                            <p className="text-[10px] text-muted-foreground/80">
                              {new Date(box.box_sessions[0].endorsement_time_received).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Start Session button: desktop only */}
                      {!isMobile && (
                        <button
                          onClick={() => openConfirm('start_session', box)}
                          disabled={loadingInspSession}
                          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
                        >
                          {loadingInspSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                          {loadingInspSession ? 'Starting…' : 'Start Session'}
                        </button>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="border-t border-border px-5 py-3 bg-muted/30">
                        {isLoadingBooks ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading books…
                          </div>
                        ) : rowBooks.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">No books recorded in this box yet.</p>
                        ) : (
                          <div className="flex flex-col">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              {rowBooks.length} book{rowBooks.length !== 1 ? 's' : ''} in this box
                            </p>
                            {rowBooks.map((book, idx) => (
                              <div key={book.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-border/40 last:border-0">
                                <span className="text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>
                                <span className="font-mono text-foreground w-32 shrink-0">{book.isbn}</span>
                                <span className="flex-1 text-muted-foreground break-words">{book.title || '—'}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                                    book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {book.scan_status === 'processable'
                                    ? 'Processable'
                                    : book.flag?.issue
                                    ? `Non-Processable (${book.flag.issue})`
                                    : 'Non-Processable'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
