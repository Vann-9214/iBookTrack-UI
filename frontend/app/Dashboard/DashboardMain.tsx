'use client'

import { useEffect, useRef } from 'react'

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (sessionStorage.getItem('from_login') === '1') {
      sessionStorage.removeItem('from_login')
      ref.current?.animate(
        [
          { opacity: 0, transform: 'translateY(14px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 400, easing: 'ease', fill: 'both' }
      )
    }
  }, [])

  return (
    <main ref={ref} className="flex-1 flex flex-col overflow-hidden">
      {children}
    </main>
  )
}
