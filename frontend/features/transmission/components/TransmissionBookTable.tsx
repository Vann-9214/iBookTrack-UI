'use client'

import { BookOpen, Box, CheckCircle2, Filter, ListOrdered, Search, X } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/pagination'
import { RoleGuard } from '@/components/role-guard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { LotIsbn, LotTransmissionFilter, PaginationState } from '../types/transmission.types'
import { getScanStatusBadge, getSimflexBadge } from '../utils/transmission.helpers'

const TRANSMISSION_FILTER_LABELS: Record<LotTransmissionFilter, string> = {
  all: 'All statuses',
  transmitted: 'Transmitted',
  scan: 'Scan',
  validate: 'Validate',
  pdf_conversion: 'PDF Conversion',
  preval: 'Preval',
}

interface TransmissionBookTableProps {
  brand: 'mustang' | 'jaguar'
  filteredLotIsbns: LotIsbn[]
  paginatedLotIsbns: LotIsbn[]
  lotIsbnSearch: string
  setLotIsbnSearch: (value: string) => void
  lotBoxFilter: string
  lotStages: string[]
  lotStageFilter: string
  setLotStageFilter: (value: string) => void
  lotTransmissionFilter: LotTransmissionFilter
  setLotTransmissionFilter: (value: LotTransmissionFilter) => void
  lotIsbnPagination: PaginationState
  onFlag: (scan: LotIsbn) => void
}

export function TransmissionBookTable({
  brand,
  filteredLotIsbns,
  paginatedLotIsbns,
  lotIsbnSearch,
  setLotIsbnSearch,
  lotBoxFilter,
  lotStages,
  lotStageFilter,
  setLotStageFilter,
  lotTransmissionFilter,
  setLotTransmissionFilter,
  lotIsbnPagination,
  onFlag,
}: TransmissionBookTableProps) {
  const hasFilters = lotStageFilter !== 'all' || lotTransmissionFilter !== 'all' || lotIsbnSearch || lotBoxFilter !== 'all'

  const clearFilters = () => {
    setLotIsbnSearch('')
    setLotStageFilter('all')
    setLotTransmissionFilter('all')
  }

  const startIndex = lotIsbnPagination.offset + 1

  return (
    <Card className="border-border bg-card overflow-hidden py-0 gap-0">
      <div className="flex flex-col gap-3 px-5 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Books</p>
            <Badge variant="secondary" className="text-[10px] font-mono">
              {filteredLotIsbns.length.toLocaleString()}
            </Badge>
            {lotBoxFilter !== 'all' && (
              <Badge variant="outline" className="text-[10px] gap-1 border-violet-200 bg-violet-50 text-violet-700 font-semibold">
                <Box className="h-2.5 w-2.5" />
                {lotBoxFilter}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
              >
                <X className="h-3 w-3 mr-1" />
                Clear filters
              </Button>
            )}
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Filter className="h-3 w-3" />
            <span className="font-medium">Filters:</span>
          </div>

          <Select value={lotStageFilter} onValueChange={setLotStageFilter}>
            <SelectTrigger size="sm" className="h-7 text-[11px] w-auto min-w-[120px] bg-white">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {lotStages.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  <span className="uppercase text-[11px]">{stage}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={lotTransmissionFilter} onValueChange={(v) => setLotTransmissionFilter(v as LotTransmissionFilter)}>
            <SelectTrigger size="sm" className="h-7 text-[11px] w-auto min-w-[140px] bg-white">
              <SelectValue placeholder="Transmission" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="transmitted">Transmitted</SelectItem>
              <SelectItem value="scan">Scan</SelectItem>
              <SelectItem value="validate">Validate</SelectItem>
              <SelectItem value="pdf_conversion">PDF Conversion</SelectItem>
              <SelectItem value="preval">Preval</SelectItem>
            </SelectContent>
          </Select>

          {lotStageFilter !== 'all' && (
            <Badge variant="outline" className="text-[10px] gap-1 border-slate-200 bg-slate-50 text-slate-600">
              Stage: <span className="uppercase font-semibold">{lotStageFilter}</span>
            </Badge>
          )}
          {lotTransmissionFilter !== 'all' && (
            <Badge variant="outline" className="text-[10px] gap-1 border-slate-200 bg-slate-50 text-slate-600">
              {TRANSMISSION_FILTER_LABELS[lotTransmissionFilter]} only
            </Badge>
          )}
        </div>
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
          <table className="w-full text-xs">
            <thead className="bg-muted sticky top-0 z-10">
              <tr className="border-b border-border">
                <th className="text-center font-semibold text-muted-foreground px-2 py-2 w-[50px]">
                  <ListOrdered className="h-3 w-3 mx-auto" />
                </th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-2 w-[130px]">ISBN</th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-2 w-[80px]">Box</th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-2 w-[100px]">Stage</th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-2">Title</th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-2 w-[160px]">Author</th>
                <th className="text-center font-semibold text-muted-foreground px-3 py-2 w-[110px]">Scan</th>
                <th className="text-center font-semibold text-muted-foreground px-3 py-2 w-[110px]">Simflex</th>
                <th className="text-left font-semibold text-muted-foreground px-3 py-2 w-[150px]">Date Updated</th>
                <th className="text-center font-semibold text-muted-foreground px-3 py-2 w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedLotIsbns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className={cn(
                        "flex w-12 h-12 rounded-full items-center justify-center text-white shadow-lg",
                        brand === 'jaguar'
                          ? "bg-primary shadow-emerald-500/25"
                          : "bg-primary shadow-blue-500/25"
                      )}>
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-gray-600">No books found{lotBoxFilter !== 'all' ? ` in box ${lotBoxFilter}` : ''}</p>
                      {hasFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] mt-1"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLotIsbns.map((r, i) => {
                  const rowNumber = startIndex + i
                  return (
                    <tr
                      key={r.scan_id || i}
                      className="border-b border-border/40 hover:bg-indigo-50/40 transition-colors group h-[42px]"
                    >
                      <td className="px-2 py-2 align-middle text-center">
                        <span className="text-[10px] font-mono text-muted-foreground">{rowNumber}</span>
                      </td>
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
                      <td className="px-4 py-2 align-middle">
                        <p className="text-muted-foreground truncate max-w-[160px] leading-tight" title={r.author || '—'}>
                          {r.author || '—'}
                        </p>
                      </td>
                      <td className="px-3 py-2 align-middle text-center">{getScanStatusBadge(r.scan_status)}</td>
                      <td className="px-3 py-2 align-middle text-center">
                        {getSimflexBadge(r.simflex_status, !!r.transmission_completed, r.scan_status)}
                      </td>
                      <td className="px-3 py-2 align-middle whitespace-nowrap">
                        {r.transmission_date ? (
                          <div className="flex items-center gap-1.5">
                            {r.transmission_completed && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                            <span className={r.transmission_completed ? 'text-emerald-700 font-medium' : 'text-foreground'}>
                              {format(new Date(r.transmission_date), 'MMM d, yyyy HH:mm')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-middle text-center">
                        {r.scan_status === 'processable' && (
                          <RoleGuard allowedRoles={['scan']} action="hide">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-2 text-red-600 hover:bg-red-700 hover:text-white transition-colors"
                              onClick={() => onFlag(r)}
                            >
                              Flag
                            </Button>
                          </RoleGuard>
                        )}
                      </td>
                    </tr>
                  )
                })
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
