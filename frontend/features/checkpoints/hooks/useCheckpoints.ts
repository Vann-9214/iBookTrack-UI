import { useCallback } from 'react'
import { usePipelineTransitions } from './usePipelineTransitions'
import { useCheckpointBoxes } from './useCheckpointBoxes'
import { useCheckpointBoxDetails } from './useCheckpointBoxDetails'
import { useCheckpointActions } from './useCheckpointActions'
import { useCheckpointScanner } from './useCheckpointScanner'
import { useStageModal } from './useStageModal'

export function useCheckpoints(brand: string) {
  const transitions = usePipelineTransitions(brand)
  const boxes = useCheckpointBoxes(brand)
  const boxDetails = useCheckpointBoxDetails(brand)
  const stageModal = useStageModal(brand)

  const refreshAll = useCallback(async () => {
    await boxes.fetchData()
    await transitions.refresh()
  }, [boxes.fetchData, transitions.refresh])

  const actions = useCheckpointActions(refreshAll)
  const scanner = useCheckpointScanner(boxes.boxes, boxDetails.openBoxDetails)

  return {
    ...boxes,
    transitions,
    ...boxDetails,
    ...actions,
    ...scanner,
    ...stageModal,
    fetchData: refreshAll,
  }
}
