'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useBrand } from '@/hooks/use-brand'
import Image from 'next/image'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Archive,
  MapPin,
  CheckCircle,
  Radio,
  Map,
  BarChart3,
  ChevronDown,
} from 'lucide-react'

type DashboardSidebarProps = {
  navigationLocked?: boolean
}

function LockedNavButton({
  navigationLocked,
  tooltip = 'Session Ongoing',
  side = 'right',
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & {
  navigationLocked?: boolean
  tooltip?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  const button = (
    <button
      {...props}
      disabled={navigationLocked || props.disabled}
      className={cn(className, navigationLocked && 'pointer-events-none')}
      type={props.type ?? 'button'}
    >
      {children}
    </button>
  )

  if (!navigationLocked) {
    return button
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block w-full">{button}</span>
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={8} variant="destructive">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export function DashboardSidebar({ navigationLocked = false }: DashboardSidebarProps) {
  const [warehouseOpen, setWarehouseOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { colors } = useBrand()

  const isActive = (href: string) => pathname === href
  const isWarehouseSection = pathname === '/warehouse' || pathname === '/inventory'

  const navItemCls = (active: boolean) => cn(
    'group/item flex items-center gap-3 rounded-lg pl-6.5 pr-3 py-2.5 text-sm font-medium transition-colors w-full',
    navigationLocked && 'cursor-not-allowed opacity-50',
    active
      ? 'bg-white/20 text-white'
      : navigationLocked
        ? 'text-white/70'
        : 'text-white/70 hover:bg-white/10 hover:text-white'
  )

  return (
    <aside
      className="group/sidebar relative z-20 sticky top-0 shrink-0 flex h-screen flex-col border-white/10 transition-all duration-300 ease-in-out w-[100px] hover:w-[220px] overflow-hidden"
      style={{ backgroundColor: colors.sidebar }}
      onMouseLeave={() => setWarehouseOpen(false)}
    >
      {/* Header — logo fixed, pill expands rightward on hover */}
      <div className="relative flex items-center px-3 py-3" style={{ backgroundColor: colors.sidebar, height: '96px' }}>
        {/* Expanding white pill behind logo+title */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-300 overflow-hidden flex items-center w-[78px] group-hover/sidebar:w-[195px]" style={{ height: '78px' }}>
          {/* Invisible logo placeholder to reserve space inside pill */}
          <div style={{ width: '68px', flexShrink: 0 }} />
          {/* Title inside pill */}
          <span className="whitespace-nowrap font-bold text-xl pr-4 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 select-none">
            <span className="text-[#0058AF]">iBook</span>
            <span className="font-medium text-[#6C6E73]" style={{ fontFamily: 'var(--font-inter)' }}>Track</span>
          </span>
        </div>
        {/* Logo — fixed, never moves, floats above the pill */}
        <div className="relative z-10 shrink-0" style={{ width: '78px', height: '78px' }}>
          <Image
            src="/iBookTrack_logoN.png"
            alt="iBookTrack"
            width={78}
            height={78}
            style={{ width: '78px', height: '78px', objectFit: 'contain', pointerEvents: 'none' }}
            priority
          />
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1 max-h-screen" role="navigation" aria-label="Main navigation">

        {/* Dashboard */}
        <LockedNavButton
          navigationLocked={navigationLocked}
          onClick={() => router.push('/Dashboard')}
          className={navItemCls(isActive('/Dashboard'))}
          aria-current={isActive('/Dashboard') ? 'page' : undefined}
          title="Dashboard"
        >
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
            Dashboard
          </span>
        </LockedNavButton>

        {/* Warehouse & Inventory (expandable) */}
        <div>
          <LockedNavButton
            navigationLocked={navigationLocked}
            onClick={() => setWarehouseOpen((prev) => !prev)}
            className={navItemCls(isWarehouseSection)}
            title="Warehouse & Inventory"
          >
            <Package className="h-5 w-5 shrink-0" />
            <span className="flex-1 truncate text-left whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
              Warehouse &amp; Inventory
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-200 opacity-0 group-hover/sidebar:opacity-100',
                warehouseOpen && 'rotate-180'
              )}
            />
          </LockedNavButton>

          {/* Sub-items */}
          {warehouseOpen && (
            <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-white/20 pl-3">
              <LockedNavButton
                navigationLocked={navigationLocked}
                onClick={() => router.push('/warehouse')}
                className={navItemCls(isActive('/warehouse'))}
                aria-current={isActive('/warehouse') ? 'page' : undefined}
              >
                <Warehouse className="h-4 w-4 shrink-0" />
                <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Warehouse</span>
              </LockedNavButton>
              <LockedNavButton
                navigationLocked={navigationLocked}
                onClick={() => router.push('/inventory')}
                className={navItemCls(isActive('/inventory'))}
                aria-current={isActive('/inventory') ? 'page' : undefined}
              >
                <Archive className="h-4 w-4 shrink-0" />
                <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Inventory</span>
              </LockedNavButton>
            </div>
          )}
        </div>

        {/* Station Checkpoints */}
        <LockedNavButton
          navigationLocked={navigationLocked}
          onClick={() => router.push('/checkpoints')}
          className={navItemCls(isActive('/checkpoints'))}
          aria-current={isActive('/checkpoints') ? 'page' : undefined}
          title="Station Checkpoints"
        >
          <MapPin className="h-5 w-5 shrink-0" />
          <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Station Checkpoints</span>
        </LockedNavButton>

        {/* Book Inspection & Endorsement */}
        <LockedNavButton
          navigationLocked={navigationLocked}
          onClick={() => router.push('/qa')}
          className={navItemCls(isActive('/qa'))}
          aria-current={isActive('/qa') ? 'page' : undefined}
          title="Book Inspection & Endorsement"
        >
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Book Inspection &amp; Endorsement</span>
        </LockedNavButton>

        {/* Transmission Monitor */}
        <LockedNavButton
          navigationLocked={navigationLocked}
          onClick={() => router.push('/transmission')}
          className={navItemCls(isActive('/transmission'))}
          aria-current={isActive('/transmission') ? 'page' : undefined}
          title="Transmission Monitor"
        >
          <Radio className="h-5 w-5 shrink-0" />
          <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Transmission Monitor</span>
        </LockedNavButton>

        {/* Warehouse Locator */}
        <LockedNavButton
          navigationLocked={navigationLocked}
          onClick={() => router.push('/locator')}
          className={navItemCls(isActive('/locator'))}
          aria-current={isActive('/locator') ? 'page' : undefined}
          title="Warehouse Locator"
        >
          <Map className="h-5 w-5 shrink-0" />
          <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Storage Locator</span>
        </LockedNavButton>

        {/* Reports */}
        <LockedNavButton
          navigationLocked={navigationLocked}
          onClick={() => router.push('/reports')}
          className={navItemCls(isActive('/reports'))}
          aria-current={isActive('/reports') ? 'page' : undefined}
          title="Reports"
        >
          <BarChart3 className="h-5 w-5 shrink-0" />
          <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Reports</span>
        </LockedNavButton>

      </nav>
    </aside>
  )
}
