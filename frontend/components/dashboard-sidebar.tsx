'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
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
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [warehouseOpen, setWarehouseOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href
  const isWarehouseSection = pathname === '/warehouse-inventory' || pathname === '/inventory'

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5">
        {!collapsed && (
          <Image
            src="/iBookTrack_logo.png"
            alt="iBookTrack"
            width={140}
            height={140}
            style={{ width: '60px', height: 'auto', transform: 'scale(2.9)', transformOrigin: 'left center' }}
            priority
          />
        )}
        <button
          className={cn(
            'ml-auto h-7 w-7 shrink-0 flex items-center justify-center text-muted-foreground hover:text-sidebar-foreground transition-colors',
            collapsed && 'ml-0'
          )}
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="h-px bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1 max-h-screen" role="navigation" aria-label="Main navigation">

        {/* Dashboard */}
        <button
          onClick={() => router.push('/Dashboard')}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive('/Dashboard')
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
          aria-current={isActive('/Dashboard') ? 'page' : undefined}
          title={collapsed ? 'Dashboard' : undefined}
        >
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="truncate">Dashboard</span>}
        </button>

        {/* Warehouse & Inventory (expandable) */}
        <div>
          <button
            onClick={() => {
              if (collapsed) {
                router.push('/warehouse-inventory')
              } else {
                setWarehouseOpen((prev) => !prev)
              }
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isWarehouseSection
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
            title={collapsed ? 'Warehouse & Inventory' : undefined}
          >
            <Package className="h-5 w-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left">Warehouse & Inventory</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-200',
                    warehouseOpen && 'rotate-180'
                  )}
                />
              </>
            )}
          </button>

          {/* Sub-items */}
          {!collapsed && warehouseOpen && (
            <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-sidebar-border pl-3">
              <button
                onClick={() => router.push('/warehouse-inventory')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive('/warehouse-inventory')
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
                aria-current={isActive('/warehouse-inventory') ? 'page' : undefined}
              >
                <Warehouse className="h-4 w-4 shrink-0" />
                <span className="truncate">Warehouse</span>
              </button>
              <button
                onClick={() => router.push('/inventory')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive('/inventory')
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
                aria-current={isActive('/inventory') ? 'page' : undefined}
              >
                <Archive className="h-4 w-4 shrink-0" />
                <span className="truncate">Inventory</span>
              </button>
            </div>
          )}
        </div>

        {/* Station Checkpoints */}
        <button
          onClick={() => router.push('/checkpoints')}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive('/checkpoints')
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
          aria-current={isActive('/checkpoints') ? 'page' : undefined}
          title={collapsed ? 'Station Checkpoints' : undefined}
        >
          <MapPin className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="truncate">Station Checkpoints</span>}
        </button>

        {/* Quality Checking */}
        <button
          onClick={() => router.push('/qa')}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive('/qa')
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
          aria-current={isActive('/qa') ? 'page' : undefined}
          title={collapsed ? 'Quality Checking' : undefined}
        >
          <CheckCircle className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="truncate">Quality Checking</span>}
        </button>

        {/* Transmission Monitor */}
        <button
          onClick={() => router.push('/transmission')}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive('/transmission')
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
          aria-current={isActive('/transmission') ? 'page' : undefined}
          title={collapsed ? 'Transmission Monitor' : undefined}
        >
          <Radio className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="truncate">Transmission Monitor</span>}
        </button>

        {/* Warehouse Locator */}
        <button
          onClick={() => router.push('/locator')}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive('/locator')
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
          aria-current={isActive('/locator') ? 'page' : undefined}
          title={collapsed ? 'Warehouse Locator' : undefined}
        >
          <Map className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="truncate">Warehouse Locator</span>}
        </button>

        {/* Reports */}
        <button
          onClick={() => router.push('/reports')}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive('/reports')
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
          aria-current={isActive('/reports') ? 'page' : undefined}
          title={collapsed ? 'Reports' : undefined}
        >
          <BarChart3 className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="truncate">Reports</span>}
        </button>

      </nav>

      <div className="h-px bg-sidebar-border" />

      {/* Footer */}
      <div className="px-3 py-4">
        <button
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title={collapsed ? 'Log Out' : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  )
}
