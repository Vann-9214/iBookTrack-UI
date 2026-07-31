import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { AlertOctagon, CheckCircle2, FileWarning, PackageX, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QCFlag, SelectedCategory } from '../types'
import { getTone, ISSUE_LABELS } from '../utils/constants'

interface NonProcessableModalsProps {
  selectedCategory: SelectedCategory
  setSelectedCategory: (cat: SelectedCategory) => void
  displayFlags: QCFlag[]
  loading: boolean
  isJaguar: boolean
  flagToResolve: QCFlag | null
  setFlagToResolve: (flag: QCFlag | null) => void
  resolveFlag: () => void
  resolvingId: number | null
}

export function NonProcessableModals({
  selectedCategory,
  setSelectedCategory,
  displayFlags,
  loading,
  isJaguar,
  flagToResolve,
  setFlagToResolve,
  resolveFlag,
  resolvingId
}: NonProcessableModalsProps) {
  const [modalPage, setModalPage] = useState(1)
  const [isClosing, setIsClosing] = useState(false)
  const [isResolvingClosing, setIsResolvingClosing] = useState(false)

  useEffect(() => {
    setModalPage(1)
  }, [selectedCategory])

  const TONE = getTone(isJaguar)
  const activeTone = selectedCategory === 'Total' ? TONE.red : TONE.theme

  const dismissModal = () => {
    if (isClosing) return
    setIsClosing(true)
    setTimeout(() => {
      setSelectedCategory(null)
      setIsClosing(false)
    }, 340)
  }

  const dismissResolveModal = () => {
    if (isResolvingClosing) return
    setIsResolvingClosing(true)
    setTimeout(() => {
      setFlagToResolve(null)
      setIsResolvingClosing(false)
    }, 340)
  }

  return (
    <>
      {/* QC Flagged Books Modal */}
      {selectedCategory && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4", isClosing ? 'animate-overlay-out' : 'animate-overlay-in')} onClick={dismissModal}>
          <div className={cn("bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden ring-1 ring-black/5", isClosing ? 'animate-modal-origin-out' : 'animate-modal-origin')} data-modal-origin-surface onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className={cn("px-6 py-5 flex items-center justify-between", activeTone.modalBg)}>
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg", activeTone.modalIcon)}>
                  {selectedCategory === 'Damage' ? <FileWarning className="h-5 w-5" /> :
                   selectedCategory === 'Mismatch' ? <PackageX className="h-5 w-5" /> :
                   selectedCategory === 'Resolved' ? <CheckCircle2 className="h-5 w-5" /> :
                   <AlertOctagon className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-gray-800">
                    {selectedCategory === 'Total' ? 'Non-Processable Books' : `${selectedCategory} Issues`}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn("h-2 w-2 rounded-full", activeTone.modalDot)} />
                    <span className="text-xs text-gray-500">Needs review</span>
                  </div>
                </div>
              </div>
              <button
                onClick={dismissModal}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 hover:bg-white text-gray-500 hover:text-gray-800 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Loading flagged books...</span>
              </div>
            ) : displayFlags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg", activeTone.modalIcon)}>
                  {selectedCategory === 'Damage' ? <FileWarning className="h-7 w-7" /> :
                   selectedCategory === 'Mismatch' ? <PackageX className="h-7 w-7" /> :
                   selectedCategory === 'Resolved' ? <CheckCircle2 className="h-7 w-7" /> :
                   <AlertOctagon className="h-7 w-7" />}
                </div>
                <span className="text-sm font-semibold text-gray-600">No flagged books</span>
                <span className="text-xs text-gray-400">Everything looks clean for this category</span>
              </div>
            ) : (
              <div className={cn("overflow-y-auto px-3 pb-2", displayFlags.length > 11 ? "max-h-[34rem]" : "")}>
                <table className="w-full text-sm table-fixed border-separate border-spacing-y-1">
                  <colgroup>
                    <col className="w-10" />
                    <col className="w-32" />
                    <col className="w-auto" />
                    <col className="w-32" />
                    <col className="w-48" />
                    <col className="w-48" />
                  </colgroup>
                  <thead className="sticky top-0 bg-white z-10 shadow-[0_-12px_0_0_white]">
                    <tr>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">#</th>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">ISBN</th>
                      <th className="hidden sm:table-cell text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Lot &amp; Box</th>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Issue</th>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Flagged By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayFlags.slice((modalPage - 1) * 20, modalPage * 20).map((f, i) => (
                      <tr key={`${f.scan_id}-${i}`} className={cn("bg-gray-50/60 transition-colors align-middle [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl", selectedCategory === 'Total' ? 'hover:bg-red-50/50' : isJaguar ? 'hover:bg-emerald-50/50' : 'hover:bg-blue-50/50')}>
                        <td className="py-2 px-3 text-xs font-medium text-gray-400 align-middle">{(modalPage - 1) * 20 + i + 1}</td>
                        <td className="py-2 px-3 font-mono text-xs font-semibold text-gray-800 truncate align-middle">{f.isbn}</td>
                        <td className="hidden sm:table-cell py-2 px-3 text-gray-600 truncate align-middle">{f.title || '—'}</td>
                        <td className="text-xs px-3 py-2 align-middle whitespace-nowrap">
                          <span className="font-bold text-gray-800">{f.assigned_box?.lot?.lot_number || '—'}</span>
                          {f.assigned_box?.box_number && (
                            <span className="ml-1.5 font-mono text-gray-400">{f.assigned_box.box_number}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ring-1", selectedCategory === 'Total' ? 'bg-red-100 text-red-700 ring-red-200/60' : isJaguar ? 'bg-emerald-100 text-emerald-700 ring-emerald-200/60' : 'bg-blue-100 text-blue-700 ring-blue-200/60')}>
                              {ISSUE_LABELS[f.issue] || f.issue}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <div className="flex items-center justify-between min-w-0">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase ring-1", selectedCategory === 'Total' ? 'bg-red-100 text-red-600 ring-red-200/60' : isJaguar ? 'bg-emerald-100 text-emerald-600 ring-emerald-200/60' : 'bg-blue-100 text-blue-600 ring-blue-200/60')}>
                                {(f.flagged_by_name || '—').split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('') || '?'}
                              </span>
                              <span className="truncate text-gray-700 font-medium">{f.flagged_by_name || '—'}</span>
                            </div>
                            {f.flagged_at && (
                              <span className="text-[10px] text-gray-400 whitespace-nowrap hidden md:block">
                                {new Date(f.flagged_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="border-t border-gray-100 px-6 py-3 text-xs text-gray-500 font-medium shrink-0 flex items-center justify-between bg-gray-50/50">
              <span>Showing {Math.min(displayFlags.length, (modalPage - 1) * 20 + (displayFlags.length > 0 ? 1 : 0))} - {Math.min(displayFlags.length, modalPage * 20)} of {displayFlags.length} items</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setModalPage(p => Math.max(1, p - 1))}
                  disabled={modalPage === 1}
                  className="px-2.5 py-1 bg-white border rounded shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                >
                  Prev
                </button>
                <span className="font-semibold px-2">{modalPage}</span>
                <button 
                  onClick={() => setModalPage(p => Math.min(Math.ceil(displayFlags.length / 20), p + 1))}
                  disabled={modalPage >= Math.ceil(displayFlags.length / 20) || displayFlags.length === 0}
                  className="px-2.5 py-1 bg-white border rounded shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* Resolve Confirmation Modal */}
      {flagToResolve && (
        <div className={cn("fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4", isResolvingClosing ? 'animate-overlay-out' : 'animate-overlay-in')} onClick={dismissResolveModal}>
          <div className={cn("bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden", isResolvingClosing ? 'animate-modal-origin-out' : 'animate-modal-origin')} data-modal-origin-surface onClick={e => e.stopPropagation()}>
            <div className={cn("px-6 py-5 flex items-center gap-3", activeTone.modalBg)}>
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg", activeTone.modalIcon)}>
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-gray-800">Resolve Issue</h3>
                <p className="text-xs text-gray-500 font-medium">ISBN: {flagToResolve.isbn || 'Unknown'}</p>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                Are you sure you want to mark this item as resolved? It will be removed from the Non-Processable queue.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-gray-500">Box Number:</div>
                  <div className="font-medium text-gray-800 text-right">{flagToResolve.assigned_box?.box_number || '-'}</div>
                  <div className="text-gray-500">Issue Type:</div>
                  <div className="font-medium text-gray-800 text-right">{ISSUE_LABELS[flagToResolve.issue] || flagToResolve.issue}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3">
                <button onClick={dismissResolveModal} className="h-10 px-5 rounded-xl text-gray-600 hover:text-gray-800 font-semibold border" disabled={resolvingId === flagToResolve.scan_id}>
                  Cancel
                </button>
                <Button 
                  onClick={resolveFlag} 
                  disabled={resolvingId === flagToResolve.scan_id}
                  className={cn("h-10 px-6 rounded-xl text-white font-semibold shadow-sm transition-all", isJaguar ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700")}
                >
                  {resolvingId === flagToResolve.scan_id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  {resolvingId === flagToResolve.scan_id ? 'Resolving...' : 'Confirm Resolve'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
