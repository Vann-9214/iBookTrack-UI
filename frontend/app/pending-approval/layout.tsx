'use client'

import { useProtectedRoute } from '@/features/authentication/hooks/useProtectedRoute'
import { PageLoader } from '@/components/ui/page-loader'
import { useUser } from '@/hooks/use-user'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PendingApprovalLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useProtectedRoute()
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    // If the user already has a role, redirect them to the dashboard
    if (user && user.role) {
      router.replace('/Dashboard')
    }
  }, [user, router])

  if (isAuthenticated === null || isLoading) {
    return <PageLoader text="Loading..." />
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
