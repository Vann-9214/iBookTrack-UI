'use client'

import { useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
import { getApiBaseUrl } from '@/lib/auth-api'
import { fetchInventoryBox, fetchInventoryBoxes } from '../services/inventory.service'
import type { BookInBox, InventoryBox } from '../types/inventory.types'

export function useInventory(brand: string) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedBox, setExpandedBox] = useState<string | null>(null)
  const [boxBooks, setBoxBooks] = useState<Record<string, BookInBox[]>>({})
  const [loadingBooks, setLoadingBooks] = useState<string | null>(null)

  const { data, isLoading, isValidating, mutate } = useSWR(
    brand ? ['inventory_boxes', brand, searchQuery] : null,
    () => fetchInventoryBoxes(brand, searchQuery),
    { 
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  )

  const loadingBoxes = isLoading || !data
  const isRefreshing = isValidating
  const boxes = data || []

  const lastInventoryUpdate = boxes.length > 0 || !loadingBoxes ? new Date() : null

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

  const fetchBoxes = useCallback(async () => {
    await mutate()
  }, [mutate])

  useEffect(() => {
    const es = new EventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })

    const handleUpdate = () => {
      mutate()
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
  }, [mutate])

  return {
    boxes,
    setBoxes: mutate,
    searchQuery,
    setSearchQuery,
    expandedBox,
    setExpandedBox,
    boxBooks,
    setBoxBooks,
    loadingBoxes,
    isRefreshing,
    loadingBooks,
    lastInventoryUpdate,
    fetchBoxes,
    fetchBooksInBox,
    toggleBox,
  }
}
