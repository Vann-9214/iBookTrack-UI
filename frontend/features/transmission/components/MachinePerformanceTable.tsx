'use client'

import { useMemo } from 'react'
import { Activity, Loader2, Search } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Pagination } from '@/components/pagination'
import { usePagination } from '@/hooks/usePagination'
import { cn } from '@/lib/utils'
import type { MachineBook, PaginationState, ScanBook, TransmissionBrand } from '../types/transmission.types'
import { getPipelineStatusBadge, machineDisplayName, normalizeMachineName } from '../utils/transmission.helpers'

interface MachinePerformanceTableProps {
  brand: TransmissionBrand
  loading: boolean
  byMachine: { MachineName: string; TotalScans: number }[]
  allBooks: ScanBook[]
  machineSearch: string
  setMachineSearch: (value: string) => void
  machineSearchOpen: boolean
  setMachineSearchOpen: (open: boolean) => void
  selectedMachine: string | null
  selectedMachineBooks: MachineBook[]
  selectedMachineBooksLoading: boolean
  selectedMachineBooksError: string | null
  fetchMachineBooks: (machine: string) => Promise<void>
  paginatedMachineBooks: MachineBook[]
  machineBooksPagination: PaginationState
}

export function MachinePerformanceTable({
  brand,
  loading,
  byMachine,
  allBooks,
  machineSearch,
  setMachineSearch,
  machineSearchOpen,
  setMachineSearchOpen,
  selectedMachine,
  selectedMachineBooks,
  selectedMachineBooksLoading,
  selectedMachineBooksError,
  fetchMachineBooks,
  paginatedMachineBooks,
  machineBooksPagination,
}: MachinePerformanceTableProps) {
  const groupedByMachine = useMemo(() => {
    const map = new Map<string, { MachineName: string; TotalScans: number }>()
    for (const m of byMachine) {
      const key = normalizeMachineName(m.MachineName)
      const existing = map.get(key)
      if (existing) {
        existing.TotalScans += Number(m.TotalScans || 0)
      } else {
        map.set(key, { MachineName: key, TotalScans: Number(m.TotalScans || 0) })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.TotalScans - a.TotalScans)
  }, [byMachine])

  const machineBookStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>()
    for (const b of allBooks) {
      const key = normalizeMachineName(b.ScanMachineName)
      const existing = map.get(key) || { total: 0, completed: 0 }
      existing.total += 1
      if (String(b.Status || '').toUpperCase().includes('TRANSMISSION_ARCHIVE') && String(b.Status || '').toUpperCase().includes('COMPLETED')) existing.completed += 1
      map.set(key, existing)
    }
    return map
  }, [allBooks])

  const filteredByMachine = groupedByMachine.filter((m) =>
    !machineSearch || machineDisplayName(m.MachineName).toLowerCase().includes(machineSearch.toLowerCase())
  )
  const machinesPagination = usePagination({ totalItems: filteredByMachine.length, defaultPageSize: 50 })
  const paginatedByMachine = filteredByMachine.slice(
    machinesPagination.offset,
    machinesPagination.offset + machinesPagination.limit
  )

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card overflow-hidden py-0 gap-0">
        <div className={cn(
          "flex items-center justify-between px-5 py-4 border-b",
          brand === 'jaguar' ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg",
              brand === 'jaguar' 
                ? "bg-primary shadow-emerald-500/25"
                : "bg-primary shadow-blue-500/25"
            )}>
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Scans by Machine</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  brand === 'jaguar' ? "bg-primary" : "bg-primary"
                )} />
                <span className="text-xs text-gray-500">Per machine output</span>
              </div>
            </div>
          </div>
          <div className="relative hidden sm:block group">
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", "text-primary group-focus-within:text-primary")} />
            <Input
              placeholder="Search machine..."
              value={machineSearch}
              onChange={(e) => setMachineSearch(e.target.value)}
              className={cn(
                "w-56 h-9 pl-9 pr-4 text-xs font-medium bg-white/60 border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.05)] transition duration-300 rounded-xl placeholder:text-slate-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-0",
                brand === 'jaguar' ? "focus-visible:border-emerald-300 focus-visible:ring-emerald-100/50" : "focus-visible:border-blue-300 focus-visible:ring-blue-100/50"
              )}
            />
          </div>
          <button
            className="sm:hidden flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
            onClick={() => setMachineSearchOpen(!machineSearchOpen)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
        {machineSearchOpen && (
          <div className={cn(
            "sm:hidden px-4 py-3 border-b",
            brand === 'jaguar' ? "border-emerald-100 bg-emerald-50/60" : "border-blue-100 bg-blue-50/60"
          )}>
            <div className="relative group">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", "text-primary group-focus-within:text-primary")} />
              <Input
                autoFocus
                placeholder="Search machine..."
                value={machineSearch}
                onChange={(e) => setMachineSearch(e.target.value)}
                className={cn(
                  "w-full h-9 pl-9 pr-4 text-xs font-medium bg-white/60 border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.05)] transition duration-300 rounded-xl placeholder:text-slate-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-0",
                  brand === 'jaguar' ? "focus-visible:border-emerald-300 focus-visible:ring-emerald-100/50" : "focus-visible:border-blue-300 focus-visible:ring-blue-100/50"
                )}
              />
            </div>
          </div>
        )}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead className="bg-white">
                <tr className="border-b border-gray-100">
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">
                    Machine Name
                  </th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left w-48">
                    Activity
                  </th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">
                    Total Scans
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : filteredByMachine.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className={cn(
                          "flex w-12 h-12 rounded-full items-center justify-center text-white shadow-lg",
                          brand === 'jaguar' 
                            ? "bg-primary shadow-emerald-500/25"
                            : "bg-primary shadow-blue-500/25"
                        )}>
                          <Activity className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-gray-600">
                          {byMachine.length === 0 ? 'No machine data for today' : 'No machines match your search'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedByMachine.map((m, i) => {
                    const stats = machineBookStats.get(m.MachineName) || { total: 0, completed: 0 }
                    const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
                    const isSelected = selectedMachine === m.MachineName
                    return (
                      <tr
                        key={i}
                        className={cn(
                          "border-b border-gray-50 cursor-pointer transition-colors",
                          isSelected 
                            ? (brand === 'jaguar' ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-blue-50 hover:bg-blue-100')
                            : 'hover:bg-gray-50'
                        )}
                        onClick={() => fetchMachineBooks(m.MachineName)}
                      >
                        <td className="font-semibold text-xs text-gray-800 px-4 py-3">
                          {machineDisplayName(m.MachineName)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Progress value={pct} className="h-2 flex-1" />
                            <span className="text-xs font-semibold text-gray-500 w-9 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td className="text-xs font-bold text-right text-gray-800 px-4 py-3">
                          {m.TotalScans.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {filteredByMachine.length > 0 && machinesPagination.totalPages > 1 && (
            <Pagination
              currentPage={machinesPagination.currentPage}
              totalPages={machinesPagination.totalPages}
              pageSize={machinesPagination.pageSize}
              onPageChange={machinesPagination.goToPage}
              onPageSizeChange={machinesPagination.setPageSize}
              canPrevPage={machinesPagination.canPrevPage}
              canNextPage={machinesPagination.canNextPage}
            />
          )}
        </CardContent>
      </Card>

      {selectedMachine && (
        <Card className="border-border bg-card overflow-hidden py-0 gap-0">
          <div className={cn(
            "flex items-center justify-between px-5 py-3 border-b",
            brand === 'jaguar' ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"
          )}>
            <div>
              <p className="text-sm font-bold text-gray-800">
                Books scanned on {machineDisplayName(selectedMachine)}
              </p>
              <p className="text-xs text-gray-500">ISBNs reported by Simflex for the selected date range</p>
            </div>
            <Badge variant="outline" className={cn(
              "bg-white text-xs",
              brand === 'jaguar' ? "border-emerald-200 text-emerald-700" : "border-blue-200 text-blue-700"
            )}>
              {selectedMachineBooks.length} book{selectedMachineBooks.length === 1 ? '' : 's'}
            </Badge>
          </div>
          <CardContent className="p-0">
            {selectedMachineBooksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : selectedMachineBooksError ? (
              <p className="px-5 py-8 text-center text-sm text-destructive">{selectedMachineBooksError}</p>
            ) : (
              <>
                <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-white sticky top-0 z-10">
                      <tr className="border-b border-gray-100">
                        <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">
                          ISBN
                        </th>
                        <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">
                          Status
                        </th>
                        <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">
                          User
                        </th>
                        <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMachineBooks.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-16">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className={cn(
                                "flex w-12 h-12 rounded-full items-center justify-center text-white shadow-lg",
                                brand === 'jaguar' 
                                  ? "bg-primary shadow-emerald-500/25"
                                  : "bg-primary shadow-blue-500/25"
                              )}>
                                <Activity className="h-6 w-6" />
                              </div>
                              <p className="text-sm font-semibold text-gray-600">No books found for this machine</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedMachineBooks.map((book) => (
                          <tr key={book.ISBN} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="font-mono text-xs text-gray-800 px-4 py-1">{book.ISBN}</td>
                            <td className="px-4 py-1">{getPipelineStatusBadge(book.Status || '')}</td>
                            <td className="text-xs text-gray-600 px-4 py-1">{book.ScanUser || '—'}</td>
                            <td className="text-xs text-gray-400 px-4 py-1 text-right whitespace-nowrap">
                              {book.Updated
                                ? format(new Date(book.Updated), 'MMM d, HH:mm')
                                : book.ScanDate
                                  ? format(new Date(book.ScanDate), 'MMM d')
                                  : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {selectedMachineBooks.length > 0 && (
                  <Pagination
                    currentPage={machineBooksPagination.currentPage}
                    totalPages={machineBooksPagination.totalPages}
                    pageSize={machineBooksPagination.pageSize}
                    onPageChange={machineBooksPagination.goToPage}
                    onPageSizeChange={machineBooksPagination.setPageSize}
                    canPrevPage={machineBooksPagination.canPrevPage}
                    canNextPage={machineBooksPagination.canNextPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
