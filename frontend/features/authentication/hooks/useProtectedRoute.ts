'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getCurrentUser } from '../services/auth.service'

export function useProtectedRoute() {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    async function checkAuth() {
      const user = await getCurrentUser()
      if (!mounted) return
      if (!user) {
        setIsAuthenticated(false)
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
      } else {
        setIsAuthenticated(true)
      }
    }
    checkAuth()
    return () => { mounted = false }
  }, [pathname, router])

  return isAuthenticated
}
