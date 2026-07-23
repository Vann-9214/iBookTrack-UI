import React from "react"
import { Package, Clock, Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { StorageLocation } from "../types/locator.types"
import { getCapacityColor, getPendingCount } from "../utils/locator.helpers"

interface StorageSlotProps {
  rack: string
  level: number
  loc?: StorageLocation
  isHighlighted: boolean
  isSuggested: boolean
  selectedReadyBoxIdsCount: number
  provisioningSection: boolean
  onClick: () => void
}

export const StorageSlot: React.FC<StorageSlotProps> = ({
  rack,
  level,
  loc,
  isHighlighted,
  isSuggested,
  selectedReadyBoxIdsCount,
  provisioningSection,
  onClick
}) => {
  const pendingCount = loc ? getPendingCount(loc) : 0
  const used = loc?.used ?? 0
  const capacity = loc?.capacity ?? 20
  const canFitSelected = capacity - used - pendingCount >= selectedReadyBoxIdsCount

  return (
    <button
      onClick={onClick}
      disabled={!loc}
      title={loc ? `${selectedReadyBoxIdsCount > 0 && canFitSelected ? `Assign ${selectedReadyBoxIdsCount} selected box${selectedReadyBoxIdsCount !== 1 ? 'es' : ''} to ` : ''}Rack ${rack} — Level ${level} (${used}/${capacity})` : undefined}
      className={cn(
        "h-28 w-full rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
        loc ? pendingCount > 0 && used === 0 ? "bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-600" : getCapacityColor(used, capacity) : "bg-muted border-border opacity-40",
        isHighlighted && "ring-4 ring-primary ring-offset-2 ring-offset-background scale-105 z-10",
        isSuggested && "ring-4 ring-primary ring-offset-2 ring-offset-background scale-105 z-10 animate-pulse",
        loc && "hover:scale-105 hover:shadow-md cursor-pointer"
      )}
    >
      {provisioningSection && !loc ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
      ) : loc && pendingCount > 0 ? (
        <>
          <Package className="h-4 w-4 text-foreground/60" />
          <span className="text-[10px] font-semibold text-foreground/70 leading-tight">{used}/{capacity}</span>
          <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            <Clock className="h-2.5 w-2.5" />{pendingCount} pending
          </span>
        </>
      ) : loc && used > 0 ? (
        <>
          <Package className="h-4 w-4 text-foreground/60" />
          <span className="text-[10px] font-semibold text-foreground/70 leading-tight">{used}/{capacity}</span>
        </>
      ) : loc ? (
        <Plus className="h-4 w-4 text-muted-foreground/40" />
      ) : null}
    </button>
  )
}
