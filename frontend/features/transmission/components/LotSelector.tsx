'use client'

import { Loader2, Package, Search, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/pagination'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { LotSearchResult, LotSummary } from '../types/transmission.types'

interface LotSelectorProps {
  brand: 'mustang' | 'jaguar'
  lotSearchQuery: string
  setLotSearchQuery: (value: string) => void
  handleLotSearchChange: (value: string) => void
  lotSearchLoading: boolean
  lotSearchResults: LotSearchResult[]
  lotSearchTotal: number
  lotSearchPage: number
  lotSearchPageSize: number
  searchLots: (query: string, page: number, pageSize: number) => Promise<void>
  fetchLotSummary: (lot?: string) => Promise<void>
  lotSummary: LotSummary | null
  lotError: string | null
}

export function LotSelector({
  brand,
  lotSearchQuery,
  setLotSearchQuery,
  handleLotSearchChange,
  lotSearchLoading,
  lotSearchResults,
  lotSearchTotal,
  lotSearchPage,
  lotSearchPageSize,
  searchLots,
  fetchLotSummary,
  lotSummary,
  lotError,
}: LotSelectorProps) {
  const totalPages = Math.ceil(lotSearchTotal / lotSearchPageSize) || 1

  return (
    <Card className="border-border bg-card py-0 gap-0 overflow-hidden">
      <div className={cn(
        "flex items-center gap-3 px-5 py-3 border-b",
        brand === 'jaguar' ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"
      )}>
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg",
          brand === 'jaguar' 
            ? "bg-primary shadow-emerald-500/25"
            : "bg-primary shadow-blue-500/25"
        )}>
          <Package className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800">LOT Transmission</p>
          <p className="text-[11px] text-gray-500">
            Search and select a LOT to view its book pipeline
            {lotSearchTotal > 0 && (
              <span className="text-gray-400">
                {' '}
                · {lotSearchTotal.toLocaleString()} lot{lotSearchTotal !== 1 ? 's' : ''} total
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="px-5 py-3 border-b border-border/50 bg-muted/20">
        <div className="relative group max-w-md w-full">
          <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", "text-primary group-focus-within:text-primary")} />
          <Input
            placeholder="Search by lot number… (e.g. lot-3A)"
            value={lotSearchQuery}
            onChange={(e) => handleLotSearchChange(e.target.value)}
            className={cn(
              "w-full h-9 pl-9 pr-8 text-xs font-medium bg-white/60 border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.05)] transition duration-300 rounded-xl placeholder:text-slate-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-0",
              brand === 'jaguar' ? "focus-visible:border-emerald-300 focus-visible:ring-emerald-100/50" : "focus-visible:border-blue-300 focus-visible:ring-blue-100/50"
            )}
            autoFocus
          />
          {lotSearchLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="max-h-[360px] overflow-y-auto">
        {lotSearchResults.length === 0 && !lotSearchLoading ? (
          <div className="flex flex-col items-center justify-center py-14 px-5 text-center">
            <div className={cn(
              "flex w-12 h-12 rounded-full items-center justify-center text-white shadow-lg mb-3",
              brand === 'jaguar' 
                ? "bg-primary shadow-emerald-500/25"
                : "bg-primary shadow-blue-500/25"
            )}>
              <Package className="h-6 w-6" />
            </div>
            {lotSearchQuery ? (
              <>
                <p className="text-sm font-medium text-gray-600">No lots matching &quot;{lotSearchQuery}&quot;</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-600">No lots available</p>
                <p className="text-xs text-muted-foreground mt-1">Lots will appear here once created</p>
              </>
            )}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted/30 sticky top-0 z-10">
              <tr className="border-b border-border">
                <th className="text-left font-semibold text-muted-foreground px-5 py-2">Lot</th>
                <th className="text-left font-semibold text-muted-foreground px-3 py-2 w-[80px]">Boxes</th>
                <th className="text-left font-semibold text-muted-foreground px-3 py-2 w-[100px]">Type</th>
                <th className="text-left font-semibold text-muted-foreground px-3 py-2 w-[130px]">Created</th>
                <th className="w-[80px]"></th>
              </tr>
            </thead>
            <tbody>
              {lotSearchResults.map((lot) => {
                const isActive = lotSummary?.lot_number === lot.lot_number
                const boxCount = lot.boxes?.[0]?.count ?? lot.total_boxes ?? 0
                return (
                  <tr
                    key={lot.id}
                    className={`border-b border-border/40 transition-colors cursor-pointer ${
                      isActive ? 'bg-indigo-50/70' : 'hover:bg-indigo-50/30'
                    }`}
                    onClick={() => {
                      setLotSearchQuery(lot.lot_number)
                      fetchLotSummary(lot.lot_number)
                    }}
                  >
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        {isActive && <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />}
                        <span className={`font-semibold ${isActive ? 'text-indigo-700' : 'text-foreground'}`}>
                          {lot.lot_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{boxCount}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-[10px]">
                        {lot.type || '—'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                      {lot.created_at ? format(new Date(lot.created_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2 text-indigo-600 hover:bg-indigo-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLotSearchQuery(lot.lot_number)
                          fetchLotSummary(lot.lot_number)
                        }}
                      >
                        View books
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {lotSearchTotal > 0 && (
        <div className="border-t border-border bg-muted/10 p-2 text-muted-foreground flex justify-center">
          <Pagination
            currentPage={lotSearchPage}
            totalPages={totalPages}
            pageSize={lotSearchPageSize}
            onPageChange={(page) => searchLots(lotSearchQuery, page, lotSearchPageSize)}
            onPageSizeChange={(size) => searchLots(lotSearchQuery, 1, size)}
            canPrevPage={lotSearchPage > 1}
            canNextPage={lotSearchPage < totalPages}
          />
        </div>
      )}

      {lotError && (
        <div className="px-5 py-2 border-t border-border">
          <p className="text-xs text-red-600 flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" />{lotError}
          </p>
        </div>
      )}
    </Card>
  )
}
