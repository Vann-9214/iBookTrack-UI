'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useBrand } from '@/hooks/use-brand'
import Image from 'next/image'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  LayoutDashboard, Box, Scissors, FileCheck2,
  ScanBarcode, Send, Menu, Search, PackageOpen, AlertTriangle,
  LogOut, Settings, Bell, Radio, Database, RefreshCw, Layers, ShieldCheck, BarChart3, AlertOctagon,
  FileText, Activity, AlertCircle, FileStack, BookOpenCheck,
  Warehouse, Archive, MapPin, CheckCircle, X
} from 'lucide-react'
import { PageLoader } from '@/components/ui/page-loader'
import { RoleGuard } from '@/components/role-guard'

export type DashboardSidebarProps = {
  navigationLocked?: boolean
}

export function StorageLocatorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <rect x="2" y="2" width="2.5" height="20" rx="0.5" />
      <rect x="19.5" y="2" width="2.5" height="20" rx="0.5" />
      <rect x="5" y="3" width="4" height="4" />
      <rect x="5" y="9.5" width="4" height="4" />
      <rect x="10" y="9.5" width="4" height="4" />
      <rect x="5" y="16" width="4" height="4" />
      <rect x="10" y="16" width="4" height="4" />
      <rect x="15" y="16" width="3.5" height="4" />
    </svg>
  )
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

function IconCell({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center justify-center shrink-0" style={{ width: '56px' }}>
      {children}
    </span>
  )
}

function SectionLabel({ children, first = false }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div className={cn('relative flex items-center h-5 mb-2', !first && 'mt-6')}>
      {/* Collapsed state: just a subtle glowing dot in the center */}
      <div className="absolute inset-0 flex items-center justify-center transition duration-300 group-hover/sidebar:opacity-0 group-hover/sidebar:scale-50">
        <div className="w-[3px] h-[3px] rounded-full bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
      </div>

      {/* Expanded state: Text with a beautiful fading gradient line */}
      <div className="absolute inset-0 flex items-center opacity-0 translate-x-[-10px] group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 transition duration-300 overflow-hidden" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
        <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/60 shrink-0 mr-3">
          {children}
        </p>
        <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
      </div>
    </div>
  )
}

function MobileSectionLabel({ children, first = false }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div className={cn('flex items-center px-4 mb-2 landscape:mb-3', !first && 'mt-5 landscape:mt-8')}>
      <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/60 shrink-0 mr-3">
        {children}
      </p>
      <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
    </div>
  )
}

