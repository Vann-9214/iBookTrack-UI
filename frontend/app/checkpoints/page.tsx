"use client"

import { useBrand } from "@/hooks/use-brand"
import { DashboardNavbar } from "@/components/top-bar"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { cn } from "@/lib/utils"
import { useCheckpoints } from "@/features/checkpoints/hooks/useCheckpoints"
import { CheckpointsHeader } from "@/features/checkpoints/components/CheckpointsHeader"
import { PipelineStageFlow } from "@/features/checkpoints/components/PipelineStageFlow"
import { StageCardsSection } from "@/features/checkpoints/components/StageCardsSection"
import { TransitionLogSection } from "@/features/checkpoints/components/TransitionLogSection"
import { BoxDetailsModal } from "@/features/checkpoints/components/BoxDetailsModal"
import { StageDetailsModal } from "@/features/checkpoints/components/StageDetailsModal"
import { StationActionConfirmModal } from "@/features/checkpoints/components/StationActionConfirmModal"
import { AdvanceValidationModal } from "@/features/checkpoints/components/AdvanceValidationModal"
import { UndoTransitionToast } from "@/features/checkpoints/components/UndoTransitionToast"

export default function StationCheckpointsPage() {
  const { brand } = useBrand()
  const cp = useCheckpoints(brand)
  return (
    <div className={cn("flex h-dvh overflow-hidden bg-background", `theme-${brand}`)}>
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="ambient-bg flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">
            {cp.scannedBox && (
              <BoxDetailsModal
                scannedBox={cp.scannedBox}
                loadingScannedBox={cp.loadingScannedBox}
                checkingSimflexBoxId={cp.checkingSimflexBoxId}
                simflexCheckResult={cp.simflexCheckResult}
                boxDetailsSimflex={cp.boxDetailsSimflex}
                loadingBoxDetailsSimflex={cp.loadingBoxDetailsSimflex}
                onClose={() => cp.setScannedBox(null)}
                onCheckSimflex={(box) => cp.handleCheckSimflexForBox(box, cp.fetchData)}
              />
            )}
            {cp.advanceError && (
              <AdvanceValidationModal advanceError={cp.advanceError} onClose={() => cp.setAdvanceError(null)} />
            )}
            {cp.confirmBox && cp.confirmActionType && (
              <StationActionConfirmModal
                confirmBox={cp.confirmBox}
                confirmActionType={cp.confirmActionType}
                onCancel={() => { cp.setConfirmBox(null); cp.setConfirmActionType(null); }}
                onConfirm={cp.confirmAndExecute}
              />
            )}
            {cp.selectedStage && (
              <StageDetailsModal
                brand={brand}
                selectedStage={cp.selectedStage}
                stageBoxes={cp.boxesByStage[cp.selectedStage]}
                simflexRows={cp.simflexRows}
                simflexRowsLoading={cp.simflexRowsLoading}
                stageModalSearch={cp.stageModalSearch}
                onStageModalSearchChange={cp.setStageModalSearch}
                simflexRowsSearch={cp.simflexRowsSearch}
                onSimflexRowsSearchChange={cp.setSimflexRowsSearch}
                stageModalPage={cp.stageModalPage}
                onStageModalPageChange={cp.setStageModalPage}
                expandedStageBoxId={cp.expandedStageBoxId}
                stageBoxDetails={cp.stageBoxDetails}
                transitions={cp.transitions.transitions}
                actionInProgress={{ advancing: cp.advancing, receiving: cp.receiving, sendingForward: cp.sendingForward, checkingSimflexBoxId: cp.checkingSimflexBoxId }}
                onClose={() => cp.setSelectedStage(null)}
                onToggleBox={cp.toggleStageBoxDetails}
                onConfirm={(box, action) => { cp.setConfirmBox(box); cp.setConfirmActionType(action); }}
              />
            )}
            {cp.undoEntry && (
              <UndoTransitionToast
                undoEntry={cp.undoEntry}
                onUndo={cp.handleUndo}
                onDismiss={() => { cp.setUndoEntry(null); if (cp.undoTimer.current) clearTimeout(cp.undoTimer.current); }}
              />
            )}
            <CheckpointsHeader
              brand={brand}
              topLoading={cp.topLoading}
              transitionsLoading={cp.transitions.transitionsLoading}
              lastUpdated={cp.lastUpdated}
              onRefresh={cp.fetchData}
            />
            <PipelineStageFlow boxesByStage={cp.boxesByStage} scanBooks={cp.scanBooks} transmitBooks={cp.transmitBooks} />
            <StageCardsSection
              brand={brand}
              boxesByStage={cp.boxesByStage}
              scanBooks={cp.scanBooks}
              transmitBooks={cp.transmitBooks}
              topLoading={cp.topLoading}
              onSelectStage={(stage) => { cp.setSelectedStage(stage); cp.setStageModalPage(1); }}
            />
            <TransitionLogSection
              brand={brand}
              transitions={cp.transitions.transitions}
              totalTransitions={cp.transitions.totalTransitions}
              transitionsLoading={cp.transitions.transitionsLoading}
              transitionsPagination={cp.transitions.transitionsPagination}
              expandedTimelineId={cp.transitions.expandedTimelineId}
              searchInput={cp.transitions.transitionSearchInput}
              stageFilter={cp.transitions.transitionStageFilter}
              dateFrom={cp.transitions.transitionDateFrom}
              dateTo={cp.transitions.transitionDateTo}
              onSearchInputChange={cp.transitions.setTransitionSearchInput}
              onSearchApply={cp.transitions.applySearch}
              onStageFilterChange={cp.transitions.setTransitionStageFilter}
              onDateFromChange={cp.transitions.setTransitionDateFrom}
              onDateToChange={cp.transitions.setTransitionDateTo}
              onToggleTimeline={(id) => cp.transitions.setExpandedTimelineId(cp.transitions.expandedTimelineId === id ? null : id)}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
