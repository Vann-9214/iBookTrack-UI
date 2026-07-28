'use client'

import { useEffect } from 'react'

export function ModalOriginTracker() {
  useEffect(() => {
    const trackOrigin = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element) || target.closest('[data-modal-origin-surface]') || !target.closest('button, [role="button"]')) return
      document.documentElement.style.setProperty('--modal-origin-x', `${event.clientX}px`)
      document.documentElement.style.setProperty('--modal-origin-y', `${event.clientY}px`)
    }

    window.addEventListener('pointerdown', trackOrigin, true)
    return () => window.removeEventListener('pointerdown', trackOrigin, true)
  }, [])

  return null
}
