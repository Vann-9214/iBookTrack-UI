import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Clock, CheckCircle2, Loader2, MapPin, Trash2, Package, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { PendingAssignment } from "../types/locator.types"
import { useUser } from "@/hooks/use-user"

interface PendingAssignmentListProps {
  filteredPendingAssignments: PendingAssignment[]
  loadingPending: boolean
  activeSearchQuery: string
  expandedPendingLocations: Set<string>
  setExpandedPendingLocations: React.Dispatch<React.SetStateAction<Set<string>>>
  removingIds: Set<string>
  confirmingId: string | null
  handleRemovePendingAssignments: (assignmentIds: string[], groupId?: string) => Promise<void>
  handleConfirmAssignments: (groupId: string, assignmentIds: string[]) => Promise<void>
}

export const PendingAssignmentList: React.FC<PendingAssignmentListProps> = ({
  filteredPendingAssignments,
  loadingPending,
  activeSearchQuery,
  expandedPendingLocations,
  setExpandedPendingLocations,
  removingIds,
  confirmingId,
  handleRemovePendingAssignments,
  handleConfirmAssignments
}) => {
  const pendingLocationGroups = Object.values(filteredPendingAssignments.reduce<Record<string, PendingAssignment[]>>((groups, assignment) => {
    const group = groups[assignment.location_id] || []
    group.push(assignment)
    groups[assignment.location_id] = group
    return groups
  }, {}))

  const { user } = useUser()
  const canAction = user?.role === 'supervisor' || user?.role === 'storage'

  return (
    <Card className="gap-0 h-fit max-h-[640px] rounded-2xl border border-amber-200/60 shadow-sm ring-1 ring-amber-100/50 transition-all duration-300 hover:shadow-amber-200/50">
      <CardHeader className="flex min-h-[72px] flex-row items-center justify-between -mt-6 mb-3 px-6 py-4 rounded-t-2xl border-b border-b-amber-200/70 bg-gradient-to-br from-amber-50 to-orange-100/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
            <Clock className="h-5 w-5" />
          </div>
          <CardTitle className="text-base">Pending Assignment</CardTitle>
        </div>
        <span className="inline-flex h-5 min-w-[1.25rem] self-center items-center justify-center rounded-full bg-amber-500/10 px-1.5 text-[10px] font-bold text-amber-600">
          {filteredPendingAssignments.length}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {loadingPending ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading pending assignments…</span>
          </div>
        ) : filteredPendingAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground">
            <CheckCircle2 className="h-7 w-7 opacity-30" />
            <p className="text-xs">{activeSearchQuery ? 'No matching pending boxes' : 'No pending assignments'}</p>
            <p className="text-[10px] max-w-[200px]">{activeSearchQuery ? 'Try a different full ISBN, Box [number], or Lot [number].' : 'Assigned boxes awaiting physical placement confirmation will appear here.'}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto -mr-1 pr-1 space-y-2 min-h-0">
            {pendingLocationGroups.map(assignments => {
              const location = assignments[0]
              const groupId = location.location_id
              const assignmentIds = assignments.map(assignment => assignment.assignment_id)
              const isExpanded = expandedPendingLocations.has(groupId)
              const isRemoving = assignmentIds.some(id => removingIds.has(id))
              const isConfirming = confirmingId === groupId
              return (
                <div key={groupId} className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
                  <div className={cn("flex items-center gap-1 rounded-md border border-transparent p-2", activeSearchQuery && !isExpanded && "border-primary bg-primary/5 ring-2 ring-primary/30")}>
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-amber-100/70 dark:hover:bg-amber-900/30"
                      onClick={() => setExpandedPendingLocations(prev => {
                        const next = new Set(prev)
                        if (next.has(groupId)) next.delete(groupId)
                        else next.add(groupId)
                        return next
                      })}
                      aria-expanded={isExpanded}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span className="truncate text-xs font-semibold text-foreground">Rack {location.rack} - Level {location.level}</span>
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-200/70 px-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/60 dark:text-amber-200">{assignments.length}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                    {canAction && (
                      <>
                        <button
                          type="button"
                          title="Remove all boxes from this location"
                          aria-label={`Remove ${assignments.length} pending boxes from Rack ${location.rack}, Level ${location.level}`}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-destructive shadow-sm hover:bg-destructive/10 disabled:opacity-40"
                          disabled={isRemoving || isConfirming}
                          onClick={() => handleRemovePendingAssignments(assignmentIds, groupId)}
                        >
                          {isRemoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          title="Confirm all boxes at this location"
                          aria-label={`Confirm ${assignments.length} pending boxes at Rack ${location.rack}, Level ${location.level}`}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-40"
                          disabled={isConfirming || isRemoving}
                          onClick={() => handleConfirmAssignments(groupId, assignmentIds)}
                        >
                          {isConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                      </>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="space-y-1 border-t border-amber-200 px-3 py-2 dark:border-amber-800">
                      {assignments.map(assignment => (
                        <div key={assignment.assignment_id} className={cn("flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2", activeSearchQuery && "border-primary bg-primary/5 ring-2 ring-primary/30")}>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
                            <Package className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">BOX: {assignment.box_number}</p>
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                              {assignment.lot_number && <span className="truncate">LOT: {assignment.lot_number}</span>}
                              {assignment.lot_number && <span>•</span>}
                              <span className="whitespace-nowrap">BOOKS: {assignment.total_books}</span>
                            </div>
                          </div>
                          {canAction && (
                            <div className="flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                title={`Remove box ${assignment.box_number}`}
                                aria-label={`Remove pending box ${assignment.box_number}`}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                                disabled={removingIds.has(assignment.assignment_id) || confirmingId === assignment.assignment_id}
                                onClick={() => handleRemovePendingAssignments([assignment.assignment_id])}
                              >
                                {removingIds.has(assignment.assignment_id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </button>
                              <button
                                type="button"
                                title={`Confirm box ${assignment.box_number}`}
                                aria-label={`Confirm pending box ${assignment.box_number}`}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-40"
                                disabled={confirmingId === assignment.assignment_id || removingIds.has(assignment.assignment_id)}
                                onClick={() => handleConfirmAssignments(assignment.assignment_id, [assignment.assignment_id])}
                              >
                                {confirmingId === assignment.assignment_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
