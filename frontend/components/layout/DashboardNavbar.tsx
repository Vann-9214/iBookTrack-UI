'use client'

import { useRouter } from 'next/navigation'
import { useBrand } from '@/hooks/use-brand'
import { ScanLine } from 'lucide-react'
import { BrandSwitcher } from './BrandSwitcher'
import { UserMenu } from './UserMenu'

export interface DashboardNavbarProps {
  disableBrandToggle?: boolean
  navigationLocked?: boolean
}

export function DashboardNavbar({ disableBrandToggle, navigationLocked }: DashboardNavbarProps = {}) {
  const router = useRouter()
  const { colors } = useBrand()

  return (
    <header
      className="relative flex h-14 shrink-0 items-center gap-2 sm:gap-4 px-3 sm:px-6 pl-14 sm:pl-16 md:pl-6 border-b border-border z-10 transition duration-200"
      style={{
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        ['--topbar-accent' as string]: colors.accent,
      }}
    >

      {/* ── Brand Switcher ───────────────────────────── */}
      <BrandSwitcher disableBrandToggle={disableBrandToggle} />

      {/* ── Scan QR button — mobile only ─────────────── */}
      <button
        onClick={() => router.push('/qr-scanner')}
        className="sm:hidden flex items-center justify-center w-8 h-8 rounded-xl border transition duration-200 hover:scale-105 active:scale-95 shrink-0"
        aria-label="Scan QR"
        style={{
          color: colors.accent,
          borderColor: `${colors.accent}25`,
          background: `${colors.accent}08`,
        }}
      >
        <ScanLine className="w-4 h-4" />
      </button>

      {/* ── Spacer ───────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── User Profile Menu ───────────────────────── */}
      <UserMenu navigationLocked={navigationLocked} />
    </header>
  )
}
