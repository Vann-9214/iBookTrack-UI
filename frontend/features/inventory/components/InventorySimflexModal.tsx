import { AlertTriangle, CheckCircle2, Loader2, X, XCircle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SimflexModalState } from '../types/inventory.types'

export function InventorySimflexModal({
  state,
  onClose,
  onRetry,
}: {
  state: SimflexModalState | null
  onClose: () => void
  onRetry: (box: SimflexModalState['box']) => void
}) {
  if (!state) return null
  const { box, loading, result, error } = state
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden" onClick={() => !loading && onClose()}>
      <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Simflex Transmission Check
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{box.box_number} · {box.lot?.lot_number}</p>
          </div>
          {!loading && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Checking Simflex for all ISBNs in this box...</p>
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive font-medium">{error}</p>
            <button onClick={() => onRetry(box)} className="text-xs underline text-muted-foreground">Retry</button>
          </div>
        )}
        {!loading && result && (
          <div className="flex flex-col gap-4 overflow-hidden">
            <div className={cn(
              'flex items-start gap-3 rounded-lg p-4 border',
              result.autoAdvanced ? 'bg-green-50 border-green-200' : 'bg-primary/10 border-primary/30'
            )}>
              {result.autoAdvanced ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
              <div>
                <p className={cn('text-sm font-semibold', result.autoAdvanced ? 'text-green-800' : 'text-primary')}>{result.message}</p>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Total processable: <strong>{result.totalProcessable}</strong></span>
                  <span className="text-green-700">Completed: <strong>{result.completedCount}</strong></span>
                  {result.pendingCount > 0 && <span className="text-primary">Pending: <strong>{result.pendingCount}</strong></span>}
                </div>
                {result.autoAdvanced && <p className="text-xs text-green-700 mt-1 font-medium">Box stage updated: Scan → Transmit → Storage</p>}
              </div>
            </div>
            <div className="overflow-y-auto flex-1 rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr className="text-muted-foreground">
                    <th className="pb-2 pt-2 px-3 text-left font-medium">#</th>
                    <th className="pb-2 pt-2 px-3 text-left font-medium">ISBN</th>
                    <th className="pb-2 pt-2 px-3 text-left font-medium">Simflex Box</th>
                    <th className="pb-2 pt-2 px-3 text-left font-medium">Latest Status</th>
                    <th className="pb-2 pt-2 px-3 text-center font-medium">Transmitted</th>
                  </tr>
                </thead>
                <tbody>
                  {result.simflexResults.map((r, i) => (
                    <tr key={r.isbn} className="border-b border-border/40 last:border-0">
                      <td className="py-1.5 px-3 text-muted-foreground">{i + 1}</td>
                      <td className="py-1.5 px-3 text-foreground">{r.isbn}</td>
                      <td className="py-1.5 px-3 text-muted-foreground">{r.boxNumber || '—'}</td>
                      <td className="py-1.5 px-3 text-muted-foreground max-w-[180px] truncate" title={r.latestStatus || ''}>
                        {r.latestStatus || <span className="italic">Not in Simflex</span>}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        {r.transmissionCompleted ? <CheckCircle2 className="h-4 w-4 text-primary mx-auto" /> : <XCircle className="h-4 w-4 text-primary mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
