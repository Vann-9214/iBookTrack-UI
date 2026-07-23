'use client'

import { FileUp, Loader2, Search, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/pagination'
import { cn } from '@/lib/utils'
import type { PaginationState, ScanBook, StageFilter, TableView, TransmissionBrand } from '../types/transmission.types'
import { formatPipelineStage, getPipelineStatusBadge } from '../utils/transmission.helpers'

interface LiveScanFeedProps {
  brand: TransmissionBrand
  tableView: TableView
  fromDate: string
  toDate: string
  loading: boolean
  historySearch: string
  setHistorySearch: (value: string) => void
  historySearchOpen: boolean
  setHistorySearchOpen: (open: boolean) => void
  stageFilter: StageFilter | null
  setStageFilter: (filter: StageFilter | null) => void
  enrichedData: Record<string, { box: string; lot: string }>
  filteredScans: ScanBook[]
  paginatedRecentScans: ScanBook[]
  recentScansPagination: PaginationState
}

export function LiveScanFeed({
  brand,
  tableView,
  fromDate,
  toDate,
  loading,
  historySearch,
  setHistorySearch,
  historySearchOpen,
  setHistorySearchOpen,
  stageFilter,
  setStageFilter,
  enrichedData,
  filteredScans,
  paginatedRecentScans,
  recentScansPagination,
}: LiveScanFeedProps) {
  return (
    <Card className="border-border bg-card overflow-hidden py-0 gap-0">
      <div
        className={cn(
          'flex items-center justify-between px-5 py-4 border-b',
          brand === 'jaguar' ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl text-white',
              brand === 'jaguar' ? 'bg-green-500' : 'bg-blue-500'
            )}
          >
            <FileUp className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">
              {tableView === 'wip' ? 'Work In Progress' : 'All Books'}
              <span className="hidden sm:inline">
                {' '}
                — {fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`}
              </span>
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full shrink-0',
                  tableView === 'wip'
                    ? 'bg-red-500'
                    : brand === 'jaguar'
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                )}
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {tableView === 'wip' ? (
                  <>
                    <span className="sm:hidden">{filteredScans.length} not transmitted</span>
                    <span className="hidden sm:inline">{filteredScans.length} books not yet transmitted</span>
                  </>
                ) : (
                  `${filteredScans.length} books total`
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stageFilter && (
            <button
              onClick={() => setStageFilter(null)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  stageFilter.category === 'COMPLETED' && 'bg-green-500',
                  stageFilter.category === 'ONGOING' && 'bg-blue-500',
                  stageFilter.category === 'FAILED' && 'bg-red-500'
                )}
              />
              {formatPipelineStage(stageFilter.stage)} {stageFilter.category.toLowerCase()}
              <XCircle className="h-3.5 w-3.5 text-gray-400" />
            </button>
          )}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ISBN or box..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-56 pl-9 h-8 text-sm bg-white"
            />
          </div>
          <button
            className="sm:hidden flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
            onClick={() => setHistorySearchOpen(!historySearchOpen)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>
      {historySearchOpen && (
        <div className="sm:hidden px-4 py-2 border-b border-blue-100 bg-blue-50/60">
          <Input
            autoFocus
            placeholder="Search ISBN or box..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            className="h-8 text-sm bg-white w-full"
          />
        </div>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-white sticky top-0 z-10">
              <tr className="border-b border-gray-100">
                <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">ISBN</th>
                <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Box</th>
                <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Lot</th>
                <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Status</th>
                <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Machine</th>
                <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">User</th>
                <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : filteredScans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No scans found
                  </td>
                </tr>
              ) : (
                paginatedRecentScans.map((item, i) => {
                  const isOngoing = item.Status?.includes('ONGOING')
                  const rowCls = isOngoing
                    ? tableView === 'wip'
                      ? 'border-b border-red-100 bg-red-50/60 hover:bg-red-50'
                      : 'border-b border-blue-100 bg-blue-50/50 hover:bg-blue-50'
                    : 'border-b border-gray-50 hover:bg-gray-50'
                  return (
                    <tr key={i} className={`${rowCls} transition-colors`}>
                      <td className="font-mono text-xs text-gray-800 px-4 py-3">{item.ISBN}</td>
                      <td className="text-xs text-gray-600 px-4 py-3">
                        {enrichedData[item.ISBN]?.box && enrichedData[item.ISBN]?.box !== '—'
                          ? enrichedData[item.ISBN].box
                          : item.BoxNumber || '—'}
                      </td>
                      <td className="text-xs text-gray-600 px-4 py-3">
                        {enrichedData[item.ISBN]?.lot && enrichedData[item.ISBN]?.lot !== '—'
                          ? enrichedData[item.ISBN].lot
                          : item.LotNumber || '—'}
                      </td>
                      <td className="px-4 py-3">{getPipelineStatusBadge(item.Status || '')}</td>
                      <td className="text-xs text-gray-500 px-4 py-3">
                        {item.ScanMachineName || item.MachineName || '—'}
                      </td>
                      <td className="text-xs text-gray-600 px-4 py-3">{item.ScanUser || '—'}</td>
                      <td className="text-xs text-gray-400 px-4 py-3 text-right whitespace-nowrap">
                        {item.Updated
                          ? format(new Date(item.Updated), 'MMM d, HH:mm')
                          : item.ScanDate
                            ? format(new Date(item.ScanDate), 'MMM d')
                            : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {filteredScans.length > 0 && (
          <div className="w-full border-t border-border bg-muted/10 p-2 text-muted-foreground">
            <Pagination
              currentPage={recentScansPagination.currentPage}
              totalPages={recentScansPagination.totalPages}
              pageSize={recentScansPagination.pageSize}
              onPageChange={recentScansPagination.goToPage}
              onPageSizeChange={recentScansPagination.setPageSize}
              canPrevPage={recentScansPagination.canPrevPage}
              canNextPage={recentScansPagination.canNextPage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
