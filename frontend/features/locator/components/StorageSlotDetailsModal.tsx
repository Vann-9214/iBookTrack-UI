import React from "react"
import { MapPin, Pencil, Check, X, Plus, Clock, Loader2, Trash2, ChevronDown, ChevronRight, Package, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { StorageLocation } from "../types/locator.types"
import { useUser } from "@/hooks/use-user"
import { RoleGuard } from "@/components/role-guard"
import { getCapacityColorName, getCapacityPercentage, getPendingCount, getReservedCount } from "../utils/locator.helpers"

interface StorageSlotDetailsModalProps {
  detailSlot: StorageLocation | null
  setDetailSlot: React.Dispatch<React.SetStateAction<StorageLocation | null>>
  expandedBox: string | null
  setExpandedBox: React.Dispatch<React.SetStateAction<string | null>>
  editingCapacity: boolean
  setEditingCapacity: (val: boolean) => void
  capacityInput: string
  setCapacityInput: (val: string) => void
  savingCapacity: boolean
  handleEditCapacity: (detailSlot: StorageLocation, setDetailSlot: React.Dispatch<React.SetStateAction<StorageLocation | null>>) => Promise<void>
  openAssign: (loc: StorageLocation) => void
  selectedRemoveAssignments: Set<string>
  setSelectedRemoveAssignments: React.Dispatch<React.SetStateAction<Set<string>>>
  removingIds: Set<string>
  handleRemoveBatch: () => Promise<void>
}

export const StorageSlotDetailsModal: React.FC<StorageSlotDetailsModalProps> = ({
  detailSlot,
  setDetailSlot,
  expandedBox,
  setExpandedBox,
  editingCapacity,
  setEditingCapacity,
  capacityInput,
  setCapacityInput,
  savingCapacity,
  handleEditCapacity,
  openAssign,
  selectedRemoveAssignments,
  setSelectedRemoveAssignments,
  removingIds,
  handleRemoveBatch
}) => {
  const { user } = useUser()
  const canAction = user?.role === 'supervisor' || user?.role === 'storage'

  if (!detailSlot) return null

  const confirmedDetailAssignments = detailSlot.assignments.filter(assignment => assignment.status !== 'pending') || []
  const pendingDetailAssignments = detailSlot.assignments.filter(assignment => assignment.status === 'pending') || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setDetailSlot(null); setExpandedBox(null) }}>
      <div className={cn(
        "rounded-xl shadow-xl p-5 w-full max-w-xl mx-4 max-h-[85vh] flex flex-col",
        {
          "bg-white dark:bg-white border-2 border-red-400 dark:border-red-600": getCapacityColorName(detailSlot.used, detailSlot.capacity) === "red",
          "bg-white dark:bg-white border-2 border-amber-400 dark:border-amber-600": getCapacityColorName(detailSlot.used, detailSlot.capacity) === "amber",
          "bg-white dark:bg-white border-2 border-emerald-400 dark:border-emerald-600": getCapacityColorName(detailSlot.used, detailSlot.capacity) === "emerald",
          "bg-card border border-border": getCapacityColorName(detailSlot.used, detailSlot.capacity) === "neutral"
        }
      )} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              Rack {detailSlot.rack} — Level {detailSlot.level}
            </h3>
            {editingCapacity ? (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-xs text-muted-foreground">{detailSlot.used} used /</span>
                <input
                  type="number"
                  min={getReservedCount(detailSlot)}
                  value={capacityInput}
                  onChange={e => setCapacityInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleEditCapacity(detailSlot, setDetailSlot); if (e.key === 'Escape') setEditingCapacity(false) }}
                  className="w-16 h-6 text-xs border border-primary rounded px-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <span className="text-xs text-muted-foreground">max</span>
                <button onClick={() => handleEditCapacity(detailSlot, setDetailSlot)} disabled={savingCapacity} className="p-0.5 text-primary hover:bg-primary/10 rounded">
                  {savingCapacity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => setEditingCapacity(false)} className="p-0.5 text-muted-foreground hover:bg-muted rounded">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs text-muted-foreground">
                  {detailSlot.used} of {detailSlot.capacity} boxes used ({getCapacityPercentage(detailSlot.used, detailSlot.capacity)}%)
                  {getPendingCount(detailSlot) > 0 ? ` · ${getPendingCount(detailSlot)} pending` : ''}
                </p>
                {canAction && (
                  <button
                    onClick={() => { setCapacityInput(String(detailSlot.capacity)); setEditingCapacity(true) }}
                    className="p-0.5 text-primary bg-primary/10 border-primary/40 border hover:text-foreground hover:bg-foreground/20 hover:border-foreground/40 rounded transition-colors"
                    title="Edit capacity"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
          <button onClick={() => { setDetailSlot(null); setExpandedBox(null) }} className="text-muted-foreground hover:text-foreground text-lg leading-none ml-3">✕</button>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <Progress value={(detailSlot.used / detailSlot.capacity) * 100} className="h-2" />
        </div>

        {/* Assign button */}
        {getReservedCount(detailSlot) < detailSlot.capacity && (
          <RoleGuard allowedRoles={['storage']} action="disable">
            <button
              onClick={() => { setDetailSlot(null); openAssign(detailSlot) }}
              className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 py-2.5 text-sm text-primary font-medium transition-colors w-full"
            >
              <Plus className="h-4 w-4" />
              Assign a box to this slot
            </button>
          </RoleGuard>
        )}

        {pendingDetailAssignments.length > 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-xs font-semibold">{pendingDetailAssignments.length} box{pendingDetailAssignments.length !== 1 ? 'es are' : ' is'} pending placement</p>
              <p className="mt-0.5 text-[10px] opacity-80">Pending boxes are reserved for this location but are not shown as physically stored until confirmed.</p>
            </div>
          </div>
        )}

        {/* Box list */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          {confirmedDetailAssignments.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              {pendingDetailAssignments.length > 0 ? 'No boxes have been physically placed yet' : 'This slot is empty'}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-all"
                    checked={confirmedDetailAssignments.every(a => selectedRemoveAssignments.has(a.assignment_id))}
                    onChange={() => {
                      setSelectedRemoveAssignments(prev => {
                        const current = new Set(prev)
                        const allSelected = confirmedDetailAssignments.every(a => current.has(a.assignment_id))
                        if (allSelected) {
                          confirmedDetailAssignments.forEach(a => current.delete(a.assignment_id))
                        } else {
                          confirmedDetailAssignments.forEach(a => current.add(a.assignment_id))
                        }
                        return current
                      })
                    }}
                    className="h-4 w-4"
                  />
                  <label htmlFor="select-all" className="text-xs text-muted-foreground">
                    Select all
                  </label>
                </div>
                {selectedRemoveAssignments.size > 0 && (
                  <RoleGuard allowedRoles={['storage']} action="disable">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveBatch}
                      disabled={removingIds.size > 0}
                      className="h-8 gap-1.5"
                    >
                      {removingIds.size > 0 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Remove {selectedRemoveAssignments.size} box{selectedRemoveAssignments.size !== 1 ? 'es' : ''}
                    </Button>
                  </RoleGuard>
                )}
              </div>
              {confirmedDetailAssignments.map(a => (
                <div key={a.assignment_id} className={cn(
                  "rounded-lg border bg-muted/40 transition-colors",
                  selectedRemoveAssignments.has(a.assignment_id) ? "border-primary bg-primary/5" : "border-border"
                )}>
                  {/* Box row */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedRemoveAssignments.has(a.assignment_id)}
                      onChange={() => {
                        setSelectedRemoveAssignments(prev => {
                          const next = new Set(prev)
                          if (next.has(a.assignment_id)) next.delete(a.assignment_id)
                          else next.add(a.assignment_id)
                          return next
                        })
                      }}
                      className="h-4 w-4 shrink-0"
                    />
                    <button
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      onClick={() => setExpandedBox(expandedBox === a.assignment_id ? null : a.assignment_id)}
                    >
                      {expandedBox === a.assignment_id
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      <Package className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-semibold text-foreground truncate">{a.box_number}</span>
                      {a.lot_number && <span className="text-xs text-muted-foreground shrink-0">{a.lot_number.toLowerCase().startsWith('lot') ? a.lot_number : `Lot ${a.lot_number}`}</span>}
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        <BookOpen className="inline h-3 w-3 mr-0.5" />{a.books.length} books
                      </span>
                    </button>
                  </div>

                  {/* Expanded ISBN/title list */}
                  {expandedBox === a.assignment_id && (
                    <div className="border-t border-border px-3 pb-2 pt-1 max-h-48 overflow-y-auto">
                      {a.books.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 italic">No scanned books recorded for this box</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground border-b border-border/40">
                              <th className="text-left py-1 font-medium">ISBN</th>
                              <th className="text-left py-1 font-medium">Title</th>
                            </tr>
                          </thead>
                          <tbody>
                            {a.books.map((b, i) => (
                              <tr key={i} className="border-b border-border/20 last:border-0">
                                <td className="py-1 pr-3 text-foreground whitespace-nowrap">{b.isbn}</td>
                                <td className="py-1 text-muted-foreground truncate max-w-[200px]" title={b.title}>{b.title}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
