import React from 'react'
import { Send, ChevronDown, ChevronRight, Package, BookOpen, Loader2 } from 'lucide-react'
import { BoxEntry, BoxBookEntry } from '../types/endorsement.types'

interface OutgoingBoxesProps {
  filteredOutgoing: BoxEntry[]
  expandedBoxId: string | null
  boxBooks: Record<string, BoxBookEntry[]>
  loadingBoxBooks: string | null
  sendingToScan: string | null
  toggleBox: (boxId: string) => void
  openConfirm: (action: 'receive' | 'start_session' | 'send_to_scan', box: BoxEntry) => void
}

export const OutgoingBoxes: React.FC<OutgoingBoxesProps> = ({
  filteredOutgoing,
  expandedBoxId,
  boxBooks,
  loadingBoxBooks,
  sendingToScan,
  toggleBox,
  openConfirm,
}) => {
  return (
    <div className="flex-1 flex flex-col">
      {filteredOutgoing.length === 0 ? (
        <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
          <Send className="h-10 w-10 mb-3 text-primary" />
          <p className="font-semibold text-foreground">No outgoing boxes yet</p>
          <p className="text-sm">Complete an inspection session in the Book Inspection tab to add boxes here.</p>
        </div>
      ) : (
        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="flex flex-col gap-2 pb-2">
              {filteredOutgoing.map((box) => {
                const isExpanded = expandedBoxId === box.id
                const rowBooks = boxBooks[box.id] || []
                const isLoadingBooks = loadingBoxBooks === box.id
                const bookCount = box.box_sessions?.[0]?.total_scanned_books ?? box.total_expected_books ?? 0
                return (
                  <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 sm:gap-4">
                      {/* Top row: chevron + icon + info + date */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => toggleBox(box.id)}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleBox(box.id)}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Endorsed</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            LOT: {box.lot?.lot_number || '—'} · BOOKS: {bookCount}{' '}
                            <BookOpen className="inline h-3 w-3 mr-0.5" />
                          </p>
                        </div>
                        {(box.latest_endorsement_scan_at || box.box_sessions?.[0]?.updated_at) && (
                          <div className="shrink-0 hidden sm:flex flex-col items-end gap-0.5 mr-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                box.latest_endorsement_scan_at || (box.box_sessions?.[0]?.updated_at as string)
                              ).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-muted-foreground/80">
                              {new Date(
                                box.latest_endorsement_scan_at || (box.box_sessions?.[0]?.updated_at as string)
                              ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Send button: full-width on mobile, always visible */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openConfirm('send_to_scan', box)
                        }}
                        disabled={sendingToScan === box.id}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
                      >
                        {sendingToScan === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {sendingToScan === box.id ? 'Sending…' : 'Send to Scan'}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-border px-5 py-3 bg-muted/30 max-h-[300px] overflow-y-auto">
                        {isLoadingBooks ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading books…
                          </div>
                        ) : rowBooks.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">No books recorded in this box yet.</p>
                        ) : (
                          <div className="flex flex-col gap-1 border-l-2 border-primary/30 pl-3">
                            {rowBooks.map((book) => (
                              <div key={book.id} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-foreground">{book.isbn}</span>
                                  {book.title && <span className="text-[10px] text-muted-foreground break-words">{book.title}</span>}
                                </div>
                                <div className="flex gap-2 items-center">
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                      book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {book.scan_status === 'processable' ? 'Processable' : 'Non-Processable'}
                                  </span>
                                </div>
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
