'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Shown once per browser until the visitor clicks "Got it".
const STORAGE_KEY = 'ibooktrack_demo_disclaimer_ack'

export function DemoDisclaimer() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === '1') return
    } catch {
      // localStorage can be unavailable (private browsing) — show the notice anyway.
    }
    setOpen(true)
  }, [])

  const acknowledge = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Nothing we can do if storage is blocked; the notice will simply reappear.
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="gap-4 sm:max-w-md">
        <DialogHeader className="gap-2.5">
          <DialogTitle className="text-xl" style={{ fontFamily: 'Sora, sans-serif' }}>
            Quick heads up
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-gray-600">
            Everything in this demo is sample data. All the books, users, and reports you&apos;ll
            see here are just made up for demonstration — none of it is real.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            onClick={acknowledge}
            className="h-10 w-full rounded-xl bg-[#1a3460] font-bold text-white hover:bg-[#0f1e3a] sm:w-auto"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
