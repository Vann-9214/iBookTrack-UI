import { cn } from '@/lib/utils'

interface PipelineLegendProps {
  brand: string
}

export function PipelineLegend({ brand }: PipelineLegendProps) {
  return (
    <div className="flex items-center gap-4 text-xs mt-4 px-2">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            brand === 'jaguar' ? 'bg-primary' : 'bg-primary'
          )}
        />
        <span className="text-xs text-muted-foreground">
          Active <span className="hidden sm:inline">(Moving normally)</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-orange-500" />
        <span className="text-xs text-muted-foreground">
          Delayed <span className="hidden sm:inline">(Stuck &gt; 24h)</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-gray-400" />
        <span className="text-xs text-muted-foreground">Idle</span>
      </div>
    </div>
  )
}
