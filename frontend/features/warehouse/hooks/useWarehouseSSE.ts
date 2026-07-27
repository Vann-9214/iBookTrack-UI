'use client'

import { useEffect, useRef, useState } from 'react'
import { getApiBaseUrl } from '@/lib/auth-api'

export interface LockedWarehouseBox {
  box_id: string
  box_number: string | null
  box_type: string | null
  lot_number: string | null
  user_id: string | null
  user_name: string | null
  status: string
}

/**
 * Subscribes to the backend real-time events stream (/api/events) and keeps a
 * live list of warehouse boxes that are currently locked by an active session
 * ('in_progress' or 'delayed'). Used to block the Lot/Box entry UI when
 * another user is already processing that box.
 */
export function useWarehouseSSE(options?: { onUnlocked?: (box: LockedWarehouseBox) => void }) {
  const [lockedWarehouseBoxes, setLockedWarehouseBoxes] = useState<LockedWarehouseBox[]>([])
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    const es = new EventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })

    const parse = (event: MessageEvent): any | null => {
      try { return JSON.parse(event.data) } catch { return null }
    }
    const upsert = (lock: LockedWarehouseBox) =>
      setLockedWarehouseBoxes((prev) => [...prev.filter((b) => b.box_id !== lock.box_id), lock])

    es.addEventListener('WAREHOUSE_LOCK_SNAPSHOT', (e) => {
      const data = parse(e as MessageEvent)
      if (data?.locks) setLockedWarehouseBoxes(data.locks as LockedWarehouseBox[])
    })
    es.addEventListener('WAREHOUSE_LOCKED', (e) => {
      const data = parse(e as MessageEvent)
      if (data?.box_id) upsert(data as LockedWarehouseBox)
    })
    es.addEventListener('WAREHOUSE_DELAYED', (e) => {
      const data = parse(e as MessageEvent)
      if (data?.box_id) upsert({ ...data, status: 'delayed' } as LockedWarehouseBox)
    })
    es.addEventListener('WAREHOUSE_UNLOCKED', (e) => {
      const data = parse(e as MessageEvent)
      if (data?.box_id) {
        setLockedWarehouseBoxes((prev) => prev.filter((b) => b.box_id !== data.box_id))
        if (optionsRef.current?.onUnlocked) optionsRef.current.onUnlocked(data as LockedWarehouseBox)
      }
    })
    es.onerror = () => {
      // EventSource reconnects automatically; the snapshot event resyncs state.
      console.warn('Events stream error — will retry automatically')
    }

    return () => es.close()
  }, [])

  return { lockedWarehouseBoxes }
}
