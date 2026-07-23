'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { clearTokenData } from '@/lib/auth-api'
import { toast } from 'sonner'

export function IdleTimeout() {
  const router = useRouter()
  const pathname = usePathname()
  const timeoutId = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // We only want the timeout to be active on protected routes.
    // If the user is on the login, register, or landing page, disable it.
    if (pathname === '/login' || pathname === '/register' || pathname === '/') {
      if (timeoutId.current) clearTimeout(timeoutId.current)
      return;
    }

    const logout = async () => {
      await clearTokenData()
      toast.error('Session expired', {
        description: 'You were automatically logged out after 1 hour of inactivity.',
      })
      router.push('/login')
    }

    const resetTimeout = () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current)
      }
      // 1 hour = 60 * 60 * 1000 = 3600000 ms
      timeoutId.current = setTimeout(logout, 3600000)
    }

    // Initialize the timeout
    resetTimeout()

    // Setup event listeners for user activity
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    
    // Throttle the event listener so we aren't resetting the timer 
    // constantly on every single mousemove pixel.
    let throttleTimer = false;
    const handleActivity = () => {
      if (throttleTimer) return;
      
      resetTimeout()
      
      throttleTimer = true;
      setTimeout(() => {
        throttleTimer = false;
      }, 1000); // only reset the timer at most once per second
    }

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      if (timeoutId.current) clearTimeout(timeoutId.current)
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [pathname, router])

  return null
}
