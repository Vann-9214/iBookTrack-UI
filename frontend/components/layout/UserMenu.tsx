'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useBrand, type Brand } from '@/hooks/use-brand'
import { clearTokenData, fetchUserProfile } from '@/lib/auth-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Settings, LogOut, ChevronDown } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export type NavbarUser = {
  name: string
  email: string
  profilePicture?: string | null
}

const fallbackUser: NavbarUser = {
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
  return toTitleCase(localPart) || fallbackUser.name
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

const BRAND_GRADIENTS: Record<Brand, { from: string; to: string }> = {
  mustang: { from: '#2563eb', to: '#2563eb' },
  jaguar: { from: '#059669', to: '#059669' },
}

export interface UserMenuProps {
  navigationLocked?: boolean
}

export function UserMenu({ navigationLocked }: UserMenuProps) {
  const [user, setUser] = useState<NavbarUser>(fallbackUser)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const router = useRouter()
  const { brand, colors } = useBrand()

  const initials = getInitials(user.name, user.email)
  const gradient = BRAND_GRADIENTS[brand]

  useEffect(() => {
    const syncUser = async () => {
      const profile = await fetchUserProfile()
      const profilePicture = window.localStorage.getItem('ibooktrack_profile_picture')
      if (profile) {
        setUser({
          name: profile.name || fallbackUser.name,
          email: profile.email || fallbackUser.email,
          profilePicture: profilePicture
        })
      } else {
        setUser(fallbackUser)
      }
    }
    syncUser()

    const handleUpdate = () => {
      syncUser()
    }
    window.addEventListener('ibooktrack-user-updated', handleUpdate)
    return () => window.removeEventListener('ibooktrack-user-updated', handleUpdate)
  }, [])

  const handleLogout = async () => {
    await clearTokenData()
    window.sessionStorage.removeItem('from_login')
    router.push('/login')
  }

  if (navigationLocked) {
    return (
      <SessionOngoingTooltip side="bottom">
        <span className="inline-flex">
          <button
            type="button"
            aria-label="Account"
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-all duration-200 pointer-events-none opacity-50 cursor-not-allowed"
            disabled
            style={{
              border: `1px solid ${colors.accent}20`,
              background: `${colors.accent}06`,
            }}
          >
            <div className="relative">
              <Avatar className="h-7 w-7 shrink-0 relative ring-1 ring-border">
                <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
                <AvatarFallback
                  className="text-[10px] font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
              {user.name}
            </span>
          </button>
        </span>
      </SessionOngoingTooltip>
    )
  }

  return (
    <DropdownMenu modal={false} open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account"
          className={cn(
            'group flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-all duration-200',
            'hover:shadow-md active:scale-[0.97]',
          )}
          style={{
            border: `1px solid ${dropdownOpen ? colors.accent + '35' : colors.accent + '15'}`,
            background: dropdownOpen
              ? `linear-gradient(135deg, ${colors.accent}10, ${colors.accent}05)`
              : `${colors.accent}04`,
          }}
        >
          <div className="relative">
            <Avatar className="h-7 w-7 shrink-0 relative ring-1 ring-border">
              <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
              <AvatarFallback
                className="text-[10px] font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
            {user.name}
          </span>
          <ChevronDown
            className={cn(
              'hidden sm:block w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
              dropdownOpen && 'rotate-180',
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 rounded-2xl p-0 overflow-hidden border-0 shadow-xl shadow-black/10"
        onCloseAutoFocus={(event) => event.preventDefault()}
        sideOffset={12}
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div
          className="relative px-4 pt-5 pb-4 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${colors.accent}12, ${colors.accent}06, transparent)`,
          }}
        >
          <div
            className="topbar-glow absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl pointer-events-none"
            style={{ background: `${colors.accent}15` }}
          />

          <div className="relative flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-11 w-11 shrink-0 relative ring-1 ring-border">
                <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
                <AvatarFallback
                  className="text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="p-1.5">
          <DropdownMenuItem
            className="group gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-200"
            onClick={() => router.push('/settings')}
          >
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-200"
              style={{
                background: `${colors.accent}10`,
                color: colors.accent,
              }}
            >
              <Settings className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Settings</span>
              <span className="text-[11px] text-muted-foreground">Preferences & account</span>
            </div>
          </DropdownMenuItem>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-1" />

          <DropdownMenuItem
            className="group gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-200"
            onClick={handleLogout}
            variant="destructive"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white group-focus:bg-red-500 group-focus:text-white transition-colors duration-200">
              <LogOut className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Log Out</span>
              <span className="text-[11px] opacity-70">End your session</span>
            </div>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
