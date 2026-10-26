/** Browser-only portfolio data. No credentials, servers or remote services. */
export const STORAGE_KEY = 'ibooktrack_demo_state'
export const DEMO_CHANGED = 'ibooktrack-demo-changed'
export const STAGES = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'storage'] as const
export type Stage = typeof STAGES[number]
export interface DemoBook {
  id: string; isbn: string; title: string; author: string; book_type: string
  scan_status: 'processable' | 'non_processable'; scanned_at: string
  scanned_by_name: string; flag_issue?: string; flag_remarks?: string
  is_resolved?: boolean; transmission_status: string; mismatch_details?: Record<string, string>
}
export interface DemoSession {
  id: string; box_id: string; status: string; updated_at: string
  [key: string]: unknown
}
export interface DemoBox {
  id: string; box_number: string; lot_id: string; current_stage: Stage
  created_at: string; box_type: string; total_expected_books: number
  books: DemoBook[]; box_sessions: DemoSession[]
  lot: { lot_number: string; status: string; type: string }
}
export interface DemoLot {
  id: string; lot_number: string; type: string; created_at: string
  created_by: string; created_by_name: string; boxes: DemoBox[]
}
export interface DemoLocation { id: string; shelf: number; rack: string; level: number; capacity: number }
export interface DemoAssignment { id: string; box_id: string; storage_location_id: string; status: 'pending' | 'confirmed'; assigned_at: string }
export interface DemoState {
  version: 1
  user: { id: string; name: string; email: string; role: 'supervisor' }
  lots: DemoLot[]; locations: DemoLocation[]; assignments: DemoAssignment[]
}
export const now = () => new Date().toISOString()
export const uid = (prefix: string) => `${prefix}-${globalThis.crypto.randomUUID()}`
export const allBoxes = (state: DemoState) => state.lots.flatMap(l => l.boxes)
export const brandName = (value: string) => value.toLowerCase() === 'jaguar' ? 'Jaguar' : 'Mustang'

export function makeSession(boxId: string, stage: Stage, status = 'received'): DemoSession {
  const session: DemoSession = { id: uid('session'), box_id: boxId, status, updated_at: now() }
  for (const s of STAGES.slice(0, STAGES.indexOf(stage) + 1)) {
    session[`${s}_time_received`] = now()
    session[`${s}_user_received`] = 'admin-1'
    session[`${s}_received_profile`] = { name: 'Ivan Cañete' }
    if (s !== stage) {
      session[`${s}_time_send`] = now()
      session[`${s}_time_complete`] = now()
      session[`${s}_complete_at`] = now()
      session[`${s}_send_profile`] = { name: 'Ivan Cañete' }
      session[`${s}_complete_profile`] = { name: 'Ivan Cañete' }
    }
  }
  return session
}

export function makeBox(lot: DemoLot, number: string, stage: Stage = 'warehouse'): DemoBox {
  const id = uid('box')
  return { id, box_number: number, lot_id: lot.id, current_stage: stage, created_at: now(), box_type: lot.type,
    total_expected_books: 0, books: [], box_sessions: [makeSession(id, stage)],
    lot: { lot_number: lot.lot_number, status: 'active', type: lot.type } }
}

