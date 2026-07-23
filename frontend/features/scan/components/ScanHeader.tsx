import { ScanBarcode } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScanHeaderProps {
  brand: string
}

export function ScanHeader({ brand }: ScanHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className={cn("p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5", brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-indigo-400 to-blue-600')}>
          <ScanBarcode className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none flex items-center gap-2">
            Scan Station
          </h1>
          <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
            Receive endorsed boxes for scanning for <span className={cn("inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none", brand === 'jaguar' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600')}>{brand}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
