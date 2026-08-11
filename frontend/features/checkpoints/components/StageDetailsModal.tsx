import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { StageDetailsHeader } from './StageDetailsHeader'
import { StageDetailsBody } from './StageDetailsBody'
import { StageDetailsFooter } from './StageDetailsFooter'
import type {
  BoxItem,
  Stage,
  Transition,
  ConfirmActionType,
  StageBoxDetail,
  SimflexRow,
} from '../types/checkpoints.types'

interface StageDetailsModalProps {
  brand: string
  selectedStage: Stage
  stageBoxes: BoxItem[]
  simflexRows: SimflexRow[]
  simflexRowsLoading: boolean
  stageModalSearch: string
  onStageModalSearchChange: (value: string) => void
  simflexRowsSearch: string
  onSimflexRowsSearchChange: (value: string) => void
  stageModalPage: number
  onStageModalPageChange: (page: number) => void
  expandedStageBoxId: string | null
  stageBoxDetails: Record<string, StageBoxDetail>
  transitions: Transition[]
  actionInProgress: {
    advancing: string | null
    receiving: string | null
    sendingForward: string | null
    checkingSimflexBoxId: string | null
  }
  onClose: () => void
  onToggleBox: (box: BoxItem) => void
  onConfirm: (box: BoxItem, action: ConfirmActionType) => void
}

export function StageDetailsModal(props: StageDetailsModalProps) {
  const {
    brand,
    selectedStage,
    stageBoxes,
    simflexRows,
    simflexRowsLoading,
    stageModalSearch,
    onStageModalSearchChange,
    simflexRowsSearch,
    onSimflexRowsSearchChange,
    stageModalPage,
    onStageModalPageChange,
    expandedStageBoxId,
    stageBoxDetails,
    transitions,
    actionInProgress,
    onClose,
    onToggleBox,
    onConfirm,
  } = props

  const isSimflexView = selectedStage === 'transmit'

  const filteredBoxes = stageBoxes.filter((box) => {
    const q = stageModalSearch.toLowerCase().trim()
    if (!q) return true
    return (
      box.box_number.toLowerCase().includes(q) ||
      (box.lot?.lot_number || '').toLowerCase().includes(q)
    )
  })

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

  const totalItems =
    selectedStage === 'transmit'
      ? filteredSimflex.length
      : filteredBoxes.length
  const totalPages = Math.max(1, Math.ceil(totalItems / 50))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-overlay-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[88vh] flex flex-col overflow-hidden animate-modal-in ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <StageDetailsHeader
          brand={brand}
          selectedStage={selectedStage}
          stageBoxesCount={stageBoxes.length}
          simflexRowsCount={simflexRows.length}
          simflexRowsLoading={simflexRowsLoading}
          onClose={onClose}
        />

        <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={isSimflexView ? 'Search ISBN, box, or user…' : 'Search box number or lot...'}
              value={isSimflexView ? simflexRowsSearch : stageModalSearch}
              onChange={(e) => {
                if (isSimflexView) onSimflexRowsSearchChange(e.target.value)
                else onStageModalSearchChange(e.target.value)
              }}
              className="pl-10 h-11 bg-background border-border/50 focus-visible:border-primary focus-visible:ring-1 hover:border-border transition-colors rounded-xl shadow-sm text-sm"
            />
          </div>
        </div>

        <StageDetailsBody
          brand={brand}
          selectedStage={selectedStage}
          filteredBoxes={filteredBoxes}
          simflexRows={simflexRows}
          simflexRowsLoading={simflexRowsLoading}
          simflexRowsSearch={simflexRowsSearch}
          stageModalPage={stageModalPage}
          expandedStageBoxId={expandedStageBoxId}
          stageBoxDetails={stageBoxDetails}
          transitions={transitions}
          actionInProgress={actionInProgress}
          onToggleBox={onToggleBox}
          onConfirm={onConfirm}
        />

        <StageDetailsFooter
          totalItems={totalItems}
          stageModalPage={stageModalPage}
          totalPages={totalPages}
          onPageChange={onStageModalPageChange}
        />
      </div>
    </div>
  )
}
