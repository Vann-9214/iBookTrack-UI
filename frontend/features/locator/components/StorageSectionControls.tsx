import React from "react"
import { LayoutGrid, ChevronUp, ChevronDown, Trash2, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import { RoleGuard } from "@/components/role-guard"

interface StorageSectionControlsProps {
  activeSection: number
  setActiveSection: (section: number) => void
  totalSections: number
  sectionDropdownOpen: boolean
  setSectionDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>
  sectionDropdownRef: React.RefObject<HTMLDivElement | null>
  getSectionStats: (section: number) => { totalUsed: number; totalCap: number; locCount: number }
  handleRemoveSection: (section: number) => void
  removingSection: boolean
  setPendingAddSection: (val: boolean) => void
}

export const StorageSectionControls: React.FC<StorageSectionControlsProps> = ({
  activeSection,
  setActiveSection,
  totalSections,
  sectionDropdownOpen,
  setSectionDropdownOpen,
  sectionDropdownRef,
  getSectionStats,
  handleRemoveSection,
  removingSection,
  setPendingAddSection
}) => {
  const { user } = useUser()

  return (
    <div className="relative" ref={sectionDropdownRef}>
      <Button
        variant="outline"
        className="h-9 gap-2 px-3 bg-card text-foreground hover:bg-accent border border-border"
        onClick={() => setSectionDropdownOpen(o => !o)}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="text-sm">Section {activeSection}</span>
        {sectionDropdownOpen
          ? <ChevronUp className="h-3.5 w-3.5" />
          : <ChevronDown className="h-3.5 w-3.5" />}
      </Button>
      {sectionDropdownOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-30 w-64 rounded-xl border border-border bg-card shadow-lg p-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Select Section</p>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: totalSections }, (_, i) => i + 1).map(s => {
              const { totalUsed, totalCap, locCount } = getSectionStats(s)
              const pct = totalCap > 0 ? (totalUsed / totalCap) * 100 : 0
              const dotColor = locCount === 0 ? 'bg-muted-foreground/25' : pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : pct > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/25'
              return (
                <button
                  key={s}
                  onClick={() => { setActiveSection(s); setSectionDropdownOpen(false) }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 h-10 rounded-lg border text-xs font-semibold transition-all",
                    activeSection === s
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-foreground border-border hover:border-primary/60 hover:bg-muted/60"
                  )}
                >
                  <span>{s}</span>
                  <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
                </button>
              )
            })}
          </div>
          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-end py-4">
            <div className="flex items-center gap-4.5 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-emerald-500" />Active</span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-amber-500" />70–90%</span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-red-500" />&gt;90%</span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-muted-foreground/25" />Empty</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 justify-end">
            {totalSections > 1 && (
              <RoleGuard allowedRoles={['storage']} action="hide">
                <button
                  onClick={() => handleRemoveSection(totalSections)}
                  disabled={removingSection}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-destructive/50 text-[11px] font-medium text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
                  title={`Remove Section ${totalSections}`}
                >
                  {removingSection ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Remove
                </button>
              </RoleGuard>
            )}
            <RoleGuard allowedRoles={['storage']} action="hide">
              <button
                onClick={() => { setPendingAddSection(true); setSectionDropdownOpen(false) }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-primary/50 text-[11px] font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </RoleGuard>
          </div>
        </div>
      )}
    </div>
  )
}