export function createDefaultState(): DemoState {
  const catalog = [
    ['9780743273565', 'The Great Gatsby', 'F. Scott Fitzgerald'],
    ['9780060935467', 'To Kill a Mockingbird', 'Harper Lee'],
    ['9780140283334', '1984', 'George Orwell'],
    ['9780735224292', 'Little Fires Everywhere', 'Celeste Ng'],
    ['9780525536291', 'The Midnight Library', 'Matt Haig'],
    ['9780385547079', 'Dune', 'Frank Herbert'],
    ['9780134685991', 'Effective Java', 'Joshua Bloch'],
    ['9780201633610', 'Design Patterns', 'Erich Gamma et al.'],
    ['9780132350884', 'Clean Code', 'Robert C. Martin'],
    ['9781491950357', 'Fluent Python', 'Luciano Ramalho'],
    ['9780321125217', 'Domain-Driven Design', 'Eric Evans'],
    ['9780596516499', 'JavaScript: The Good Parts', 'Douglas Crockford'],
  ]
  const lots: DemoLot[] = ['Mustang', 'Jaguar'].map((type, index) => {
    const lot: DemoLot = { id: `lot-${index + 1}`, lot_number: `LOT-2026-00${index + 1}`, type,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(), created_by: 'admin-1', created_by_name: 'Ivan Cañete', boxes: [] }
    // A sent and a working box in each intermediate station make both tabs useful.
    const stages: Stage[] = ['warehouse', 'inventory', 'inventory', 'cut', 'cut', 'endorsement', 'endorsement', 'scan', 'scan', 'storage']
    lot.boxes = stages.map((stage, n) => {
      const box = makeBox(lot, `BOX-${String(index * 10 + n + 1).padStart(3, '0')}`, stage)
      box.id = `box-${index * 10 + n + 1}`
      box.box_sessions = [makeSession(box.id, stage, n === 0 ? 'completed' : [1, 3, 5].includes(n) ? 'sent' : 'received')]
      box.books = catalog.slice(index * 6, index * 6 + 6).map(([isbn, title, author], b) => ({
        id: `${box.id}-book-${b + 1}`, isbn, title, author, book_type: type,
        scan_status: (n === 6 && b === 4) ? 'non_processable' : 'processable',
        flag_issue: n === 6 && b === 4 ? 'torn-pages' : n === 2 && b === 2 ? 'mismatched-book' : undefined,
        flag_remarks: 'Sample inspection finding', scanned_at: now(), scanned_by_name: 'Ivan Cañete',
        transmission_status: stage === 'storage' || n === 8 ? 'Transmission_Archive COMPLETED' : n === 7 ? ['Scanning COMPLETED', 'Preval ONGOING', 'Tif2PDF ONGOING', 'Jaguar Validate ONGOING', 'Transmission_Archive ONGOING', 'Scanning ONGOING'][b] : 'Pending',
        mismatch_details: n === 2 && b === 2 ? { ilms_title: title, physical_title: `${title} (alternate edition)`, ilms_author: author, physical_author: author } : undefined,
      }))
      box.total_expected_books = box.books.length
      return box
    })
    return lot
  })
  const locations: DemoLocation[] = []
  for (const shelf of [1, 2]) for (const rack of ['A', 'B', 'C', 'D']) for (const level of [1, 2, 3, 4]) {
    locations.push({ id: `loc-${shelf}-${rack}-${level}`, shelf, rack, level, capacity: 8 })
  }
  return { version: 1, user: { id: 'admin-1', name: 'Ivan Cañete', email: 'admin@ibooktrack.io', role: 'supervisor' }, lots, locations,
    assignments: lots.map((lot, i) => ({ id: `assignment-${i}`, box_id: lot.boxes[9].id, storage_location_id: locations[i].id, status: 'confirmed', assigned_at: now() })) }
}

let memoryState: DemoState | undefined
function getState(): DemoState {
  if (typeof window === 'undefined') return createDefaultState()
  let raw: string | null
  try { raw = localStorage.getItem(STORAGE_KEY) } catch { return structuredClone(memoryState ??= createDefaultState()) }
  if (raw) {
    try {
      const state = JSON.parse(raw) as DemoState
      if (state.version === 1 && state.user && Array.isArray(state.lots) && Array.isArray(state.locations) && Array.isArray(state.assignments)) {
        state.user.role = 'supervisor'
        return state
      }
    } catch { /* Recover only this demo's invalid data. */ }
  }
  const state = createDefaultState()
  saveState(state, false)
  return state
}
function saveState(state: DemoState, notify = true) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {
    memoryState = structuredClone(state)
    throw new Error('Demo changes could not be saved. Enable browser storage or free some space, then retry.')
  }
  if (notify) window.dispatchEvent(new Event(DEMO_CHANGED))
}
function resetToDefault() {
  const state = createDefaultState()
  if (typeof window !== 'undefined') {
    for (const key of ['ibooktrack_demo_warehouse_draft', 'ibooktrack_demo_inventory_draft', 'ibooktrack_demo_endorsement_draft', 'ibooktrack_profile_picture', 'ibooktrack_brand']) localStorage.removeItem(key)
  }
  saveState(state)
  return state
}
export const mockStore = { getState, saveState, resetToDefault, createDefaultState }
