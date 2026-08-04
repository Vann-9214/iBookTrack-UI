export type TransmissionBrand = 'mustang' | 'jaguar'

export interface PaginationState {
  currentPage: number
  pageSize: number
  totalPages: number
  offset: number
  limit: number
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  setPageSize: (size: number) => void
  canPrevPage: boolean
  canNextPage: boolean
}

export interface PipelineStageSummary {
  Stage: string
  Total: number
  Completed: number
  Ongoing: number
  Failed: number
}

export interface LiveSummary {
  TotalScans?: number
  Failed?: number
  Ongoing?: number
  [key: string]: unknown
}

export interface ScanBook {
  ISBN: string
  BoxNumber?: string | null
  LotNumber?: string | null
  Status?: string
  ScanMachineName?: string | null
  MachineName?: string | null
  ScanUser?: string | null
  Updated?: string
  ScanDate?: string
  isWip?: boolean
  [key: string]: unknown
}

export interface MachineRow {
  MachineName: string
  TotalScans: number
}

export interface MachineBook extends ScanBook {}

export interface LiveResponse {
  success?: boolean
  summary: LiveSummary
  byStage: PipelineStageSummary[]
  recentScans: ScanBook[]
  allBooks: ScanBook[]
  totalBooks: number
  wipCount: number
  byMachine: MachineRow[]
  limitReached?: boolean
}

export interface RankingItem {
  Rank: number
  ScanUser: string
  Books: number
  Pages: number
  Score: string
  ScoreNum: number
}

export interface RankingResponse {
  totalBooks: number
  totalPages: number
  highestOutput: string
  avgOutput: string
  data: RankingItem[]
}

export interface MachineBooksResponse {
  success?: boolean
  books?: MachineBook[]
  error?: string
}

export interface EnrichedData {
  box: string
  lot: string
}

export interface EnrichResponse {
  success?: boolean
  enriched?: Record<string, EnrichedData>
}

export interface LotSearchResult {
  id: string
  lot_number: string
  boxes?: { count?: number }[]
  total_boxes?: number
  type?: string
  created_at?: string
}

export interface LotsSearchResponse {
  lots: LotSearchResult[]
  total: number
}

export interface LotIsbn {
  scan_id?: string
  isbn: string
  box_number?: string | null
  title?: string | null
  current_stage?: string
  scan_status: 'processable' | 'non_processable' | 'reject' | string
  simflex_status?: string | null
  transmission_completed?: boolean
  transmission_date?: string
  rejection_reason?: string
}

export interface LotWipBreakdown {
  done_scan: number
  pre_validation: number
  pdf_conversion: number
  validation: number
}

export interface LotSummary {
  lot_number: string
  total: number
  processable: number
  non_processable: number
  transmitted: number
  isbns: LotIsbn[]
  wip?: LotWipBreakdown
}

export interface LotSummaryResponse extends LotSummary {
  success?: boolean
  error?: string
}

export type StageCategory = 'COMPLETED' | 'ONGOING' | 'FAILED' | 'ALL'

export interface StageFilter {
  stage: string
  category: StageCategory
}

export type TableView = 'books' | 'wip'

export type LotIsbnFilter = 'all' | 'processable' | 'transmitted' | 'wip' | 'non_processable'

export type LotTransmissionFilter =
  | 'all'
  | 'transmitted'
  | 'scan'
  | 'validate'
  | 'pdf_conversion'
  | 'preval'

export interface BoxGroup {
  box_number: string
  total: number
  processable: number
  transmitted: number
  non_processable: number
}

export type LotExpandedSections = Record<string, boolean>
