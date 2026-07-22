import type { SimflexRow } from '../types/checkpoints.types'

interface SimflexBookRowProps {
  row: SimflexRow
}

export function SimflexBookRow({ row }: SimflexBookRowProps) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="font-mono font-bold text-foreground text-sm">{row.ISBN}</span>
          <span className="text-xs text-muted-foreground mt-1">
            Box: <span className="font-semibold text-foreground">{row.BoxNumber || 'N/A'}</span>
            {row.LotNumber && (
              <> • <span className="font-semibold text-foreground">{row.LotNumber}</span></>
            )}
            {row.ScanUser && (
              <> • User: <span className="font-semibold text-foreground">{row.ScanUser}</span></>
            )}
          </span>
          {row.Title && (
            <span className="text-xs text-muted-foreground mt-0.5 max-w-[340px] truncate" title={row.Title}>
              {row.Title}
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex flex-col items-end gap-1.5">
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
          Ongoing
        </span>
        <span className="text-[10px] text-muted-foreground font-medium">
          Simflex: {row.Status || 'Transmission_Archive ONGOING'}
        </span>
      </div>
    </div>
  )
}
