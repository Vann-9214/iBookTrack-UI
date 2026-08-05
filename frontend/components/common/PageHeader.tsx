'use client'

import { useBrand } from '@/hooks/use-brand'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  subtitle?: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  rightContent?: React.ReactNode
  mobileRightContent?: React.ReactNode
}

export function PageHeader({ title, subtitle, icon: Icon, rightContent, mobileRightContent }: PageHeaderProps) {
  const { brand } = useBrand()

  return (
    <header className="relative z-10 shrink-0 w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
          <div className={cn("p-2.5 sm:p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5 shrink-0", 'bg-primary')}>
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none">
                  {title}
                </h1>
                <div className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground leading-snug">
                  {subtitle ? subtitle : (
                    <>
                      Active operations for{' '}
                      <span className={cn(
                        "inline-block align-middle ml-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none",
                        'bg-primary'
                      )}>
                        {brand}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {mobileRightContent && (
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {mobileRightContent}
                </div>
              )}
            </div>
          </div>
        </div>
        {rightContent && (
          <div className="flex items-center justify-start sm:justify-end shrink-0">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  )
}
