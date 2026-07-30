'use client'

import { Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TransmissionBrand } from '../types/transmission.types'

interface TransmissionHeaderProps {
  brand: TransmissionBrand
}

export function TransmissionHeader({ brand }: TransmissionHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          'p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5',
          brand === 'jaguar'
            ? 'bg-emerald-600'
            : 'bg-blue-600'
        )}
      >
        <Radio className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none flex items-center gap-2">
          Transmission Monitor
        </h1>
        <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
          Live scanning data from Simflex WMS for{' '}
          <span
            className={cn(
              'inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none',
              brand === 'jaguar'
                ? 'bg-emerald-600'
                : 'bg-blue-600'
            )}
          >
            {brand}
          </span>
        </p>
      </div>
    </div>
  )
}
