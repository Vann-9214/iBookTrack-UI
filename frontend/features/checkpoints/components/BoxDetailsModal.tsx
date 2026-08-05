import { Loader2, Zap, CheckCircle } from 'lucide-react'
import type {
  BoxItem,
  ScannedBook,
  SimflexCheckResult,
  SimflexStatusResult,
} from '../types/checkpoints.types'

interface BoxDetailsModalProps {
  scannedBox: { box: BoxItem; books: ScannedBook[] } | null
  loadingScannedBox: boolean
  checkingSimflexBoxId: string | null
  simflexCheckResult: SimflexCheckResult | null
  boxDetailsSimflex: Record<string, SimflexStatusResult>
  loadingBoxDetailsSimflex: boolean
  onClose: () => void
  onCheckSimflex: (box: BoxItem) => void
}

export function BoxDetailsModal({
  scannedBox,
  loadingScannedBox,
  checkingSimflexBoxId,
  simflexCheckResult,
  boxDetailsSimflex,
  loadingBoxDetailsSimflex,
  onClose,
  onCheckSimflex,
}: BoxDetailsModalProps) {
  if (!scannedBox && !loadingScannedBox) return null

  const box = scannedBox?.box
  const books = scannedBox?.books ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">{box?.box_number}</h3>
            <p className="text-xs text-muted-foreground">
              {box?.lot?.lot_number} • <span className="capitalize">{box?.current_stage}</span> • {box?.total_expected_books} books
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {box?.current_stage === 'scan' && (
          <div className="mb-3">
            <button
              onClick={() => onCheckSimflex(box)}
              disabled={checkingSimflexBoxId === box.id}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              {checkingSimflexBoxId === box.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Zap className="h-3 w-3" />
              )}
              {checkingSimflexBoxId === box.id ? 'Checking Simflex…' : 'Check Simflex'}
            </button>
            {simflexCheckResult?.boxId === box.id && (
              <div
                className={`mt-2 text-xs px-3 py-2 rounded-lg border ${
                  simflexCheckResult.success
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {simflexCheckResult.message}
              </div>
            )}
          </div>
        )}

        {loadingScannedBox ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading contents...</p>
        ) : scannedBox && books.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No scan records found for this box.</p>
        ) : (
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="text-muted-foreground border-b border-border">
                  <th className="pb-2 text-left font-medium w-6">#</th>
                  <th className="pb-2 text-left font-medium pr-3">ISBN</th>
                  <th className="pb-2 text-left font-medium pr-3">Title</th>
                  <th className="pb-2 text-left font-medium pr-3">Author</th>
                  <th className="pb-2 text-left font-medium pr-3">Status</th>
                  <th className="pb-2 text-left font-medium pr-3">Stage</th>
                  {(['scan', 'transmit', 'storage'].includes(box?.current_stage || '')) && (
                    <th className="pb-2 text-left font-medium">Simflex</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {books.map((book, i) => {
                  const simflex = book.isbn ? boxDetailsSimflex[book.isbn] : null
                  return (
                    <tr key={book.id} className="border-b border-border/40 last:border-0">
                      <td className="py-1.5 text-muted-foreground pr-2">{i + 1}</td>
                      <td className="py-1.5 pr-3">{book.isbn}</td>
                      <td className="py-1.5 pr-3 max-w-[220px] truncate text-foreground">
                        {book.title || '—'}
                      </td>
                      <td className="py-1.5 pr-3 max-w-[180px] truncate text-foreground">
                        {book.author || '—'}
                      </td>
                      <td className="py-1.5 pr-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            book.scan_status === 'processable'
                              ? 'bg-green-100 text-green-700'
                              : book.scan_status === 'non_processable'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {book.scan_status === 'processable'
                            ? 'Processable'
                            : book.scan_status === 'non_processable'
                            ? 'Non-Processable'
                            : book.scan_status}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium capitalize bg-gray-100 text-gray-700">
                          {box?.current_stage || '—'}
                        </span>
                      </td>
                      {(['scan', 'transmit', 'storage'].includes(box?.current_stage || '')) && (
                        <td className="py-1.5">
                          {book.scan_status !== 'processable' ? (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          ) : loadingBoxDetailsSimflex ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : !simflex ? (
                            <span className="text-[10px] text-muted-foreground">Not found</span>
                          ) : simflex.transmissionCompleted ? (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-green-700">
                              <CheckCircle className="h-3 w-3" /> Done
                            </span>
                          ) : simflex.latestStatus ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 truncate max-w-[140px] block">
                              {simflex.latestStatus}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Not found</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
