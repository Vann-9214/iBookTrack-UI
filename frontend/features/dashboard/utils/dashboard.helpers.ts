export type DashboardBrand = 'mustang' | 'jaguar'

export type SearchResult = {
  type: 'isbn' | 'lot'
  data: Record<string, any>
  books?: Record<string, any>[]
}

export function getRelevantTimeForBox(box: Record<string, any>, stage: string): string | null {
  const session = box.box_sessions?.[0]
  if (!session) return null

  const status = session.status
  if (stage === 'warehouse') {
    if (status === 'completed') return session.updated_at
    if (status === 'received') return session.warehouse_time_received || session.updated_at
    if (status === 'sent') return session.updated_at
  } else if (stage === 'inventory') {
    if (status === 'completed') return session.inventory_time_send || session.updated_at
    if (status === 'received') return session.inventory_time_received || session.updated_at
    if (status === 'sent') return session.inventory_time_send || session.updated_at
    if (box.latest_inventory_scan_at) return box.latest_inventory_scan_at
  } else if (stage === 'cut') {
    if (status === 'completed') return session.cut_time_send || session.updated_at
    if (status === 'received') return session.cut_time_received || session.updated_at
    if (status === 'sent') return session.cut_time_send || session.updated_at
  } else if (stage === 'endorsement') {
    if (status === 'completed') return session.endorsement_time_send || session.updated_at
    if (status === 'received') return session.endorsement_time_received || session.updated_at
    if (status === 'sent') return session.endorsement_time_send || session.updated_at
    if (box.latest_endorsement_scan_at) return box.latest_endorsement_scan_at
  } else if (stage === 'scan') {
    return session.scan_time_received || session.updated_at
  }

  return session.updated_at
}

export function buildPipelineStages(
  boxes: Record<string, any>[],
  transmitBooks: number,
): Record<string, Record<string, number>> {
  const stages: Record<string, Record<string, number>> = {}
  const stageOrder = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit', 'storage']

  for (const stage of stageOrder) {
    let stageBoxes = boxes.filter((box) => {
      if (stage === 'transmit') return box.current_stage === 'scan' && !box.is_fully_completed_in_simflex
      if (stage === 'storage') return box.current_stage === 'storage' || (box.current_stage === 'scan' && box.is_fully_completed_in_simflex)
      if (stage === 'scan') return box.current_stage === 'scan' && !box.is_fully_completed_in_simflex
      return box.current_stage === stage
    })

    if (stage === 'warehouse') stageBoxes = stageBoxes.filter((box) => box.total_expected_books > 0)

    const delayed = stage === 'transmit'
      ? 0
      : stageBoxes.filter((box) => {
          const time = getRelevantTimeForBox(box, stage)
          return time !== null && (Date.now() - new Date(time).getTime()) / 86_400_000 >= 1
        }).length
    const total = stage === 'transmit' ? transmitBooks : stageBoxes.length

    const received = stage === 'warehouse'
      ? total
      : stageBoxes.filter((box) => {
          const session = box.box_sessions?.[0]
          return !session || session.status === 'in_progress' || session.status === 'received'
        }).length

    const completed = stage === 'warehouse'
      ? total
      : stageBoxes.filter((box) => {
          const session = box.box_sessions?.[0]
          return session?.status === 'completed'
        }).length

    const sent = stageBoxes.filter((box) => {
      const session = box.box_sessions?.[0]
      return session?.status === 'sent'
    }).length

    stages[stage] = {
      total,
      active: stage === 'transmit' ? total : Math.max(0, total - delayed),
      received,
      completed,
      sent,
      delayed,
      mustang: stageBoxes.filter((box) => box.box_type === 'Mustang').length,
      jaguar: stageBoxes.filter((box) => box.box_type === 'Jaguar').length,
    }
  }

  return stages
}

export type PipelineCountInput = {
  received?: number
  completed?: number
  sent?: number
  type: string
}

export function formatPipelineCounts({ received, completed, sent, type }: PipelineCountInput): string {
  const normalizedType = type.toLowerCase()

  let rawValues: (number | undefined)[] = []
  if (normalizedType === 'warehouse') {
    rawValues = [received]
  } else if (normalizedType === 'inventory' || normalizedType === 'endorsement') {
    rawValues = [received, completed, sent]
  } else if (normalizedType === 'cut') {
    rawValues = [received, sent]
  } else if (normalizedType === 'scan') {
    rawValues = [received]
  } else {
    rawValues = [received, completed, sent]
  }

  const validValues = rawValues.filter((v): v is number => typeof v === 'number' && !isNaN(v) && v > 0)
  return validValues.join(' ')
}

export function getDashboardDisplayText(currentLot: string, displayRange: string | null) {
  return displayRange || (currentLot ? `Lot ${currentLot.replace(/^lot[-\s]*/i, '').trim()}` : '')
}
