"use client"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { fetchUserProfile, clearTokenData } from "@/lib/auth-api"
import { Loader2, ShieldAlert, Mail, LogOut } from "lucide-react"
import { PageLoader } from "@/components/ui/page-loader"
import { Button } from "@/components/ui/button"

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
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
        setUserProfile(user)
        setIsAuthenticated(true)
      }
    }
    checkAuth()
    return () => { mounted = false }
  }, [pathname, router])

  if (isAuthenticated === null) {
    return <PageLoader text="Authenticating..." />
  }

  if (!isAuthenticated) {
    return null
  }

  if (userProfile && userProfile.role === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-playfair">Account Pending Approval</h1>
          <p className="text-slate-600 text-sm">
            Your account has been created successfully, but you don't have a role assigned yet. 
            Please contact the iBookTrack administrators to grant you access to the dashboard.
          </p>
          
          <div className="bg-slate-50 rounded-lg p-4 flex flex-col space-y-3 mt-6">
            <div className="flex items-center text-sm text-slate-700">
              <Mail className="w-4 h-4 mr-2 text-slate-400" />
              <span>Contact: admin@ibooktrack.com</span>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={async () => {
                await clearTokenData()
                router.push('/login')
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
