'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { getApiBaseUrl } from '@/lib/auth-api'
import { fetchInventoryBox, fetchInventoryBoxes } from '../services/inventory.service'
import type { BookInBox, InventoryBox } from '../types/inventory.types'

export function useInventory(brand: string) {
  const [boxes, setBoxes] = useState<InventoryBox[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedBox, setExpandedBox] = useState<string | null>(null)
  const [boxBooks, setBoxBooks] = useState<Record<string, BookInBox[]>>({})
  const [loadingBoxes, setLoadingBoxes] = useState(false)
  const [loadingBooks, setLoadingBooks] = useState<string | null>(null)
  const [lastInventoryUpdate, setLastInventoryUpdate] = useState<Date | null>(null)

  const fetchBoxes = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoadingBoxes(true)
      try {
        setBoxes(await fetchInventoryBoxes(brand, searchQuery))
        setLastInventoryUpdate(new Date())
      } catch (error) {
        console.error('Failed to fetch boxes:', error)
      } finally {
        if (!options?.silent) setLoadingBoxes(false)
      }
    },
    [brand, searchQuery]
  )

  const fetchBooksInBox = useCallback(
    async (boxId: string) => {
      if (boxBooks[boxId]) return
      setLoadingBooks(boxId)
      try {
        const data = await fetchInventoryBox(boxId)
        if (data.box?.books) setBoxBooks((current) => ({ ...current, [boxId]: data.box!.books as BookInBox[] }))
      } catch (error) {
        console.error('Failed to fetch books in box:', error)
      } finally {
        setLoadingBooks(null)
      }
    },
    [boxBooks]
  )

  const toggleBox = useCallback(
    (boxId: string) => {
      if (expandedBox === boxId) setExpandedBox(null)
      else {
        setExpandedBox(boxId)
        void fetchBooksInBox(boxId)
      }
    },
    [expandedBox, fetchBooksInBox]
  )

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchBoxes(), 300)
    return () => window.clearTimeout(timer)
  }, [fetchBoxes])

  const fetchBoxesRef = useRef(fetchBoxes)
  useEffect(() => {
    fetchBoxesRef.current = fetchBoxes
  }, [fetchBoxes])

  useEffect(() => {
    const es = new EventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })

    const handleUpdate = () => {
      fetchBoxesRef.current({ silent: true })
    }

    es.addEventListener('WAREHOUSE_LOCKED', handleUpdate)
    es.addEventListener('WAREHOUSE_UNLOCKED', handleUpdate)
    es.addEventListener('INVENTORY_LOCKED', handleUpdate)
    es.addEventListener('INVENTORY_UNLOCKED', handleUpdate)
    es.addEventListener('INVENTORY_DELAYED', handleUpdate)
    es.addEventListener('BOX_UPDATED', handleUpdate)
    es.addEventListener('PIPELINE_UPDATED', handleUpdate)
    es.addEventListener('DASHBOARD_REFRESH', handleUpdate)

    es.onerror = () => {
      console.warn('Inventory SSE error - reconnecting')
    }

    return () => es.close()
  }, [])

  return {
    boxes,
    setBoxes,
    searchQuery,
    setSearchQuery,
    expandedBox,
    setExpandedBox,
    boxBooks,
    setBoxBooks,
    loadingBoxes,
    loadingBooks,
    lastInventoryUpdate,
    fetchBoxes,
    fetchBooksInBox,
    toggleBox,
  }
}