export function DashboardSidebar({ navigationLocked = false }: DashboardSidebarProps) {
  const [, setWarehouseOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isNavigatingTo, setIsNavigatingTo] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { colors } = useBrand()

  const isActive = (href: string) => {
    if (href === '/Dashboard') return pathname === '/Dashboard'
    return pathname.startsWith(href)
  }

  useEffect(() => {
    setIsNavigatingTo(null)
  }, [pathname])

  const navigate = (href: string) => {
    if (pathname === href) {
      setMobileOpen(false)
      return
    }
    setIsNavigatingTo(href)
    router.push(href)
    setMobileOpen(false)
  }

  const navItemCls = (active: boolean) => cn(
    'group/item relative flex items-center gap-0 rounded-xl h-11 w-full transition duration-300 overflow-hidden',
    navigationLocked && 'cursor-not-allowed opacity-50',
    active
      ? 'bg-gradient-to-r from-white/30 via-white/10 to-transparent text-white ring-1 ring-white/30 shadow-[0_8px_20px_rgba(255,255,255,0.15)] backdrop-blur-xl before:absolute before:left-0 before:top-[15%] before:bottom-[15%] before:w-[4px] before:rounded-r-full before:bg-white before:shadow-[0_0_15px_rgba(255,255,255,1)]'
      : navigationLocked
        ? 'text-white/85'
        : 'text-white/70 hover:bg-gradient-to-r hover:from-white/15 hover:via-white/5 hover:to-transparent hover:text-white hover:ring-1 hover:ring-white/10 hover:shadow-md hover:backdrop-blur-md'
  )

  const mobileNavItemCls = (active: boolean) => cn(
    'relative flex items-center rounded-xl w-full transition duration-300 overflow-hidden gap-3 px-3 py-2.5 text-sm landscape:gap-4 landscape:px-4 landscape:py-3.5 landscape:text-base',
    active
      ? 'bg-gradient-to-r from-white/30 via-white/10 to-transparent text-white ring-1 ring-white/30 shadow-[0_8px_20px_rgba(255,255,255,0.15)] backdrop-blur-xl before:absolute before:left-0 before:top-[15%] before:bottom-[15%] before:w-[4px] before:rounded-r-full before:bg-white before:shadow-[0_0_15px_rgba(255,255,255,1)] font-bold'
      : 'text-white/70 hover:bg-gradient-to-r hover:from-white/15 hover:via-white/5 hover:to-transparent hover:text-white hover:ring-1 hover:ring-white/10 hover:shadow-md hover:backdrop-blur-md font-semibold'
  )

  const sidebarBg = `linear-gradient(175deg, ${colors.sidebar} 0%, color-mix(in srgb, ${colors.sidebar} 82%, #000) 100%)`

  return (
    <>
      {isNavigatingTo && <PageLoader text="Transferring..." />}

      {/* Static spacer — sidebar overlays on hover, no content reflow */}
      <div className="hidden 2xl:block shrink-0 w-[76px] h-dvh" />

      <aside
        className="peer/sidebar group/sidebar hidden 2xl:flex fixed left-0 top-0 z-40 h-dvh flex-col w-[76px] hover:w-[240px] transition-[width] duration-300 ease-in-out overflow-hidden shadow-xl shadow-black/20"
        style={{ background: sidebarBg, '--active-item-color': colors.sidebar } as React.CSSProperties}
        onMouseLeave={() => setWarehouseOpen(false)}
      >
        <div className="absolute inset-y-0 right-0 w-px bg-white/10 pointer-events-none z-10" />

        <div className="flex items-center gap-3 px-[10px] pt-4 pb-3" style={{ minHeight: '80px' }}>
          <div
            className="shrink-0 flex items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/25 ring-1 ring-white/30"
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

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-[10px] py-3 flex flex-col gap-0.5" role="navigation" aria-label="Main navigation">
          <SectionLabel first>Main</SectionLabel>

          <LockedNavButton
            navigationLocked={navigationLocked}
            onClick={() => navigate('/Dashboard')}
            className={navItemCls(isActive('/Dashboard'))}
            aria-current={isActive('/Dashboard') ? 'page' : undefined}
            title="Dashboard"
          >
            
            <IconCell><LayoutDashboard className="h-5 w-5" /></IconCell>
            <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
              Dashboard
            </span>
          </LockedNavButton>

          <SectionLabel>Operations</SectionLabel>

          <RoleGuard allowedRoles={['warehouse', 'inventory']} action="hide">
            <LockedNavButton
              navigationLocked={navigationLocked}
              onClick={() => navigate('/warehouse')}
              className={navItemCls(isActive('/warehouse'))}
              aria-current={isActive('/warehouse') ? 'page' : undefined}
              title="Warehouse"
            >
              
              <IconCell><Warehouse className="h-5 w-5" /></IconCell>
              <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                Warehouse
              </span>
            </LockedNavButton>
          </RoleGuard>

          <RoleGuard allowedRoles={['inventory']} action="hide">
            <LockedNavButton
              navigationLocked={navigationLocked}
              onClick={() => navigate('/inventory')}
              className={navItemCls(isActive('/inventory'))}
              aria-current={isActive('/inventory') ? 'page' : undefined}
              title="Inventory"
            >
              
              <IconCell><Archive className="h-5 w-5" /></IconCell>
              <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                Inventory
              </span>
            </LockedNavButton>
          </RoleGuard>

          <RoleGuard allowedRoles={['cut']} action="hide">
            <LockedNavButton
              navigationLocked={navigationLocked}
              onClick={() => navigate('/cut')}
              className={navItemCls(isActive('/cut'))}
              aria-current={isActive('/cut') ? 'page' : undefined}
              title="Cut"
            >
              
              <IconCell><Scissors className="h-5 w-5" /></IconCell>
              <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Cut</span>
            </LockedNavButton>
          </RoleGuard>

          <RoleGuard allowedRoles={['endorsement']} action="hide">
            <LockedNavButton
              navigationLocked={navigationLocked}
              onClick={() => navigate('/endorsement')}
              className={navItemCls(isActive('/endorsement'))}
              aria-current={isActive('/endorsement') ? 'page' : undefined}
              title="Endorsement"
            >
              
              <IconCell><CheckCircle className="h-5 w-5" /></IconCell>
              <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Endorsement</span>
            </LockedNavButton>
          </RoleGuard>

          <RoleGuard allowedRoles={['scan']} action="hide">
            <LockedNavButton
              navigationLocked={navigationLocked}
              onClick={() => navigate('/scan')}
              className={navItemCls(isActive('/scan'))}
              aria-current={isActive('/scan') ? 'page' : undefined}
              title="Scan"
            >
              
              <IconCell><ScanBarcode className="h-5 w-5" /></IconCell>
              <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Scan</span>
            </LockedNavButton>
          </RoleGuard>

          <LockedNavButton
            navigationLocked={navigationLocked}
            onClick={() => navigate('/checkpoints')}
            className={navItemCls(isActive('/checkpoints'))}
            aria-current={isActive('/checkpoints') ? 'page' : undefined}
            title="Station Checkpoints"
          >
            
            <IconCell><MapPin className="h-5 w-5" /></IconCell>
            <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Station Checkpoints</span>
          </LockedNavButton>

          <LockedNavButton
            navigationLocked={navigationLocked}
            onClick={() => navigate('/locator')}
            className={navItemCls(isActive('/locator'))}
            aria-current={isActive('/locator') ? 'page' : undefined}
            title="Storage Locator"
          >
            
            <IconCell><StorageLocatorIcon className="h-5 w-5" /></IconCell>
            <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Storage Locator</span>
          </LockedNavButton>

          <SectionLabel>Analytics</SectionLabel>

          <LockedNavButton
            navigationLocked={navigationLocked}
            onClick={() => navigate('/transmission')}
            className={navItemCls(isActive('/transmission'))}
            aria-current={isActive('/transmission') ? 'page' : undefined}
            title="Transmission Monitor"
          >
            
            <IconCell><Radio className="h-5 w-5" /></IconCell>
            <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Transmission Monitor</span>
          </LockedNavButton>

          <LockedNavButton
            navigationLocked={navigationLocked}
            onClick={() => navigate('/reports')}
            className={navItemCls(isActive('/reports'))}
            aria-current={isActive('/reports') ? 'page' : undefined}
            title="Reports"
          >
            
            <IconCell><BarChart3 className="h-5 w-5" /></IconCell>
            <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Reports</span>
          </LockedNavButton>

          <LockedNavButton
            navigationLocked={navigationLocked}
            onClick={() => navigate('/non-processable')}
            className={navItemCls(isActive('/non-processable'))}
            aria-current={isActive('/non-processable') ? 'page' : undefined}
            title="Non-Processable"
          >
            
            <IconCell><AlertOctagon className="h-5 w-5" /></IconCell>
            <span className="text-sm font-semibold truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Non-Processable</span>
          </LockedNavButton>
        </nav>

        <div className="mx-3 h-px bg-white/10 mb-2" />
        <div className="px-[10px] pb-4" />
      </aside>

      {/* Desktop Backdrop */}
      <div className="hidden 2xl:block fixed inset-0 z-30 bg-black/50 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300 peer-hover/sidebar:opacity-100" />

      <button
        className="2xl:hidden fixed top-3 z-50 flex items-center justify-center w-8 h-8 rounded-lg shadow-lg text-white"
        style={{ left: 'calc(0.75rem + env(safe-area-inset-left))', background: `color-mix(in srgb, ${colors.sidebar} 82%, #000)` }}
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      {mobileOpen && (
        <div
          className="2xl:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={cn(
          '2xl:hidden fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 ease-in-out',
          'w-[calc(18rem+env(safe-area-inset-left))] landscape:w-[calc(20rem+env(safe-area-inset-left))] md:landscape:w-[calc(24rem+env(safe-area-inset-left))]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ paddingLeft: 'env(safe-area-inset-left)', background: sidebarBg, '--active-item-color': colors.sidebar } as React.CSSProperties}
      >
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

        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5 landscape:gap-2 landscape:py-4" role="navigation" aria-label="Main navigation">
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

          <RoleGuard allowedRoles={['warehouse', 'inventory']} action="hide">
            <button onClick={() => navigate('/warehouse')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/warehouse'))}>
              <Warehouse className="h-5 w-5 shrink-0" />
              Warehouse
            </button>
          </RoleGuard>

          <RoleGuard allowedRoles={['inventory']} action="hide">
            <button onClick={() => navigate('/inventory')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/inventory'))}>
              <Archive className="h-5 w-5 shrink-0" />
              Inventory
            </button>
          </RoleGuard>

          <RoleGuard allowedRoles={['cut']} action="hide">
            <button onClick={() => navigate('/cut')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/cut'))}>
              <Scissors className="h-5 w-5 shrink-0" />
              Cut
            </button>
          </RoleGuard>

          <RoleGuard allowedRoles={['endorsement']} action="hide">
            <button onClick={() => navigate('/endorsement')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/endorsement'))}>
              <CheckCircle className="h-5 w-5 shrink-0" />
              Endorsement
            </button>
          </RoleGuard>

          <RoleGuard allowedRoles={['scan']} action="hide">
            <button onClick={() => navigate('/scan')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/scan'))}>
              <ScanBarcode className="h-5 w-5 shrink-0" />
              Scan
            </button>
          </RoleGuard>

          <button onClick={() => navigate('/checkpoints')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/checkpoints'))}>
            <MapPin className="h-5 w-5 shrink-0" />
            Station Checkpoints
          </button>

          <button onClick={() => navigate('/locator')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/locator'))}>
            <StorageLocatorIcon className="h-5 w-5 shrink-0" />
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

          <button onClick={() => navigate('/non-processable')} disabled={navigationLocked} className={mobileNavItemCls(isActive('/non-processable'))}>
            <AlertOctagon className="h-5 w-5 shrink-0" />
            Non-Processable
          </button>
        </nav>

        <div className="mx-4 h-px bg-white/10 mb-3" />
      </div>
    </>
  )
}
