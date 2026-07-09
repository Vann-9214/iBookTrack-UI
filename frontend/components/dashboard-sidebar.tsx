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
  X,
  Menu,
  Scissors,
  ScanBarcode,
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
function IconCell({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center justify-center shrink-0" style={{ width: '56px' }}>
      {children}
    </span>
  )
}

// Section header for desktop rail
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

// Section header for mobile drawer
function MobileSectionLabel({ children, first = false }: { children: React.ReactNode; first?: boolean }) {
  return (
    <p className={cn('text-[9px] font-bold tracking-[0.2em] uppercase text-white/50 px-3', !first && 'mt-4')}>
      {children}
    </p>
  )
}

export function DashboardSidebar({ navigationLocked = false }: DashboardSidebarProps) {
  const [warehouseOpen, setWarehouseOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { colors } = useBrand()

  const isActive = (href: string) => pathname === href
  const isWarehouseSection = pathname === '/warehouse' || pathname === '/inventory'

  const navigate = (href: string) => {
    router.push(href)
    setMobileOpen(false)
  }

  // Desktop nav item style
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

  // Mobile nav item style
  const mobileNavItemCls = (active: boolean) => cn(
    'flex items-center gap-3 rounded-xl px-3 py-3 w-full text-sm font-semibold transition-all duration-150',
    active
      ? 'bg-white/20 text-white'
      : 'text-white/80 hover:bg-white/12 hover:text-white active:bg-white/25'
  )

  const mobileSubItemCls = (active: boolean) => cn(
    'flex items-center gap-3 rounded-lg px-3 py-2.5 w-full text-sm font-medium transition-all duration-150',
    active
      ? 'bg-white/20 text-white'
      : 'text-white/70 hover:bg-white/12 hover:text-white active:bg-white/25'
  )

  const sidebarBg = `linear-gradient(175deg, ${colors.sidebar} 0%, color-mix(in srgb, ${colors.sidebar} 82%, #000) 100%)`

  return (
    <>
      {/* ══════════════════════════════════════════════════
          DESKTOP: collapsible rail sidebar (md and above)
          ══════════════════════════════════════════════════ */}
      <aside
        className="group/sidebar hidden md:flex relative z-20 sticky top-0 shrink-0 h-dvh flex-col transition-all duration-300 ease-in-out w-[76px] hover:w-[240px] overflow-hidden"
        style={{ background: sidebarBg }}
        onMouseLeave={() => setWarehouseOpen(false)}
      >
        {/* Right edge line */}
        <div className="absolute inset-y-0 right-0 w-px bg-white/10 pointer-events-none" />

        {/* ── Logo area ── */}
        <div className="flex items-center gap-3 px-[10px] pt-4 pb-3" style={{ minHeight: '80px' }}>
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

        <div className="mx-3 h-px bg-white/10" />

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-[10px] py-3 flex flex-col gap-0.5" role="navigation" aria-label="Main navigation">
          <SectionLabel first>Main</SectionLabel>

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

          <SectionLabel>Operations</SectionLabel>

          <LockedNavButton
            navigationLocked={navigationLocked}
            onClick={() => router.push('/warehouse')}
            className={navItemCls(isActive('/warehouse'))}
            aria-current={isActive('/warehouse') ? 'page' : undefined}
            title="Warehouse"
          >
            {isActive('/warehouse') && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />}
            <IconCell><Warehouse className="h-5 w-5" /></IconCell>
            <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
              Warehouse
            </span>
          </LockedNavButton>

          <LockedNavButton
            navigationLocked={navigationLocked}
            onClick={() => router.push('/inventory')}
            className={navItemCls(isActive('/inventory'))}
            aria-current={isActive('/inventory') ? 'page' : undefined}
            title="Inventory"
          >
            {isActive('/inventory') && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />}
            <IconCell><Archive className="h-5 w-5" /></IconCell>
            <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
              Inventory
            </span>
          </LockedNavButton>

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

          <LockedNavButton
            navigationLocked={navigationLocked}
            onClick={() => router.push('/qa')}
            className={navItemCls(isActive('/qa'))}
            aria-current={isActive('/qa') ? 'page' : undefined}
            title="Endorsement"
          >
            {isActive('/qa') && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />}
            <IconCell><CheckCircle className="h-5 w-5" /></IconCell>
            <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Endorsement</span>
          </LockedNavButton>

          <LockedNavButton
            navigationLocked={navigationLocked}
            onClick={() => router.push('/cut')}
            className={navItemCls(isActive('/cut'))}
            aria-current={isActive('/cut') ? 'page' : undefined}
            title="Cut"
          >
            {isActive('/cut') && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />}
            <IconCell><Scissors className="h-5 w-5" /></IconCell>
            <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Cut</span>
          </LockedNavButton>

          <LockedNavButton
            navigationLocked={navigationLocked}
            onClick={() => router.push('/scan')}
            className={navItemCls(isActive('/scan'))}
            aria-current={isActive('/scan') ? 'page' : undefined}
            title="Scan"
          >
            {isActive('/scan') && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />}
            <IconCell><ScanBarcode className="h-5 w-5" /></IconCell>
            <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Scan</span>
          </LockedNavButton>

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

          <SectionLabel>Analytics</SectionLabel>

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

        <div className="mx-3 h-px bg-white/10 mb-2" />
        <div className="px-[10px] pb-4" />
      </aside>

      {/* ══════════════════════════════════════════════════
          MOBILE: hamburger button (shown in top-bar area)
          ══════════════════════════════════════════════════ */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 flex items-center justify-center w-9 h-9 rounded-xl shadow-lg text-white"
        style={{ background: colors.sidebar }}
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ══════════════════════════════════════════════════
          MOBILE: backdrop
          ══════════════════════════════════════════════════ */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ══════════════════════════════════════════════════
          MOBILE: slide-in drawer
          ══════════════════════════════════════════════════ */}
      <div
        className={cn(
          'md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: sidebarBg }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md shadow-black/20 w-10 h-10">
              <Image
                src="/iBookTrack_logoN.png"
                alt="iBookTrack"
                width={40}
                height={40}
                style={{ width: '40px', height: '40px', objectFit: 'contain', transform: 'scale(1.4)', pointerEvents: 'none' }}
                priority
              />
            </div>
            <div>
              <p className="leading-tight">
                <span className="text-[17px] font-black text-white tracking-tight">iBook</span>
                <span className="text-[17px] font-light text-white/60 tracking-tight">Track</span>
              </p>
              <p className="text-[9px] text-white/40 font-semibold tracking-[0.22em] uppercase">Book Management</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-4 h-px bg-white/10" />

        {/* Drawer nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5" role="navigation" aria-label="Main navigation">

          <MobileSectionLabel first>Main</MobileSectionLabel>

          <button
            onClick={() => navigate('/Dashboard')}
            disabled={navigationLocked}
            className={mobileNavItemCls(isActive('/Dashboard'))}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            Dashboard
          </button>

          <MobileSectionLabel>Operations</MobileSectionLabel>

          <button onClick={() => navigate('/warehouse')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/warehouse'))}>
            <Warehouse className="h-5 w-5 shrink-0" />
            Warehouse
          </button>

          <button onClick={() => navigate('/inventory')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/inventory'))}>
            <Archive className="h-5 w-5 shrink-0" />
            Inventory
          </button>

          <button onClick={() => navigate('/checkpoints')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/checkpoints'))}>
            <MapPin className="h-5 w-5 shrink-0" />
            Station Checkpoints
          </button>

          <button onClick={() => navigate('/qa')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/qa'))}>
            <CheckCircle className="h-5 w-5 shrink-0" />
            Endorsement
          </button>

          <button onClick={() => navigate('/cut')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/cut'))}>
            <Scissors className="h-5 w-5 shrink-0" />
            Cut
          </button>

          <button onClick={() => navigate('/scan')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/scan'))}>
            <ScanBarcode className="h-5 w-5 shrink-0" />
            Scan
          </button>

          <button onClick={() => navigate('/locator')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/locator'))}>
            <Map className="h-5 w-5 shrink-0" />
            Storage Locator
          </button>

          <MobileSectionLabel>Analytics</MobileSectionLabel>

          <button onClick={() => navigate('/transmission')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/transmission'))}>
            <Radio className="h-5 w-5 shrink-0" />
            Transmission Monitor
          </button>

          <button onClick={() => navigate('/reports')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/reports'))}>
            <BarChart3 className="h-5 w-5 shrink-0" />
            Reports
          </button>

        </nav>

        <div className="mx-4 h-px bg-white/10 mb-3" />
      </div>
    </>
  )
}
