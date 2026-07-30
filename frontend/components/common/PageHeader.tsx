'use client'

import { useBrand } from '@/hooks/use-brand'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  subtitle?: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  rightContent?: React.ReactNode
}

export function PageHeader({ title, subtitle, icon: Icon, rightContent }: PageHeaderProps) {
  const { brand } = useBrand()

  return (
    <div className="flex items-start gap-3 sm:gap-4 w-full">
      <div className={cn("p-2.5 sm:p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5 shrink-0", brand === 'jaguar' ? 'bg-emerald-600' : 'bg-blue-600')}>
        <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none">
              {title}
            </h1>
            <div className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
              {subtitle ? subtitle : (
                <>
                  Active operations for{' '}
                  <span className={cn(
                    "inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none",
                    brand === 'jaguar'
                      ? 'bg-emerald-600'
                      : 'bg-blue-600'
                  )}>
                    {brand}
                  </span>
                </>
              )}
            </div>
          </div>
          {rightContent && (
            <div className="shrink-0 flex items-center justify-start sm:justify-end">
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
