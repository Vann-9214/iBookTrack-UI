import React from "react"

export const StorageLegend: React.FC = () => {
  return (
    <div className="flex items-center gap-5 text-xs text-muted-foreground flex-wrap justify-center">
      <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-emerald-400 bg-emerald-100" /><span>&lt; 70% full</span></div>
      <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-amber-400 bg-amber-100" /><span>70–90% full</span></div>
      <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-red-400 bg-red-100" /><span>&gt; 90% full</span></div>
      <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-border bg-muted" /><span>Empty</span></div>
    </div>
  )
}
