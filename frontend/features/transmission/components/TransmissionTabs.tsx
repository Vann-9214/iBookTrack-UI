'use client'

import { Loader2, Package } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { UseMachineBooksReturn, UseTransmissionLotReturn, UseTransmissionReturn } from '../hooks'
import type { TransmissionBrand } from '../types/transmission.types'
import { LiveScanFeed } from './LiveScanFeed'
import { LotSelector } from './LotSelector'
import { LotTransmissionSummary } from './LotTransmissionSummary'
import { MachinePerformanceTable } from './MachinePerformanceTable'
import { TransmissionBookTable } from './TransmissionBookTable'

interface TransmissionTabsProps {
  brand: TransmissionBrand
  transmission: UseTransmissionReturn
  machine: UseMachineBooksReturn
  lot: UseTransmissionLotReturn
}

export function TransmissionTabs({ brand, transmission, machine, lot }: TransmissionTabsProps) {
  const t = transmission
  const m = machine
  const l = lot

  return (
    <Tabs defaultValue="queue" className="w-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="overflow-x-auto w-full sm:w-auto">
          <TabsList className="flex w-max min-w-full sm:min-w-0 sm:w-auto">
            <TabsTrigger value="queue" className="text-xs sm:text-sm px-2 sm:px-3">
              Live Scan Feed
            </TabsTrigger>
            <TabsTrigger value="machine" className="text-xs sm:text-sm px-2 sm:px-3">
              By Machine
            </TabsTrigger>
            <TabsTrigger value="lot" className="text-xs sm:text-sm px-2 sm:px-3">
              <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
              LOT &amp; Box
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 p-0.5">
          <button
            onClick={() => t.setTableView('books')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200',
              t.tableView === 'books' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                t.tableView === 'books' ? (brand === 'jaguar' ? 'bg-green-500' : 'bg-blue-500') : 'bg-gray-400'
              )}
            />
            {t.loading ? '…' : t.totalBooks} Books
          </button>
          <button
            onClick={() => t.setTableView('wip')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200',
              t.tableView === 'wip' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', t.tableView === 'wip' ? 'bg-red-500' : 'bg-gray-400')} />
            {t.loading ? '…' : t.wipCount} WIP
          </button>
        </div>
      </div>

      <TabsContent value="queue" className="mt-4">
        <LiveScanFeed
          brand={brand}
          tableView={t.tableView}
          fromDate={t.fromDate}
          toDate={t.toDate}
          loading={t.loading}
          historySearch={t.historySearch}
          setHistorySearch={t.setHistorySearch}
          historySearchOpen={t.historySearchOpen}
          setHistorySearchOpen={t.setHistorySearchOpen}
          stageFilter={t.stageFilter}
          setStageFilter={t.setStageFilter}
          enrichedData={t.enrichedData}
          filteredScans={t.filteredScans}
          paginatedRecentScans={t.paginatedRecentScans}
          recentScansPagination={t.recentScansPagination}
        />
      </TabsContent>

      <TabsContent value="machine" className="mt-4">
        <MachinePerformanceTable
          brand={brand}
          loading={t.loading}
          byMachine={t.byMachine}
          allBooks={t.allBooks}
          machineSearch={m.machineSearch}
          setMachineSearch={m.setMachineSearch}
          machineSearchOpen={m.machineSearchOpen}
          setMachineSearchOpen={m.setMachineSearchOpen}
          selectedMachine={m.selectedMachine}
          selectedMachineBooks={m.selectedMachineBooks}
          selectedMachineBooksLoading={m.selectedMachineBooksLoading}
          selectedMachineBooksError={m.selectedMachineBooksError}
          fetchMachineBooks={m.fetchMachineBooks}
          paginatedMachineBooks={m.paginatedMachineBooks}
          machineBooksPagination={m.machineBooksPagination}
        />
      </TabsContent>

      <TabsContent value="lot" className="mt-4">
        <div className="flex flex-col gap-3">
          {l.lotLoading && !l.lotSummary && (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading lot data…
            </div>
          )}

          {(l.showLotPicker || !l.lotSummary) && (
            <LotSelector
              lotSearchQuery={l.lotSearchQuery}
              setLotSearchQuery={l.setLotSearchQuery}
              handleLotSearchChange={l.handleLotSearchChange}
              lotSearchLoading={l.lotSearchLoading}
              lotSearchResults={l.lotSearchResults}
              lotSearchTotal={l.lotSearchTotal}
              lotSearchPage={l.lotSearchPage}
              lotSearchPageSize={l.lotSearchPageSize}
              searchLots={l.searchLots}
              fetchLotSummary={l.fetchLotSummary}
              lotSummary={l.lotSummary}
              lotError={l.lotError}
            />
          )}

          {l.lotSummary && !l.showLotPicker && (
            <>
              <LotTransmissionSummary
                lotSummary={l.lotSummary}
                lotIsbnFilter={l.lotIsbnFilter}
                setLotIsbnFilter={l.setLotIsbnFilter}
                lotBoxFilter={l.lotBoxFilter}
                setLotBoxFilter={l.setLotBoxFilter}
                lotBoxSelectorOpen={l.lotBoxSelectorOpen}
                setLotBoxSelectorOpen={l.setLotBoxSelectorOpen}
                lotBoxSearch={l.lotBoxSearch}
                setLotBoxSearch={l.setLotBoxSearch}
                lotBoxGroups={l.lotBoxGroups}
                matchedBoxGroups={l.matchedBoxGroups}
                visibleBoxGroups={l.visibleBoxGroups}
                activeBoxGroup={l.activeBoxGroup}
                BOX_RENDER_CAP={l.BOX_RENDER_CAP}
                lotIsbns={l.lotIsbns}
                setShowLotPicker={l.setShowLotPicker}
              />
              <TransmissionBookTable
                filteredLotIsbns={l.filteredLotIsbns}
                paginatedLotIsbns={l.paginatedLotIsbns}
                lotIsbnSearch={l.lotIsbnSearch}
                setLotIsbnSearch={l.setLotIsbnSearch}
                lotBoxFilter={l.lotBoxFilter}
                lotIsbnPagination={l.lotIsbnPagination}
                onFlag={(r) => {
                  l.setFlagModalScan(r)
                  l.setFlagIssue('')
                  l.setFlagRemarks('')
                  l.setFlagError(null)
                  l.setFlagOpen(false)
                }}
              />
            </>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
