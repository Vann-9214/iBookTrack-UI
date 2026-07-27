export interface QCFlag {
  scan_id: number
  isbn: string
  title?: string
  issue: string
  remarks?: string
  flagged_at?: string
  flagged_by_name?: string
  assigned_box?: {
    box_number: string
    lot?: {
      lot_number: string
    }
  }
}

export interface BoxGroup {
  box_number: string
  flags: QCFlag[]
}

export interface LotGroup {
  lot_number: string
  boxes: Record<string, BoxGroup>
  totalFlags: number
}

export type SelectedCategory = 'Total' | 'Damage' | 'Mismatch' | 'Resolved' | null
