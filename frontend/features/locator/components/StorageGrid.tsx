import React, { useRef, useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card"
import { StorageLocatorIcon } from "@/components/dashboard-sidebar"
import { MapPin, Loader2, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { StorageLocation, ReadyBox } from "../types/locator.types"
import { StorageSectionControls } from "./StorageSectionControls"
import { StorageSlot } from "./StorageSlot"
import { useUser } from "@/hooks/use-user"
import { RoleGuard } from "@/components/role-guard"
import { getSectionRacks, getSectionLevels, getSectionStats, RACK_LETTERS } from "../utils/locator.helpers"

interface StorageGridProps {
  brand: string
  activeSection: number
  setActiveSection: (s: number) => void
  totalSections: number
  locations: StorageLocation[]
  selectedReadyBoxes: ReadyBox[]
  suggestedLocation: StorageLocation | null | undefined
  loadingLocations: boolean
  provisioningSection: boolean
  highlightedCells: Set<string>
  selectedReadyBoxIds: Set<string>
  handleAddLevel: () => Promise<void>
  handleRemoveLevel: () => Promise<void>
  handleAddRack: () => Promise<void>
  handleRemoveRack: () => Promise<void>
  handleRemoveSection: (section: number) => Promise<void>
  addingLevel: boolean
  removingLevel: boolean
  addingRack: boolean
  removingRack: boolean
  removingSection: boolean
  setPendingAddSection: (val: boolean) => void
  openAssign: (loc: StorageLocation) => void
  setDetailSlot: (loc: StorageLocation | null) => void
}

export const StorageGrid: React.FC<StorageGridProps> = ({
  brand,
  activeSection,
  setActiveSection,
  totalSections,
  locations,
  selectedReadyBoxes,
  suggestedLocation,
  loadingLocations,
  provisioningSection,
  highlightedCells,
  selectedReadyBoxIds,
  handleAddLevel,
  handleRemoveLevel,
  handleAddRack,
  handleRemoveRack,
  handleRemoveSection,
  addingLevel,
  removingLevel,
  addingRack,
  removingRack,
  removingSection,
  setPendingAddSection,
  openAssign,
  setDetailSlot
}) => {
  const { user } = useUser()

  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false)
  const sectionDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(e.target as Node)) {
        setSectionDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sectionDropdownOpen])

  const sectionRacks = getSectionRacks(locations, activeSection)
  const sectionLevels = getSectionLevels(locations, activeSection)

  const getLocation = (rack: string, level: number) =>
    locations.find(l => l.shelf === activeSection && l.rack === rack && l.level === level)

  return (
    <Card className={cn("gap-0 rounded-2xl border shadow-sm ring-1 transition-all duration-300", brand === 'jaguar'
      ? "border-emerald-200/60 ring-emerald-100/50 hover:shadow-emerald-200/50"
      : "border-blue-200/60 ring-blue-100/50 hover:shadow-blue-200/50"
    )}>
      <CardHeader className={cn("flex min-h-[72px] flex-row items-center justify-between -mt-6 mb-3 px-6 py-4 rounded-t-2xl border-b", brand === 'jaguar'
        ? "bg-emerald-600/40 border-b-emerald-200/70"
        : "bg-gradient-to-br from-blue-50 to-indigo-100/40 border-b-blue-200/70"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg", brand === 'jaguar'
            ? "bg-emerald-600 shadow-emerald-500/25"
            : "bg-blue-600 shadow-blue-500/25"
          )}>
            <StorageLocatorIcon className="h-5 w-5" />
          </div>
          <div className="flex flex-col justify-center">
            <CardTitle className="text-base">Storage Layout</CardTitle>
            {(() => {
              const { totalUsed, totalCap } = getSectionStats(locations, activeSection)
              const pct = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0
              return totalCap > 0 ? (
                <p className="hidden sm:block text-xs text-muted-foreground">{totalUsed}/{totalCap} boxes ({pct}% used)</p>
              ) : null
            })()}
          </div>
        </div>
        <CardAction className="self-center">
          <StorageSectionControls
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            totalSections={totalSections}
            sectionDropdownOpen={sectionDropdownOpen}
            setSectionDropdownOpen={setSectionDropdownOpen}
            sectionDropdownRef={sectionDropdownRef}
            getSectionStats={(s) => getSectionStats(locations, s)}
            handleRemoveSection={handleRemoveSection}
            removingSection={removingSection}
            setPendingAddSection={setPendingAddSection}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {selectedReadyBoxes.length > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
            <MapPin className="h-4 w-4 shrink-0" />
            {suggestedLocation
              ? <>Suggested for <strong>{selectedReadyBoxes.length} selected box{selectedReadyBoxes.length !== 1 ? 'es' : ''}</strong>: Rack {suggestedLocation.rack} — Level {suggestedLocation.level}. Click any available slot to assign.</>
              : <>No storage slot currently has available capacity for the selected boxes.</>}
          </div>
        )}

        {loadingLocations ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Loading storage map…</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Mobile list view (sm:hidden) */}
            <div className="sm:hidden flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
              {locations.filter(l => l.shelf === activeSection).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <p className="text-xs">No storage slots found in Section {activeSection}</p>
                </div>
              ) : (
                locations
                  .filter(l => l.shelf === activeSection)
                  .sort((a, b) => a.rack.localeCompare(b.rack) || a.level - b.level)
                  .map(loc => {
                    const used = loc.used ?? 0
                    const capacity = loc.capacity ?? 20
                    const pendingCount = loc.assignments.filter(a => a.status === 'pending').length ?? 0
                    const pct = capacity > 0 ? Math.round((used / capacity) * 100) : 0
                    const isSuggested = suggestedLocation?.id === loc.id
                    const isHighlighted = highlightedCells.has(`${loc.rack}-${loc.level}`)
                    const canFitSelected = capacity - used - pendingCount >= selectedReadyBoxIds.size

                    let badgeBg = "bg-muted text-muted-foreground border-border"
                    let badgeLabel = "Empty"
                    if (used > 0) {
                      if (pct >= 90) {
                        badgeBg = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50"
                        badgeLabel = `${pct}% full`
                      } else if (pct >= 70) {
                        badgeBg = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
                        badgeLabel = `${pct}% full`
                      } else {
                        badgeBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
                        badgeLabel = `${pct}% full`
                      }
                    }

                    return (
                      <button
                        key={loc.id || `${loc.rack}-${loc.level}`}
                        type="button"
                        onClick={() => {
                          setDetailSlot(loc)
                        }}
                        className={cn(
                          "w-full rounded-xl border p-3 text-left transition-all flex items-center justify-between gap-3",
                          isSuggested
                            ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40"
                            : isHighlighted
                              ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                              : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold shadow-xs",
                            brand === 'jaguar'
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          )}>
                            {loc.rack}{loc.level}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-foreground">
                                Rack {loc.rack} — Level {loc.level}
                              </p>
                              {isSuggested && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white uppercase tracking-wider animate-pulse">
                                  Suggested
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {used}/{capacity} boxes stored {pendingCount > 0 ? `(${pendingCount} pending)` : ''}
                            </p>
                          </div>
                        </div>

                        <span className={cn("px-2 py-1 rounded-md text-[10px] font-bold border shrink-0", badgeBg)}>
                          {badgeLabel}
                        </span>
                      </button>
                    )
                  })
              )}
            </div>

            {/* Desktop / Tablet 2D spatial grid (hidden sm:grid) */}
            <div className="hidden sm:grid grid-cols-[2rem_1px_minmax(0,1fr)_1px_2rem] items-start gap-3">
              {/* Level controls */}
              <div className="flex flex-col items-start gap-1">
                <span className="mb-1 text-left text-xs font-medium text-muted-foreground">Level</span>
                  <RoleGuard allowedRoles={['storage']} action="hide">
                    <button
                      onClick={handleAddLevel}
                      disabled={addingLevel}
                      title="Add level"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-primary shadow-sm hover:bg-primary/10 transition-colors disabled:opacity-40"
                    >
                      {addingLevel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    </button>
                  </RoleGuard>
                  <RoleGuard allowedRoles={['storage']} action="hide">
                    <button
                      onClick={handleRemoveLevel}
                      disabled={removingLevel || sectionLevels.length <= 1}
                      title={`Remove level ${Math.max(...sectionLevels)}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-destructive shadow-sm hover:bg-destructive/10 transition-colors disabled:opacity-40"
                    >
                      {removingLevel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </RoleGuard>
              </div>

              <div className="h-[5.5rem] bg-border" />

              {/* Rack headers and storage slots */}
              <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: `1em repeat(${sectionRacks.length}, minmax(0, 1fr))` }}>
                <div />
                {sectionRacks.map(r => (
                  <div key={r} className="pb-1 text-center text-sm font-semibold text-foreground">Rack {r}</div>
                ))}

                {sectionLevels.map(level => (
                  <div key={level} className="contents">
                    <div className="flex h-28 items-center justify-start pl-0 text-sm font-semibold text-foreground">{level}</div>
                    {sectionRacks.map(rack => {
                      const loc = getLocation(rack, level)
                      const isHighlighted = highlightedCells.has(`${rack}-${level}`)
                      const isSuggested = suggestedLocation?.id === loc?.id
                      const used = loc?.used ?? 0
                      const capacity = loc?.capacity ?? 20
                      const pendingCount = loc?.assignments.filter(a => a.status === 'pending').length ?? 0
                      const canFitSelected = capacity - used - pendingCount >= selectedReadyBoxIds.size
                      return (
                        <StorageSlot
                          key={`${rack}-${level}`}
                          rack={rack}
                          level={level}
                          loc={loc}
                          isHighlighted={isHighlighted}
                          isSuggested={isSuggested}
                          selectedReadyBoxIdsCount={selectedReadyBoxIds.size}
                          provisioningSection={provisioningSection}
                          onClick={() => {
                            if (!loc) return
                            if (selectedReadyBoxIds.size > 0 && canFitSelected) {
                              openAssign(loc)
                              return
                            }
                            setDetailSlot(loc)
                          }}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="h-[5.5rem] bg-border" />

              {/* Rack controls */}
              <div className="flex flex-col items-end gap-1">
                <span className="mb-1 text-right text-xs font-medium text-muted-foreground">Racks</span>
                  <RoleGuard allowedRoles={['storage']} action="hide">
                    <button
                      onClick={handleAddRack}
                      disabled={addingRack || sectionRacks.length >= RACK_LETTERS.length}
                      title="Add a new rack"
                      aria-label="Add a new rack"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-primary shadow-sm hover:bg-primary/10 transition-colors disabled:opacity-40"
                    >
                      {addingRack ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    </button>
                  </RoleGuard>
                  <RoleGuard allowedRoles={['storage']} action="hide">
                    <button
                      onClick={handleRemoveRack}
                      disabled={removingRack || sectionRacks.length <= 1}
                      title={`Remove last rack (${sectionRacks.at(-1)})`}
                      aria-label={`Remove last rack ${sectionRacks.at(-1)}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-destructive shadow-sm hover:bg-destructive/10 transition-colors disabled:opacity-40"
                    >
                      {removingRack ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </RoleGuard>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
