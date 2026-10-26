'use client'

import { useEffect, useRef, useState } from 'react'

/** Restore a local working session before the first persistence write. */
export function useDemoDraft<T>(key: string, snapshot: T | null, restore: (draft: T) => void) {
  const [loaded, setLoaded] = useState(false)
  const restoreRef = useRef(restore)
  restoreRef.current = restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) restoreRef.current(JSON.parse(raw))
    } catch { /* Invalid drafts are replaced on the next edit. */ }
    setLoaded(true)
  }, [key])
  useEffect(() => {
    if (!loaded) return
    try {
      if (snapshot) localStorage.setItem(key, JSON.stringify(snapshot))
      else localStorage.removeItem(key)
    } catch { console.warn('Demo draft could not be saved: browser storage is unavailable.') }
  }, [key, loaded, snapshot])
}
