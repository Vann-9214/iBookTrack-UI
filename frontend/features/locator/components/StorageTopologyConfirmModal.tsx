import React from "react"
import { Trash2, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StorageLocation } from "../types/locator.types"
import { getSectionRacks, getSectionLevels } from "../utils/locator.helpers"

interface StorageTopologyConfirmModalProps {
  confirmRemoveSection: number | null
  setConfirmRemoveSection: (val: number | null) => void
  removingSection: boolean
  handleRemoveSection: (section: number, confirmed?: boolean) => Promise<void>
  pendingRemove: 'rack' | 'level' | null
  setPendingRemove: (val: 'rack' | 'level' | null) => void
  removingRack: boolean
  removingLevel: boolean
  handleRemoveRack: (confirmed?: boolean) => Promise<void>
  handleRemoveLevel: (confirmed?: boolean) => Promise<void>
  pendingAddSection: boolean
  setPendingAddSection: (val: boolean) => void
  totalSections: number
  setTotalSections: (val: number) => void
  setActiveSection: (val: number) => void
  locations: StorageLocation[]
  activeSection: number
}

export const StorageTopologyConfirmModal: React.FC<StorageTopologyConfirmModalProps> = ({
  confirmRemoveSection,
  setConfirmRemoveSection,
  removingSection,
  handleRemoveSection,
  pendingRemove,
  setPendingRemove,
  removingRack,
  removingLevel,
  handleRemoveRack,
  handleRemoveLevel,
  pendingAddSection,
  setPendingAddSection,
  totalSections,
  setTotalSections,
  setActiveSection,
  locations,
  activeSection
}) => {
  const sectionRacks = getSectionRacks(locations, activeSection)
  const sectionLevels = getSectionLevels(locations, activeSection)

  return (
    <>
      {/* Confirm Remove Section Modal */}
      {confirmRemoveSection !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmRemoveSection(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Remove Section {confirmRemoveSection}?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This will permanently delete all {getSectionRacks(locations, confirmRemoveSection).length * getSectionLevels(locations, confirmRemoveSection).length} slot records for Section {confirmRemoveSection}. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmRemoveSection(null)} disabled={removingSection}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={removingSection}
                onClick={() => handleRemoveSection(confirmRemoveSection, true)}
              >
                {removingSection ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Yes, Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove Rack / Level Modal */}
      {pendingRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPendingRemove(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Remove {pendingRemove === 'rack' ? `Rack ${sectionRacks.at(-1)}` : `Level ${Math.max(...sectionLevels)}`}?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This will permanently delete the {pendingRemove} and all its slot records from Section {activeSection}. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPendingRemove(null)} disabled={removingRack || removingLevel}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={removingRack || removingLevel}
                onClick={() => pendingRemove === 'rack' ? handleRemoveRack(true) : handleRemoveLevel(true)}
              >
                {removingRack || removingLevel ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Yes, Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Add Section Modal */}
      {pendingAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPendingAddSection(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Add Section {totalSections + 1}?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This will create a new section with the default rack and level layout.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPendingAddSection(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  const next = totalSections + 1
                  setTotalSections(next)
                  setActiveSection(next)
                  setPendingAddSection(false)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Yes, Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
