'use client'

import React from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { useBrand } from '@/hooks/use-brand'
import { cn } from '@/lib/utils'
import {
  useReports,
  ReportsHeader,
  ReportStatusSummary,
  ReportFilters,
  LotStatusTable,
} from '@/features/reports'

export default function ReportsPage() {
  const { brand } = useBrand()
  const {
    lots,
    filteredLots,
    paginatedLots,
    page,
    setPage,
    totalPages,
    loading,
    isRefreshing,
    error,
    timestamp,
    lastUpdated,
    filter,
    setFilter,
    sortKey,
    sortDir,
    handleSort,
    search,
    setSearch,
    expandedLots,
    toggleLot,
    boxPageByLot,
    setBoxPage,
    fetchData,
    counts,
  } = useReports(brand)

  return (
    <div className={cn('flex h-dvh overflow-hidden bg-background', `theme-${brand}`)}>
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="ambient-bg flex-1 h-0 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">
          <ReportsHeader
            brand={brand}
            timestamp={timestamp}
            lastUpdated={lastUpdated}
            loading={isRefreshing}
            onRefresh={fetchData}
            lots={lots}
          />

          <ReportStatusSummary
            brand={brand}
            filter={filter}
            setFilter={setFilter}
            counts={counts}
          />

          <ReportFilters
            brand={brand}
            lots={lots}
            loading={loading}
            search={search}
            setSearch={setSearch}
            filter={filter}
            setFilter={setFilter}
            counts={counts}
          />

          <LotStatusTable
            brand={brand}
            lots={lots}
            filteredLots={filteredLots}
            paginatedLots={paginatedLots}
            page={page}
            totalPages={totalPages}
            onPageChangeLots={setPage}
            loading={loading}
            error={error}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            expandedLots={expandedLots}
            onToggleLot={toggleLot}
            boxPageByLot={boxPageByLot}
            onPageChange={setBoxPage}
          />
        </div>
        </div>
      </main>
    </div>
  )
}
