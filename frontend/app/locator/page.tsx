"use client"

import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { cn } from "@/lib/utils"
import { authFetch } from "@/lib/auth-api"
import { DashboardNavbar } from "@/components/top-bar"
import { useBrand } from "@/hooks/use-brand"
import { AlertTriangle } from "lucide-react"

import { useLocator, useStorageSearch, useStorageTopology } from "@/features/locator/hooks"
import { getSuggestedLocation } from "@/features/locator/utils/locator.helpers"
import {
  LocatorHeader,
  LocatorSearch,
  LocatorSearchResults,
  StorageLegend,
  StorageGrid,
  ReadyBoxList,
  PendingAssignmentList,
  StorageSlotDetailsModal,
  AssignBoxesModal,
  StorageTopologyConfirmModal,
  LocatorWarningModal
} from "@/features/locator/components"

export default function WarehouseLocatorPage() {
  const { brand } = useBrand()

  const {
    locations,
    setLocations,
    readyBoxes,
    pendingAssignments,
    loadingLocations,
    loadingReady,
    loadingPending,
    error,
    lastUpdated,
    confirmingId,
    expandedPendingLocations,
    setExpandedPendingLocations,
    detailSlot,
    setDetailSlot,
    expandedBox,
    setExpandedBox,
    assignSlot,
    setAssignSlot,
    assigningBoxIds,
    setAssigningBoxIds,
    selectedReadyBoxIds,
    setSelectedReadyBoxIds,
    assignLoading,
    removingIds,
    selectedRemoveAssignments,
    setSelectedRemoveAssignments,
    refreshLocator,
    openAssign,
    selectReadyBox,
    handleAssign,
    handleConfirmAssignments,
    handleRemovePendingAssignments,
    handleRemoveBatch,
    isRefreshing
  } = useLocator(brand)

  const {
    totalSections,
    setTotalSections,
    activeSection,
    setActiveSection,
    provisioningSection,
    removingSection,
    addingRack,
    removingRack,
    addingLevel,
    removingLevel,
    warningModal,
    setWarningModal,
    pendingRemove,
    setPendingRemove,
    pendingAddSection,
    setPendingAddSection,
    confirmRemoveSection,
    setConfirmRemoveSection,
    editingCapacity,
    setEditingCapacity,
    capacityInput,
    setCapacityInput,
    savingCapacity,
    handleAddRack,
    handleRemoveRack,
    handleAddLevel,
    handleRemoveLevel,
    handleRemoveSection,
    handleEditCapacity
  } = useStorageTopology(locations, setLocations, loadingLocations)

  const {
    searchValue,
    setSearchValue,
    searchResults,
    searchUnlocated,
    searchLoading,
    searchDone,
    searchKind,
    appliedSearchQuery,
    searchValidationError,
    setSearchValidationError,
    lotSearchSummary,
    highlightedCells,
    handleSearch,
    clearSearch,
    activeSearchQuery,
    filteredReadyBoxes,
    filteredPendingAssignments,
    visibleLotSearchBoxCount
  } = useStorageSearch(brand, pendingAssignments, readyBoxes, setExpandedPendingLocations, setActiveSection)

  const selectedReadyBoxes = readyBoxes.filter(box => selectedReadyBoxIds.has(box.id))
  const suggestedLocation = selectedReadyBoxIds.size > 0 ? getSuggestedLocation(locations, selectedReadyBoxIds.size) : null

  return (
    <div className={cn("flex h-dvh overflow-hidden bg-background", `theme-${brand}`)}>
      <DashboardSidebar />

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden min-w-0">
        <DashboardNavbar />
        <div className="ambient-bg flex-1 min-h-0 overflow-auto flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">

          {/* Page Header */}
          <LocatorHeader
            brand={brand}
            refreshLocator={refreshLocator}
            isRefreshing={isRefreshing}
            lastUpdated={lastUpdated}
          />

          {/* Search */}
          <LocatorSearch
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            setSearchValidationError={setSearchValidationError}
            handleSearch={handleSearch}
            searchLoading={searchLoading}
            highlightedCellsCount={highlightedCells.size}
            searchDone={searchDone}
            clearSearch={clearSearch}
            searchValidationError={searchValidationError}
          />

          {/* Search results */}
          <LocatorSearchResults
            searchDone={searchDone}
            lotSearchSummary={lotSearchSummary}
            visibleLotSearchBoxCount={visibleLotSearchBoxCount}
            searchResults={searchResults}
            pendingAssignments={pendingAssignments}
            searchUnlocated={searchUnlocated}
            searchValue={searchValue}
            locations={locations}
            setActiveSection={setActiveSection}
            setDetailSlot={setDetailSlot}
          />

          {/* Legend */}
          <StorageLegend />

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Warehouse Grid & Lists */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,1fr)_2fr_minmax(280px,1fr)] gap-4 items-start">
            {/* Unassigned storage boxes (left) */}
            <ReadyBoxList
              brand={brand}
              filteredReadyBoxes={filteredReadyBoxes}
              loadingReady={loadingReady}
              activeSearchQuery={activeSearchQuery}
              selectedReadyBoxIds={selectedReadyBoxIds}
              selectReadyBox={(box) => selectReadyBox(box, setActiveSection)}
            />

            {/* Center warehouse layout */}
            <StorageGrid
              brand={brand}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              totalSections={totalSections}
              locations={locations}
              selectedReadyBoxes={selectedReadyBoxes}
              suggestedLocation={suggestedLocation}
              loadingLocations={loadingLocations}
              provisioningSection={provisioningSection}
              highlightedCells={highlightedCells}
              selectedReadyBoxIds={selectedReadyBoxIds}
              handleAddLevel={handleAddLevel}
              handleRemoveLevel={handleRemoveLevel}
              handleAddRack={handleAddRack}
              handleRemoveRack={handleRemoveRack}
              handleRemoveSection={handleRemoveSection}
              addingLevel={addingLevel}
              removingLevel={removingLevel}
              addingRack={addingRack}
              removingRack={removingRack}
              removingSection={removingSection}
              setPendingAddSection={setPendingAddSection}
              openAssign={openAssign}
              setDetailSlot={setDetailSlot}
            />

            {/* Pending assignment (right) */}
            <PendingAssignmentList
              filteredPendingAssignments={filteredPendingAssignments}
              loadingPending={loadingPending}
              activeSearchQuery={activeSearchQuery}
              expandedPendingLocations={expandedPendingLocations}
              setExpandedPendingLocations={setExpandedPendingLocations}
              removingIds={removingIds}
              confirmingId={confirmingId}
              handleRemovePendingAssignments={handleRemovePendingAssignments}
              handleConfirmAssignments={handleConfirmAssignments}
            />
          </div>

        </div>
      </main>

      {/* Modals */}
      <StorageSlotDetailsModal
        detailSlot={detailSlot}
        setDetailSlot={setDetailSlot}
        expandedBox={expandedBox}
        setExpandedBox={setExpandedBox}
        editingCapacity={editingCapacity}
        setEditingCapacity={setEditingCapacity}
        capacityInput={capacityInput}
        setCapacityInput={setCapacityInput}
        savingCapacity={savingCapacity}
        handleEditCapacity={handleEditCapacity}
        openAssign={openAssign}
        selectedRemoveAssignments={selectedRemoveAssignments}
        setSelectedRemoveAssignments={setSelectedRemoveAssignments}
        removingIds={removingIds}
        handleRemoveBatch={handleRemoveBatch}
      />

      <AssignBoxesModal
        assignSlot={assignSlot}
        setAssignSlot={setAssignSlot}
        assignLoading={assignLoading}
        loadingReady={loadingReady}
        readyBoxes={readyBoxes}
        assigningBoxIds={assigningBoxIds}
        setAssigningBoxIds={setAssigningBoxIds}
        handleAssign={handleAssign}
      />

      <StorageTopologyConfirmModal
        confirmRemoveSection={confirmRemoveSection}
        setConfirmRemoveSection={setConfirmRemoveSection}
        removingSection={removingSection}
        handleRemoveSection={handleRemoveSection}
        pendingRemove={pendingRemove}
        setPendingRemove={setPendingRemove}
        removingRack={removingRack}
        removingLevel={removingLevel}
        handleRemoveRack={handleRemoveRack}
        handleRemoveLevel={handleRemoveLevel}
        pendingAddSection={pendingAddSection}
        setPendingAddSection={setPendingAddSection}
        totalSections={totalSections}
        setTotalSections={setTotalSections}
        setActiveSection={setActiveSection}
        locations={locations}
        activeSection={activeSection}
      />

      <LocatorWarningModal
        warningModal={warningModal}
        setWarningModal={setWarningModal}
      />
    </div>
  )
}
