import { StageBoxRow } from './StageBoxRow'
import { SimflexBookRow } from './SimflexBookRow'
import type {
  BoxItem,
  Stage,
  Transition,
  ConfirmActionType,
  StageBoxDetail,
  SimflexRow,
} from '../types/checkpoints.types'

interface StageDetailsBodyProps {
  brand: string
  selectedStage: Stage
  filteredBoxes: BoxItem[]
  simflexRows: SimflexRow[]
  simflexRowsLoading: boolean
  simflexRowsSearch: string
  stageModalPage: number
  expandedStageBoxId: string | null
  stageBoxDetails: Record<string, StageBoxDetail>
  transitions: Transition[]
  actionInProgress: {
    advancing: string | null
    receiving: string | null
    sendingForward: string | null
    checkingSimflexBoxId: string | null
  }
  onToggleBox: (box: BoxItem) => void
  onConfirm: (box: BoxItem, action: ConfirmActionType) => void
}

export function StageDetailsBody({
  brand,
  selectedStage,
  filteredBoxes,
  simflexRows,
  simflexRowsLoading,
  simflexRowsSearch,
  stageModalPage,
  expandedStageBoxId,
  stageBoxDetails,
  transitions,
  actionInProgress,
  onToggleBox,
  onConfirm,
}: StageDetailsBodyProps) {
  const isSimflexView = selectedStage === 'transmit'

  const filteredSimflex = simflexRows.filter((row) => {
    const q = simflexRowsSearch.toLowerCase().trim()
    if (!q) return true
    return (
      row.ISBN?.toLowerCase().includes(q) ||
      row.BoxNumber?.toLowerCase().includes(q) ||
      row.LotNumber?.toLowerCase().includes(q) ||
      row.ScanUser?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-white">
      {isSimflexView ? (
        <div className="flex flex-col gap-2">
          {simflexRowsLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading books...</div>
          ) : filteredSimflex.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
              {simflexRowsSearch ? 'No matching books found.' : 'No books currently in transmission.'}
            </div>
          ) : (
            filteredSimflex
              .slice((stageModalPage - 1) * 50, stageModalPage * 50)
              .map((row, idx) => <SimflexBookRow key={idx} row={row} />)
          )}
        </div>
      ) : filteredBoxes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
          No boxes at this station.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBoxes
            .slice((stageModalPage - 1) * 50, stageModalPage * 50)
            .map((box, idx) => {
              const absoluteIndex = (stageModalPage - 1) * 50 + idx + 1
              const latestTransition = transitions.find(
                (t) => t.box?.box_number === box.box_number && t.to_stage === box.current_stage
              )
              return (
                <StageBoxRow
                  key={box.id}
                  box={box}
                  brand={brand}
                  selectedStage={selectedStage}
                  isExpanded={expandedStageBoxId === box.id}
                  details={stageBoxDetails[box.id]}
                  latestTransition={latestTransition}
                  actionInProgress={actionInProgress}
                  onToggle={() => onToggleBox(box)}
                  onConfirm={onConfirm}
                  absoluteIndex={absoluteIndex}
                />
              )
            })}
        </div>
      )}
    </div>
  )
}
