'use client'

import React from 'react'
import { Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TransmissionBrand } from '../types/transmission.types'
import { PageHeader } from '@/components/common/PageHeader'

interface TransmissionHeaderProps {
  brand: TransmissionBrand
  mobileRightContent?: React.ReactNode
}

export function TransmissionHeader({ brand, mobileRightContent }: TransmissionHeaderProps) {
  return (
    <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full xl:w-auto">
      <div
        className={cn(
          'p-2.5 sm:p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5 shrink-0',
          'bg-primary'
        )}
      >
        <Radio className="h-7 w-7" />
      </div>
      <div className="flex-1 flex items-start justify-between min-w-0 sm:pr-[340px] xl:pr-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none flex items-center gap-2">
            Transmission Monitor
          </h1>
          <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground leading-snug">
            Live scanning data from Simflex WMS for{' '}
            <span
              className={cn(
                'inline-block align-middle ml-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none',
                'bg-primary'
              )}
            >
              {brand}
            </span>
          </p>
        </div>
        {mobileRightContent && (
          <div className="flex items-center shrink-0 ml-3 xl:hidden">
            {mobileRightContent}
          </div>
        )}
      </div>
    </div>
  )
}
