'use client'

import { Barcode, BookOpen, Loader2, Package, X } from 'lucide-react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'
import { DashboardPipeline } from '@/features/dashboard/components/DashboardPipeline'
import { DashboardRecentActivity } from '@/features/dashboard/components/DashboardRecentActivity'
import { DashboardSearch } from '@/features/dashboard/components/DashboardSearch'
import { DashboardStats } from '@/features/dashboard/components/DashboardStats'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { DashboardMain } from './DashboardMain'

export default function DashboardPage() {
  const dashboard = useDashboard()

  return (
    <div className={cn('flex h-dvh overflow-hidden bg-background', `theme-${dashboard.brand}`)}>
      <DashboardSidebar />
      <DashboardMain>
        <DashboardNavbar />
        <div className="ambient-bg flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 pb-safe-6">
            <DashboardHeader
              brand={dashboard.brand}
              refreshing={dashboard.isRefreshing}
              lastUpdated={dashboard.lastStatsUpdate}
              onRefresh={dashboard.refreshAll}
              onOpenSearch={() => dashboard.setSearchOpen(true)}
            />
            <DashboardSearch
              open={dashboard.searchOpen}
              type={dashboard.searchType}
              value={dashboard.searchValue}
              rangeStart={dashboard.rangeStart}
              rangeEnd={dashboard.rangeEnd}
              isRange={dashboard.isRange}
              result={dashboard.searchResult}
              loading={dashboard.loading}
              onOpenChange={dashboard.setSearchOpen}
              onTypeChange={dashboard.setSearchType}
              onValueChange={dashboard.setSearchValue}
              onRangeStartChange={dashboard.setRangeStart}
              onRangeEndChange={dashboard.setRangeEnd}
              onRangeChange={dashboard.setIsRange}
              onSearch={dashboard.handleSearch}
              onClear={dashboard.clearSearch}
            />
            <DashboardStats stats={dashboard.dashboardStats} refreshKey={dashboard.refreshKey} loading={dashboard.isRefreshing} />
            <BoxLookup
              value={dashboard.boxScanInput}
              loading={dashboard.loadingBoxScan}
              result={dashboard.boxScanModal}
              onValueChange={dashboard.setBoxScanInput}
              onSubmit={dashboard.handleBoxScan}
              onClose={() => dashboard.setBoxScanModal(null)}
            />
            <DashboardPipeline currentLot={dashboard.displayText} stats={dashboard.dashboardStats} brand={dashboard.brand} loading={dashboard.isRefreshing} />
            <DashboardRecentActivity scans={dashboard.liveScans} loading={dashboard.isRefreshing} />
          </div>
        </div>
      </DashboardMain>
    </div>
  )
}

function BoxLookup({ value, loading, result, onValueChange, onSubmit, onClose }: { value: string; loading: boolean; result: { box: any; books: any[] } | null; onValueChange: (value: string) => void; onSubmit: () => void; onClose: () => void }) {
  return (
    <>
      <Card className="border-border bg-card"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Barcode className="h-4 w-4 text-primary" />Box Lookup</CardTitle></CardHeader><CardContent><div className="flex gap-2"><Input value={value} placeholder="Scan or enter a box number" onChange={(event) => onValueChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSubmit() }} /><Button onClick={onSubmit} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}</Button></div></CardContent></Card>
      {result && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}><Card className="w-full max-w-2xl max-h-[85vh] overflow-auto" onClick={(event) => event.stopPropagation()}><CardHeader><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />{result.box.box_number || 'Box details'}</CardTitle><button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button></div></CardHeader><CardContent><div className="grid grid-cols-2 gap-4 mb-5"><Info label="Lot" value={result.box.lot?.lot_number || result.box.lot_number || '—'} /><Info label="Stage" value={result.box.current_stage || '—'} /><Info label="Expected books" value={result.box.total_expected_books || 0} /><Info label="Scanned books" value={result.books.length} /></div><div className="space-y-2">{result.books.map((book, index) => <div key={book.id || index} className="flex items-center gap-3 rounded-lg border p-3"><BookOpen className="h-4 w-4 text-muted-foreground" /><div className="min-w-0"><p className="font-medium truncate">{book.title || 'Unknown title'}</p><p className="text-xs text-muted-foreground">{book.isbn || 'No ISBN'}</p></div></div>)}</div></CardContent></Card></div>}
    </>
  )
}

function Info({ label, value }: { label: string; value: string | number }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold capitalize">{value}</p></div>
}
