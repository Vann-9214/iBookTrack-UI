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
  ChevronRight,
  Settings,
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

  if (!navigationLocked) return button

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

// Fixed-width icon cell — always centered in the 76px collapsed sidebar
// (76px rail - 10px + 10px nav padding = 56px available row width, so the
// cell must be 56px, not 36px, or it centers itself within too-narrow a box)
function IconCell({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center justify-center shrink-0" style={{ width: '56px' }}>
      {children}
    </span>
  )
}

// Section header — a thin divider line when collapsed (so the reserved space
// reads as an intentional separator instead of a gap), which crossfades into
// the uppercase label once the sidebar is hovered/expanded.
function SectionLabel({ children, first = false }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div className={cn('relative h-3 mb-1 flex items-center', !first && 'mt-3')}>
      <div className="h-px w-full bg-white/10 transition-opacity duration-200 group-hover/sidebar:opacity-0" />
      <p
        className="absolute inset-0 flex items-center text-[9px] font-bold tracking-[0.2em] uppercase text-white/55 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap"
        style={{ paddingLeft: '10px' }}
      >
        {children}
      </p>
    </div>
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
    'group/item relative flex items-center gap-0 rounded-xl h-11 w-full transition-all duration-200 overflow-hidden',
    navigationLocked && 'cursor-not-allowed opacity-50',
    active
      ? 'bg-white/20 text-white shadow-sm'
      : navigationLocked
        ? 'text-white/85'
        : 'text-white/85 hover:bg-white/12 hover:text-white'
  )

  const subNavItemCls = (active: boolean) => cn(
    'group/item relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 w-full',
    navigationLocked && 'cursor-not-allowed opacity-50',
    active
      ? 'bg-white/20 text-white'
      : navigationLocked
        ? 'text-white/85'
        : 'text-white/85 hover:bg-white/12 hover:text-white'
  )

  return (
    <aside
      className="group/sidebar relative z-20 sticky top-0 shrink-0 flex h-screen flex-col transition-all duration-300 ease-in-out w-[76px] hover:w-[240px] overflow-hidden"
      style={{ background: `linear-gradient(175deg, ${colors.sidebar} 0%, color-mix(in srgb, ${colors.sidebar} 82%, #000) 100%)` }}
      onMouseLeave={() => setWarehouseOpen(false)}
    >
      {/* Right edge line */}
      <div className="absolute inset-y-0 right-0 w-px bg-white/10 pointer-events-none" />

      {/* ── Logo area ── */}
      <div className="flex items-center gap-3 px-[10px] pt-4 pb-3" style={{ minHeight: '80px' }}>
        {/* Logo box — fixed size, always at left edge */}
        <div
          className="shrink-0 flex items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md shadow-black/20"
          style={{ width: '56px', height: '56px', minWidth: '56px' }}
        >
          <Image
            src="/iBookTrack_logoN.png"
            alt="iBookTrack"
            width={56}
            height={56}
            style={{ width: '56px', height: '56px', objectFit: 'contain', transform: 'scale(1.4)', pointerEvents: 'none' }}
            priority
          />
        </div>

        {/* Brand name — fades in on hover */}
        <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
          <p className="leading-tight">
            <span className="text-[18px] font-black text-white tracking-tight">iBook</span>
            <span className="text-[18px] font-light text-white/60 tracking-tight">Track</span>
          </p>
          <p className="text-[9px] text-white/40 font-semibold tracking-[0.22em] uppercase mt-0.5">
            Book Management
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 h-px bg-white/10" />

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-[10px] py-3 flex flex-col gap-0.5" role="navigation" aria-label="Main navigation">

        {/* Section: Main */}
        <SectionLabel first>Main</SectionLabel>

        {/* Dashboard */}
        <LockedNavButton
          navigationLocked={navigationLocked}
          onClick={() => router.push('/Dashboard')}
          className={navItemCls(isActive('/Dashboard'))}
          aria-current={isActive('/Dashboard') ? 'page' : undefined}
          title="Dashboard"
        >
          {isActive('/Dashboard') && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />}
          <IconCell><LayoutDashboard className="h-5 w-5" /></IconCell>
          <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
            Dashboard
          </span>
        </LockedNavButton>

        {/* Section: Operations */}
        <SectionLabel>Operations</SectionLabel>

        {/* Warehouse & Inventory */}
        <div>
          <LockedNavButton
            navigationLocked={navigationLocked}
            onClick={() => setWarehouseOpen((prev) => !prev)}
            className={navItemCls(isWarehouseSection)}
            title="Warehouse & Inventory"
          >
            {isWarehouseSection && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />}
            <IconCell><Package className="h-5 w-5" /></IconCell>
            <span className="flex-1 text-sm font-semibold text-left truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
              Warehouse & Inventory
            </span>
            <ChevronRight className={cn(
              'h-3.5 w-3.5 shrink-0 transition-transform duration-200 opacity-0 group-hover/sidebar:opacity-60 mr-2',
              warehouseOpen && 'rotate-90'
            )} />
          </LockedNavButton>

          <div className={cn('overflow-hidden transition-all duration-200', warehouseOpen ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0')}>
            <div className="ml-5 mt-0.5 mb-0.5 flex flex-col gap-0.5 border-l border-white/15 pl-2">
              <LockedNavButton
                navigationLocked={navigationLocked}
                onClick={() => router.push('/warehouse')}
                className={subNavItemCls(isActive('/warehouse'))}
                aria-current={isActive('/warehouse') ? 'page' : undefined}
              >
                <Warehouse className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Warehouse</span>
              </LockedNavButton>
              <LockedNavButton
                navigationLocked={navigationLocked}
                onClick={() => router.push('/inventory')}
                className={subNavItemCls(isActive('/inventory'))}
                aria-current={isActive('/inventory') ? 'page' : undefined}
              >
                <Archive className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Inventory</span>
              </LockedNavButton>
            </div>
          </div>
        </div>

        {/* Station Checkpoints */}
        <LockedNavButton
          navigationLocked={navigationLocked}
          onClick={() => router.push('/checkpoints')}
          className={navItemCls(isActive('/checkpoints'))}
          aria-current={isActive('/checkpoints') ? 'page' : undefined}
          title="Station Checkpoints"
        >
          {isActive('/checkpoints') && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />}
          <IconCell><MapPin className="h-5 w-5" /></IconCell>
          <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Station Checkpoints</span>
        </LockedNavButton>

        {/* Book Inspection & Endorsement */}
        <LockedNavButton
          navigationLocked={navigationLocked}
          onClick={() => router.push('/qa')}
          className={navItemCls(isActive('/qa'))}
          aria-current={isActive('/qa') ? 'page' : undefined}
          title="Book Inspection & Endorsement"
        >
          {isActive('/qa') && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />}
          <IconCell><CheckCircle className="h-5 w-5" /></IconCell>
          <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Book Inspection &amp; Endorsement</span>
        </LockedNavButton>

        {/* Storage Locator */}
        <LockedNavButton
          navigationLocked={navigationLocked}
          onClick={() => router.push('/locator')}
          className={navItemCls(isActive('/locator'))}
          aria-current={isActive('/locator') ? 'page' : undefined}
          title="Storage Locator"
        >
          {isActive('/locator') && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />}
          <IconCell><Map className="h-5 w-5" /></IconCell>
          <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Storage Locator</span>
        </LockedNavButton>

        {/* Section: Analytics */}
        <SectionLabel>Analytics</SectionLabel>

        {/* Transmission Monitor */}
        <LockedNavButton
          navigationLocked={navigationLocked}
          onClick={() => router.push('/transmission')}
          className={navItemCls(isActive('/transmission'))}
          aria-current={isActive('/transmission') ? 'page' : undefined}
          title="Transmission Monitor"
        >
          {isActive('/transmission') && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />}
          <IconCell><Radio className="h-5 w-5" /></IconCell>
          <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Transmission Monitor</span>
        </LockedNavButton>

        {/* Reports */}
        <LockedNavButton
          navigationLocked={navigationLocked}
          onClick={() => router.push('/reports')}
          className={navItemCls(isActive('/reports'))}
          aria-current={isActive('/reports') ? 'page' : undefined}
          title="Reports"
        >
          {isActive('/reports') && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />}
          <IconCell><BarChart3 className="h-5 w-5" /></IconCell>
          <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Reports</span>
        </LockedNavButton>

      </nav>

      {/* ── Footer ── */}
      <div className="mx-3 h-px bg-white/10 mb-2" />
      <div className="px-[10px] pb-4">
        {/* Settings button removed as requested */}
      </div>
    </aside>
  )
}