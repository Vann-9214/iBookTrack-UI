'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  LayoutDashboard,
  Package,
  Warehouse,
  Archive,
  MapPin,
  CheckCircle,
  Radio,
  Map,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'

type SidebarUser = {
  name: string
  email: string
}

const fallbackUser: SidebarUser = {
  name: 'User Account',
  email: 'No email available',
}

function toTitleCase(value: string) {
  return value
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function deriveNameFromEmail(email?: string) {
  if (!email) return fallbackUser.name

  const localPart = email.split('@')[0]
  const formattedName = toTitleCase(localPart)

  return formattedName || fallbackUser.name
}

function getInitials(name: string, email: string) {
  const source = name !== fallbackUser.name ? name : deriveNameFromEmail(email)
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return initials || 'UA'
}

function parseStoredUser(rawUser: string | null): SidebarUser | null {
  if (!rawUser) return null

  try {
    const parsed = JSON.parse(rawUser) as Partial<SidebarUser>
    const email = typeof parsed.email === 'string' ? parsed.email : ''
    const name = typeof parsed.name === 'string' && parsed.name.trim()
      ? parsed.name
      : deriveNameFromEmail(email)

    if (!name && !email) {
      return null
    }

    return {
      name: name || fallbackUser.name,
      email: email || fallbackUser.email,
    }
  } catch {
    return null
  }
}

function decodeTokenUser(token: string | null): SidebarUser | null {
  if (!token) return null

  try {
    const payload = token.split('.')[1]

    if (!payload) return null

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = window.atob(normalizedPayload)
    const parsed = JSON.parse(decodedPayload) as {
      email?: string
      name?: string
      full_name?: string
      user_metadata?: {
        name?: string
        full_name?: string
      }
    }

    const email = parsed.email || ''
    const name = parsed.user_metadata?.full_name || parsed.user_metadata?.name || parsed.full_name || parsed.name || deriveNameFromEmail(email)

    if (!name && !email) {
      return null
    }

    return {
      name: name || fallbackUser.name,
      email: email || fallbackUser.email,
    }
  } catch {
    return null
  }
}

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [warehouseOpen, setWarehouseOpen] = useState(false)
  const [user, setUser] = useState<SidebarUser>(fallbackUser)
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href
  const isWarehouseSection = pathname === '/warehouse-inventory' || pathname === '/inventory'
  const initials = getInitials(user.name, user.email)

  useEffect(() => {
    const storedUser = parseStoredUser(window.localStorage.getItem('ibooktrack_user'))
    const tokenUser = decodeTokenUser(window.localStorage.getItem('access_token'))

    setUser(storedUser ?? tokenUser ?? fallbackUser)
  }, [])

  const handleLogout = () => {
    window.localStorage.removeItem('access_token')
    window.localStorage.removeItem('ibooktrack_user')
    window.sessionStorage.removeItem('from_login')
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        "relative z-20 sticky top-0 shrink-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
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
            style={{ width: '60px', height: 'auto', transform: 'scale(3.5)', transformOrigin: 'left center', pointerEvents: 'none' }}
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
          className={cn(
            'mb-3 flex w-full items-center gap-3 rounded-2xl border border-sidebar-border bg-background text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
            collapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'
          )}
          title="Notifications"
          type="button"
        >
          <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
          </span>
          {!collapsed && <span>Notifications</span>}
        </button>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex w-full items-center rounded-[1.75rem] border border-sidebar-border bg-background text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
                collapsed ? 'justify-center px-0 py-3' : 'gap-4 px-4 py-4'
              )}
              title="Account"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold text-foreground">
                {initials}
              </span>

              {!collapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-sidebar-foreground">
                    {user.name}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {user.email}
                  </span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align={collapsed ? 'center' : 'end'}
            className="w-64 rounded-2xl p-2"
            onCloseAutoFocus={(event) => event.preventDefault()}
            side="top"
            sideOffset={10}
          >
            <DropdownMenuLabel className="px-3 py-2">
              <span className="block truncate text-sm font-semibold text-foreground">
                {user.name}
              </span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5" onClick={() => router.push('/settings')}>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5" onClick={handleLogout} variant="destructive">
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
