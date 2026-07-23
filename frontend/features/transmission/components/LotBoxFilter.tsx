'use client'

import { Box, Boxes, Check, ChevronDown, Package, Search, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { BoxGroup } from '../types/transmission.types'

interface LotBoxFilterProps {
  lotBoxGroups: BoxGroup[]
  lotBoxFilter: string
  setLotBoxFilter: (value: string) => void
  lotBoxSelectorOpen: boolean
  setLotBoxSelectorOpen: (open: boolean) => void
  lotBoxSearch: string
  setLotBoxSearch: (value: string) => void
  matchedBoxGroups: BoxGroup[]
  visibleBoxGroups: BoxGroup[]
  activeBoxGroup: BoxGroup | null | undefined
  BOX_RENDER_CAP: number
  lotIsbns: { isbn: string }[]
}

export function LotBoxFilter({
  lotBoxGroups,
  lotBoxFilter,
  setLotBoxFilter,
  lotBoxSelectorOpen,
  setLotBoxSelectorOpen,
  lotBoxSearch,
  setLotBoxSearch,
  matchedBoxGroups,
  visibleBoxGroups,
  activeBoxGroup,
  BOX_RENDER_CAP,
  lotIsbns,
}: LotBoxFilterProps) {
  const lotBoxSearchLower = lotBoxSearch.trim().toLowerCase()

  if (lotBoxGroups.length === 0) return null

  return (
    <Card className="border-border bg-card py-0 gap-0 overflow-hidden">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500 text-white">
            <Boxes className="h-4 w-4" />
          </div>
          <p className="text-sm font-bold text-gray-800">Filter by Box</p>
          <Badge
            variant="outline"
            className="text-[10px] border-violet-200 bg-violet-50 text-violet-600 font-semibold"
          >
            {lotBoxGroups.length.toLocaleString()} {lotBoxGroups.length === 1 ? 'box' : 'boxes'}
          </Badge>
        </div>

        <div className="flex flex-1 items-center gap-2 min-w-0">
          <Popover
            open={lotBoxSelectorOpen}
            onOpenChange={(o) => {
              setLotBoxSelectorOpen(o)
              if (!o) setLotBoxSearch('')
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={lotBoxSelectorOpen}
                className={cn(
                  'h-9 w-full sm:w-[260px] min-w-0 justify-between gap-2 bg-white text-foreground font-normal hover:bg-violet-50 hover:text-violet-700 data-[state=open]:border-violet-400 data-[state=open]:ring-2 data-[state=open]:ring-violet-200',
                  lotBoxFilter !== 'all' && 'border-violet-300 ring-1 ring-violet-200'
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Box
                    className={cn(
                      'h-4 w-4 shrink-0',
                      lotBoxFilter !== 'all' ? 'text-violet-600' : 'text-muted-foreground'
                    )}
                  />
                  <span className={cn('truncate', lotBoxFilter === 'all' && 'text-muted-foreground')}>
                    {lotBoxFilter === 'all' ? 'All boxes' : lotBoxFilter}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(88vw,300px)] p-0" align="start" sideOffset={4}>
              <div className="relative border-b border-border p-2">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder={`Search ${lotBoxGroups.length.toLocaleString()} boxes…`}
                  value={lotBoxSearch}
                  onChange={(e) => setLotBoxSearch(e.target.value)}
                  className="h-9 pl-9 text-sm border-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="max-h-[320px] overflow-y-auto p-1">
                {!lotBoxSearchLower && (
                  <button
                    onClick={() => {
                      setLotBoxFilter('all')
                      setLotBoxSelectorOpen(false)
                      setLotBoxSearch('')
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                      lotBoxFilter === 'all'
                        ? 'bg-violet-50 text-violet-700'
                        : 'hover:bg-violet-50 hover:text-violet-700'
                    )}
                  >
                    <Package className="h-4 w-4 shrink-0 text-violet-500" />
                    <span className="flex-1 font-semibold">All boxes</span>
                    <span className="text-[11px] text-muted-foreground">
                      {lotIsbns.length.toLocaleString()} books
                    </span>
                    {lotBoxFilter === 'all' && <Check className="h-4 w-4 text-violet-600 shrink-0" />}
                  </button>
                )}

                {matchedBoxGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
                    <Box className="h-6 w-6 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No boxes match &ldquo;{lotBoxSearch}&rdquo;</p>
                  </div>
                ) : (
                  visibleBoxGroups.map((g) => {
                    const isActive = lotBoxFilter === g.box_number
                    const pct =
                      g.processable > 0
                        ? Math.round((g.transmitted / g.processable) * 100)
                        : g.non_processable === g.total
                          ? 100
                          : 0
                    return (
                      <button
                        key={g.box_number}
                        onClick={() => {
                          setLotBoxFilter(g.box_number)
                          setLotBoxSelectorOpen(false)
                          setLotBoxSearch('')
                        }}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                          isActive ? 'bg-violet-50' : 'hover:bg-violet-50'
                        )}
                      >
                        <Box
                          className={cn('h-4 w-4 shrink-0', isActive ? 'text-violet-600' : 'text-muted-foreground')}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span
                            className={cn(
                              'truncate font-mono text-[12px] font-semibold',
                              isActive ? 'text-violet-700' : 'text-foreground'
                            )}
                          >
                            {g.box_number}
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span>{g.total} books</span>
                            <span className="text-emerald-600">· {g.transmitted} sent</span>
                            {g.non_processable > 0 && (
                              <span className="text-red-500">· {g.non_processable} N/P</span>
                            )}
                          </span>
                        </div>
                        {g.processable > 0 && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px] px-1 py-0 font-semibold shrink-0',
                              pct === 100
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                                : 'border-amber-200 bg-amber-50 text-amber-600'
                            )}
                          >
                            {pct}%
                          </Badge>
                        )}
                        {isActive && <Check className="h-4 w-4 text-violet-600 shrink-0" />}
                      </button>
                    )
                  })
                )}
              </div>
              {matchedBoxGroups.length > BOX_RENDER_CAP && (
                <div className="border-t border-border bg-muted/20 px-3 py-2 text-center text-[11px] text-muted-foreground">
                  Showing {BOX_RENDER_CAP} of {matchedBoxGroups.length.toLocaleString()} boxes — type to refine
                </div>
              )}
            </PopoverContent>
          </Popover>

          {lotBoxFilter !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 shrink-0 gap-1 px-2.5 text-xs text-violet-600 hover:bg-violet-100"
              onClick={() => setLotBoxFilter('all')}
            >
              <XCircle className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>

        {activeBoxGroup && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] border-gray-200 bg-gray-50 text-gray-600 font-semibold gap-1">
              {activeBoxGroup.total} <span className="font-normal text-muted-foreground">books</span>
            </Badge>
            <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-600 font-semibold gap-1">
              {activeBoxGroup.transmitted} <span className="font-normal">sent</span>
            </Badge>
            {activeBoxGroup.non_processable > 0 && (
              <Badge variant="outline" className="text-[10px] border-red-200 bg-red-50 text-red-600 font-semibold gap-1">
                {activeBoxGroup.non_processable} <span className="font-normal">N/P</span>
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
