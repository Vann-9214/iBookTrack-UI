'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { fetchMachineBooks as fetchMachineBooksService } from '../services/transmission.service'
import type { MachineBook, TransmissionBrand } from '../types/transmission.types'

interface UseMachineBooksOptions {
  fromDate: string
  toDate: string
  brand: TransmissionBrand
  newProcessOnly: boolean
}

export function useMachineBooks({ fromDate, toDate, brand, newProcessOnly }: UseMachineBooksOptions) {
  const [machineSearch, setMachineSearch] = useState('')
  const [machineSearchOpen, setMachineSearchOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null)
  const [selectedMachineBooks, setSelectedMachineBooks] = useState<MachineBook[]>([])
  const [selectedMachineBooksLoading, setSelectedMachineBooksLoading] = useState(false)
  const [selectedMachineBooksError, setSelectedMachineBooksError] = useState<string | null>(null)

  const machineBooksPagination = usePagination({
    totalItems: selectedMachineBooks.length,
    defaultPageSize: 50,
  })
  const paginatedMachineBooks = selectedMachineBooks.slice(
    machineBooksPagination.offset,
    machineBooksPagination.offset + machineBooksPagination.limit
  )

  const fetchMachineBooks = useCallback(
    async (machine: string) => {
      if (selectedMachine === machine) {
        setSelectedMachine(null)
        setSelectedMachineBooks([])
        setSelectedMachineBooksError(null)
        return
      }

      setSelectedMachine(machine)
      setSelectedMachineBooks([])
      setSelectedMachineBooksError(null)
      setSelectedMachineBooksLoading(true)
      machineBooksPagination.goToPage(1)

      try {
        const data = await fetchMachineBooksService({
          machine,
          from: fromDate,
          to: toDate,
          location: brand,
          newProcessOnly,
        })
        if (!data.success) {
          setSelectedMachineBooksError(data.error || 'Failed to load machine books')
          return
        }
        setSelectedMachineBooks(data.books || [])
      } catch (e: unknown) {
        setSelectedMachineBooksError(e instanceof Error ? e.message : 'Failed to load machine books')
      } finally {
        setSelectedMachineBooksLoading(false)
      }
    },
    [fromDate, toDate, brand, newProcessOnly, selectedMachine, machineBooksPagination.goToPage]
  )

  useEffect(() => {
    setSelectedMachine(null)
    setSelectedMachineBooks([])
    setSelectedMachineBooksError(null)
  }, [fromDate, toDate, brand, newProcessOnly])

  return {
    machineSearch,
    setMachineSearch,
    machineSearchOpen,
    setMachineSearchOpen,
    selectedMachine,
    selectedMachineBooks,
    selectedMachineBooksLoading,
    selectedMachineBooksError,
    paginatedMachineBooks,
    machineBooksPagination,
    fetchMachineBooks,
  }
}

export type UseMachineBooksReturn = ReturnType<typeof useMachineBooks>
