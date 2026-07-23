'use client'

import { BookOpen, Box, CheckCircle2, Search } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/pagination'
import type { LotIsbn, PaginationState } from '../types/transmission.types'
import { getScanStatusBadge, getSimflexBadge } from '../utils/transmission.helpers'

interface TransmissionBookTableProps {
  filteredLotIsbns: LotIsbn[]
  paginatedLotIsbns: LotIsbn[]
  lotIsbnSearch: string
  setLotIsbnSearch: (value: string) => void
  lotBoxFilter: string
  lotIsbnPagination: PaginationState
  onFlag: (scan: LotIsbn) => void
}

export function TransmissionBookTable({
  filteredLotIsbns,
  paginatedLotIsbns,
  lotIsbnSearch,
  setLotIsbnSearch,
  lotBoxFilter,
  lotIsbnPagination,
  onFlag,
}: TransmissionBookTableProps) {
  return (
    <Card className="border-border bg-card overflow-hidden py-0 gap-0">
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">Books</p>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {filteredLotIsbns.length}
          </Badge>
          {lotBoxFilter !== 'all' && (
            <Badge variant="outline" className="text-[10px] gap-1 border-violet-200 bg-violet-50 text-violet-700 font-semibold">
              <Box className="h-2.5 w-2.5" />
              {lotBoxFilter}
            </Badge>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter ISBN or title…"
            value={lotIsbnSearch}
            onChange={(e) => setLotIsbnSearch(e.target.value)}
            className="w-52 pl-9 h-8 text-xs bg-white"
          />
        </div>
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 sticky top-0 z-10">
              <tr className="border-b border-border">
                <th className="text-left font-semibold text-muted-foreground px-4 py-2 w-[140px]">ISBN</th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-2 w-[80px]">Box</th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-2 w-[100px]">Stage</th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-2">Title</th>
                <th className="text-center font-semibold text-muted-foreground px-3 py-2 w-[110px]">Scan</th>
                <th className="text-center font-semibold text-muted-foreground px-3 py-2 w-[110px]">Simflex</th>
                <th className="text-left font-semibold text-muted-foreground px-3 py-2 w-[150px]">Transmitted</th>
                <th className="text-center font-semibold text-muted-foreground px-3 py-2 w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedLotIsbns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground">
                    <BookOpen className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground/40" />
                    No books found{lotBoxFilter !== 'all' ? ` in box ${lotBoxFilter}` : ''}
                  </td>
                </tr>
              ) : (
                paginatedLotIsbns.map((r, i) => (
                  <tr
                    key={r.scan_id || i}
                    className="border-b border-border/40 hover:bg-indigo-50/40 transition-colors group h-[42px]"
                  >
                    <td className="px-4 py-2 align-middle">
                      <p className="font-mono text-[11px] font-bold text-foreground leading-none">{r.isbn}</p>
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <p className="font-mono text-[11px] font-semibold text-gray-500 leading-none">
                        {r.box_number || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase font-bold tracking-wider text-slate-500 border-slate-200 bg-slate-50"
                      >
                        {r.current_stage || 'N/A'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <p className="text-foreground truncate max-w-[300px] leading-tight" title={r.title || '—'}>
                        {r.title || '—'}
                      </p>
                      {r.rejection_reason && (
                        <p
                          className="text-[10px] text-red-600 mt-0.5 truncate max-w-[300px]"
                          title={r.rejection_reason}
                        >
                          ⚠ {r.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle text-center">{getScanStatusBadge(r.scan_status)}</td>
                    <td className="px-3 py-2 align-middle text-center">
                      {getSimflexBadge(r.simflex_status, !!r.transmission_completed, r.scan_status)}
                    </td>
                    <td className="px-3 py-2 align-middle whitespace-nowrap">
                      {r.transmission_completed ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-emerald-700 font-medium">
                            {r.transmission_date
                              ? format(new Date(r.transmission_date), 'MMM d, yyyy HH:mm')
                              : '—'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle text-center">
                      {r.scan_status === 'processable' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2 text-red-600 hover:bg-red-700 hover:text-white transition-colors"
                          onClick={() => onFlag(r)}
                        >
                          Flag
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredLotIsbns.length > 0 && (
          <div className="w-full border-t border-border bg-muted/10 p-2 text-muted-foreground">
            <Pagination
              currentPage={lotIsbnPagination.currentPage}
              totalPages={lotIsbnPagination.totalPages}
              pageSize={lotIsbnPagination.pageSize}
              onPageChange={lotIsbnPagination.goToPage}
              onPageSizeChange={lotIsbnPagination.setPageSize}
              canPrevPage={lotIsbnPagination.canPrevPage}
              canNextPage={lotIsbnPagination.canNextPage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
