'use client'

import { useState } from 'react'
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
  const [activeTab, setActiveTab] = useState('lot')


  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="overflow-x-auto w-full sm:w-auto">
          <TabsList className={cn("w-full flex bg-white/70 border-transparent shadow-sm ring-1 ring-black/5 h-8 p-0.5 rounded-lg", t.loading && "opacity-50 pointer-events-none")}>
            <TabsTrigger value="queue" className="flex-1 text-[11px] px-2 sm:px-4 py-1 rounded-md transition font-medium data-[state=active]:font-bold whitespace-nowrap">
              Live Scan Feed
            </TabsTrigger>
            <TabsTrigger value="machine" className="flex-1 text-[11px] px-2 sm:px-4 py-1 rounded-md transition font-medium data-[state=active]:font-bold whitespace-nowrap">
              By Machine
            </TabsTrigger>
            <TabsTrigger value="lot" className="flex-1 text-[11px] px-2 sm:px-4 py-1 rounded-md transition font-medium data-[state=active]:font-bold whitespace-nowrap flex items-center justify-center">
              <Package className="h-3 w-3 mr-1.5" />
              Lot & Box
            </TabsTrigger>
          </TabsList>
        </div>

        {activeTab === 'queue' && (
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 p-0.5">
            <button
              onClick={() => t.setTableView('books')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition duration-200',
                t.tableView === 'books' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  t.tableView === 'books' ? ('bg-primary') : 'bg-gray-400'
                )}
              />
              {t.loading ? '…' : t.totalBooks} Books
            </button>
            <button
              onClick={() => t.setTableView('wip')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition duration-200',
                t.tableView === 'wip' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', t.tableView === 'wip' ? 'bg-red-500' : 'bg-gray-400')} />
              {t.loading ? '…' : t.wipCount} WIP
            </button>
          </div>
        )}
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
              brand={brand}
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
                brand={brand}
                filteredLotIsbns={l.filteredLotIsbns}
                paginatedLotIsbns={l.paginatedLotIsbns}
                lotIsbnSearch={l.lotIsbnSearch}
                setLotIsbnSearch={l.setLotIsbnSearch}
                lotBoxFilter={l.lotBoxFilter}
                lotStages={l.lotStages}
                lotStageFilter={l.lotStageFilter}
                setLotStageFilter={l.setLotStageFilter}
                lotTransmissionFilter={l.lotTransmissionFilter}
                setLotTransmissionFilter={l.setLotTransmissionFilter}
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
