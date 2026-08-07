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
      className="relative flex h-14 shrink-0 items-center gap-2 sm:gap-4 pr-3 sm:pr-6 pl-[calc(3.5rem+env(safe-area-inset-left))] sm:pl-[calc(4rem+env(safe-area-inset-left))] 2xl:pl-[calc(1.5rem+env(safe-area-inset-left))] border-b border-border z-10 transition duration-200"
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
