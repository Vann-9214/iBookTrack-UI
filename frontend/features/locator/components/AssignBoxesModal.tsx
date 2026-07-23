import React from "react"
import { Loader2, Package, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { StorageLocation, ReadyBox } from "../types/locator.types"
import { useUser } from "@/hooks/use-user"
import { RoleGuard } from "@/components/role-guard"
import { getPendingCount, getReservedCount } from "../utils/locator.helpers"

interface AssignBoxesModalProps {
  assignSlot: StorageLocation | null
  setAssignSlot: (slot: StorageLocation | null) => void
  assignLoading: boolean
  loadingReady: boolean
  readyBoxes: ReadyBox[]
  assigningBoxIds: Set<string>
  setAssigningBoxIds: React.Dispatch<React.SetStateAction<Set<string>>>
  handleAssign: () => Promise<void>
}

export const AssignBoxesModal: React.FC<AssignBoxesModalProps> = ({
  assignSlot,
  setAssignSlot,
  assignLoading,
  loadingReady,
  readyBoxes,
  assigningBoxIds,
  setAssigningBoxIds,
  handleAssign
}) => {
  const { user } = useUser()

  if (!assignSlot) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !assignLoading && setAssignSlot(null)}>
      <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-lg mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Assign Box to Slot</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rack {assignSlot.rack} — Level {assignSlot.level} &nbsp;·&nbsp; {assignSlot.used}/{assignSlot.capacity} used{getPendingCount(assignSlot) > 0 ? ` · ${getPendingCount(assignSlot)} pending` : ''}
            </p>
          </div>
          {!assignLoading && (
            <button onClick={() => setAssignSlot(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
          )}
        </div>

        {loadingReady ? (
          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading boxes ready for storage…</span>
          </div>
        ) : readyBoxes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <Package className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No boxes are waiting to be placed.</p>
            <p className="text-xs text-muted-foreground">Scan-stage boxes appear here after their transmission is completed.</p>
          </div>
        ) : (
          <>
            {(() => {
              const remainingCapacity = assignSlot ? Math.max(0, assignSlot.capacity - getReservedCount(assignSlot)) : 0
              const selectableIds = readyBoxes.slice(0, remainingCapacity).map(b => b.id)
              const maxSelectable = Math.min(remainingCapacity, readyBoxes.length)
              const allSelectableSelected = maxSelectable > 0 && assigningBoxIds.size >= maxSelectable
              const atCapacity = assigningBoxIds.size >= remainingCapacity
              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="assign-select-all"
                        checked={allSelectableSelected}
                        onChange={() => {
                          if (allSelectableSelected) {
                            setAssigningBoxIds(new Set())
                          } else {
                            setAssigningBoxIds(new Set(selectableIds))
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <label htmlFor="assign-select-all" className="text-xs text-muted-foreground">Select up to {remainingCapacity} box{remainingCapacity !== 1 ? 'es' : ''}</label>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {assigningBoxIds.size} of {readyBoxes.length} selected · {remainingCapacity} spot{remainingCapacity !== 1 ? 's' : ''} left
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-4">
                    {readyBoxes.map((b) => {
                      const disabled = !assigningBoxIds.has(b.id) && atCapacity
                      return (
                        <div
                          key={b.id}
                          onClick={() => {
                            if (disabled) return
                            setAssigningBoxIds(prev => {
                              const next = new Set(prev)
                              if (next.has(b.id)) next.delete(b.id)
                              else if (next.size < remainingCapacity) next.add(b.id)
                              return next
                            })
                          }}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                            assigningBoxIds.has(b.id)
                              ? "border-primary bg-primary/10 cursor-pointer"
                              : disabled
                                ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                                : "border-border hover:bg-muted/60 cursor-pointer"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={assigningBoxIds.has(b.id)}
                            disabled={disabled}
                            onChange={() => {
                              if (disabled) return
                              setAssigningBoxIds(prev => {
                                const next = new Set(prev)
                                if (next.has(b.id)) next.delete(b.id)
                                else if (next.size < remainingCapacity) next.add(b.id)
                                return next
                              })
                            }}
                            onClick={e => e.stopPropagation()}
                            className="h-4 w-4 shrink-0"
                          />
                          <Package className="h-4 w-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{b.box_number}</p>
                            {b.lot_number && <p className="text-xs text-muted-foreground">{b.lot_number.toLowerCase().startsWith('lot') ? b.lot_number : `Lot ${b.lot_number}`}</p>}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            <BookOpen className="inline h-3 w-3 mr-0.5" />{b.books.length} books
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            })()}
            <RoleGuard allowedRoles={['storage']} action="disable">
              <div className="pt-2 border-t border-border mt-1">
                <Button 
                  onClick={handleAssign} 
                  disabled={assigningBoxIds.size === 0 || assignLoading} 
                  className="w-full gap-2 text-sm shadow-sm hover:shadow-md transition-shadow"
                >
                  {assignLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Assign {assigningBoxIds.size} Box{assigningBoxIds.size !== 1 ? 'es' : ''} to Slot
                </Button>
              </div>
            </RoleGuard>
          </>
        )}
      </div>
    </div>
  )
}
