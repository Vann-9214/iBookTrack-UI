"use client"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { fetchUserProfile } from "@/lib/auth-api"
import { Loader2 } from "lucide-react"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let mounted = true
    async function checkAuth() {
      const user = await fetchUserProfile()
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

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
