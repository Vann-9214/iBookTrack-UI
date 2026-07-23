'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchInventoryBox, fetchInventoryBoxes } from '../services/inventory.service'
import type { BookInBox, InventoryBox, InventorySearchType } from '../types/inventory.types'

export function useInventory(brand: string) {
  const [boxes, setBoxes] = useState<InventoryBox[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<InventorySearchType>('box')
  const [expandedBox, setExpandedBox] = useState<string | null>(null)
  const [boxBooks, setBoxBooks] = useState<Record<string, BookInBox[]>>({})
  const [loadingBoxes, setLoadingBoxes] = useState(false)
  const [loadingBooks, setLoadingBooks] = useState<string | null>(null)
  const [lastInventoryUpdate, setLastInventoryUpdate] = useState<Date | null>(null)

  const fetchBoxes = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoadingBoxes(true)
      try {
        setBoxes(await fetchInventoryBoxes(brand, searchType, searchQuery))
        setLastInventoryUpdate(new Date())
      } catch (error) {
        console.error('Failed to fetch boxes:', error)
      } finally {
        if (!options?.silent) setLoadingBoxes(false)
      }
    },
    [brand, searchQuery, searchType]
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

  return {
    boxes,
    setBoxes,
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
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
