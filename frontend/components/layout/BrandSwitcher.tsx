'use client'

import { useBrand, BRAND_COLORS, type Brand } from '@/hooks/use-brand'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Zap, Leaf } from 'lucide-react'

const BRAND_ICONS: Record<Brand, typeof Zap> = {
  mustang: Zap,
  jaguar: Leaf,
}

const BRAND_GRADIENTS: Record<Brand, { from: string; to: string }> = {
  mustang: { from: '#2563eb', to: '#2563eb' },
  jaguar: { from: '#059669', to: '#059669' },
}

function SessionOngoingTooltip({
  children,
  side = 'bottom',
}: {
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={8} variant="destructive">
        Session Ongoing
      </TooltipContent>
    </Tooltip>
  )
}

export interface BrandSwitcherProps {
  disableBrandToggle?: boolean
}

export function BrandSwitcher({ disableBrandToggle }: BrandSwitcherProps) {
  const { brand, setBrand, colors } = useBrand()
  const gradient = BRAND_GRADIENTS[brand]

  return (
    <div
      className="relative flex items-center rounded-lg p-0.5 gap-0.5 shrink-0"
      style={{
        background: `linear-gradient(135deg, ${colors.accent}08, ${colors.accent}04)`,
        border: `1px solid ${colors.accent}15`,
      }}
    >
      {/* Background Pill */}
      <div
        className="absolute top-0.5 bottom-0.5 rounded-md pointer-events-none sm:transition sm:duration-300 sm:ease-out shadow-sm premium-gradient-ui-card--solid"
        style={{
          width: 'calc(50% - 3px)',
          left: brand === 'mustang' ? '2px' : 'calc(50% + 1px)',
        }}
      />

      {(['mustang', 'jaguar'] as Brand[]).map((b) => {
        const isSelected = brand === b
        const Icon = BRAND_ICONS[b]

        const buttonContent = (
          <button
            key={b}
            onClick={() => !disableBrandToggle && setBrand(b)}
            disabled={disableBrandToggle}
            className={cn(
              'relative z-10 flex w-full items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold leading-none rounded-md capitalize select-none sm:transition-colors sm:duration-300',
              isSelected
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-700',
              disableBrandToggle && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {BRAND_COLORS[b].label}
          </button>
        )

        return disableBrandToggle ? (
          <SessionOngoingTooltip key={b} side="bottom">
            <span className="relative z-10 flex flex-1">{buttonContent}</span>
          </SessionOngoingTooltip>
        ) : (
          <span key={b} className="relative z-10 flex flex-1">
            {buttonContent}
          </span>
        )
      })}
    </div>
  )
}
