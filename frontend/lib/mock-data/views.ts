import { allBoxes, STAGES, type DemoState, type DemoBox, type DemoBook, type DemoLot } from './store'

export const completed = (book: DemoBook) => book.transmission_status === 'Transmission_Archive COMPLETED'
export const processable = (book: DemoBook) => book.scan_status === 'processable'
export const matches = (value: string, query: string | null) => !query || value.toLowerCase().includes(query.toLowerCase())
export const sameBrand = (value: string, brand: string | null) => !brand || value.toLowerCase() === brand.toLowerCase()
export function bookView(book: DemoBook) {
  return { ...book, book_id: book.id, scan_id: book.id, warehouse_scan_at: book.scanned_at,
    rejection_reason: book.flag_issue, notes: book.flag_remarks, books: { isbn: book.isbn, title: book.title, author: book.author },
    flag: book.flag_issue ? { issue: book.flag_issue, remarks: book.flag_remarks || '', flagged_at: book.scanned_at } : null }
}
export function boxView(box: DemoBox) {
  const session = box.box_sessions[0]
  const transmitted = box.books.filter(completed).length
  return { ...box, books: box.books.map(bookView), scans: [{ count: box.books.length }],
    total_transmitted_books: transmitted, total_processable_books: box.books.filter(processable).length,
    total_nonprocessable_books: box.books.filter(b => !processable(b)).length,
    is_fully_completed_in_simflex: box.books.filter(processable).every(completed),
    session_id: session?.id, status: session?.status, last_touched_by: 'Ivan Cañete',
    latest_inventory_scan_at: session?.inventory_complete_at || null,
    latest_endorsement_scan_at: session?.endorsement_complete_at || null,
    box_sessions: box.box_sessions.map(s => ({ ...s, total_scanned_books: box.books.length,
      total_processable_books: box.books.filter(processable).length, total_nonprocessable_books: box.books.filter(b => !processable(b)).length })) }
}
export function sessionView(box: DemoBox) {
  return { ...box.box_sessions[0], total_scanned_books: box.books.length,
    total_processable: box.books.filter(processable).length, total_non_processable: box.books.filter(b => !processable(b)).length }
}
export function qcFlags(boxes: DemoBox[]) {
  return boxes.flatMap(box => box.books.filter(b => b.flag_issue).map(book => ({
    scan_id: book.id, id: book.id, isbn: book.isbn, title: book.title, author: book.author,
    issue: book.flag_issue, remarks: book.flag_remarks, flagged_at: book.scanned_at, flagged_by_name: book.scanned_by_name,
    is_resolved: !!book.is_resolved, assigned_box: { id: box.id, box_number: box.box_number, box_type: box.box_type, lot: box.lot },
    box_type: box.box_type, mismatch_details: book.mismatch_details,
  })))
}
export function scanRows(boxes: DemoBox[]) {
  return boxes.filter(box => ['scan', 'storage'].includes(box.current_stage)).flatMap(box => box.books.filter(processable).map((book, i) => ({
    ISBN: book.isbn, Title: book.title, Author: book.author, BookID: book.id, scan_id: book.id,
    BoxNumber: box.box_number, LotNumber: box.lot.lot_number, Status: book.transmission_status,
    MachineName: `SC-${String(i % 4 + 1).padStart(2, '0')}`, ScanMachineName: `SC-${String(i % 4 + 1).padStart(2, '0')}`,
    ScanUser: ['Ivan Cañete', 'Sarah Mendoza', 'James Reyes', 'Anna Perez'][i % 4],
    Updated: book.scanned_at, ScanDate: book.scanned_at, book_type: box.box_type, isWip: !completed(book),
  })))
}
export function liveView(boxes: DemoBox[], params: URLSearchParams) {
  const rows = scanRows(boxes).filter(r => (!params.get('from') || r.Updated.slice(0, 10) >= params.get('from')!) && (!params.get('to') || r.Updated.slice(0, 10) <= params.get('to')!))
  const byStage = ['Scanning', 'Preval', 'Tif2PDF', 'Jaguar Validate', 'Transmission_Archive'].map(Stage => {
    const selected = rows.filter(r => r.Status.startsWith(Stage))
    return { Stage, Total: selected.length, Completed: selected.filter(r => r.Status.endsWith('COMPLETED')).length,
      Ongoing: selected.filter(r => r.Status.endsWith('ONGOING')).length, Failed: selected.filter(r => r.Status.endsWith('FAILED')).length }
  })
  const transmitted = rows.filter(r => !r.isWip).length
  return { success: true, summary: { TotalScans: rows.length, Completed: transmitted, Ongoing: rows.length - transmitted, Failed: 0, completedTransmissions: transmitted },
    byStage, stageCounts: byStage.map(s => ({ ...s, stage: s.Stage, label: s.Stage })), recentScans: rows, allBooks: rows,
    totalBooks: rows.length, wipCount: rows.length - transmitted, scanWipCount: rows.filter(r => r.isWip && !r.Status.startsWith('Transmission')).length,
    transmitBooks: rows.filter(r => r.Status === 'Transmission_Archive ONGOING').length,
    allTimeTotal: boxes.reduce((n,b) => n + b.books.length, 0),
    byMachine: [...new Set(rows.map(r => r.MachineName))].map(MachineName => ({ MachineName, TotalScans: rows.filter(r => r.MachineName === MachineName).length })) }
}
export function reportLot(lot: DemoLot) {
  const books = lot.boxes.flatMap(b => b.books)
  const stored = lot.boxes.filter(b => b.current_stage === 'storage').length
  const transmitted = books.filter(completed).length
  return { lot_id: lot.id, id: lot.id, lot_number: lot.lot_number, lot_status: 'active',
    computed_status: stored === lot.boxes.length && stored > 0 ? 'closed' : lot.boxes.every(b => b.current_stage === 'warehouse') ? 'open' : 'in-progress',
    created_at: lot.created_at, created_by: lot.created_by, created_by_name: lot.created_by_name,
    total_boxes: lot.boxes.length, active_boxes: lot.boxes.length - stored, stored_boxes: stored,
    total_scans: books.length, transmitted, non_processable: books.filter(b => !processable(b)).length,
    pending: books.filter(b => processable(b) && !completed(b)).length,
    boxes: lot.boxes.map(b => ({ box_id: b.id, box_number: b.box_number, current_stage: b.current_stage,
      total_books: b.books.length, processable: b.books.filter(processable).length, non_processable: b.books.filter(x => !processable(x)).length,
      progress: Math.round(STAGES.indexOf(b.current_stage) / (STAGES.length - 1) * 100), transmitted_books: b.books.filter(completed).length,
      pending_books: b.books.filter(x => processable(x) && !completed(x)).length, simflex_breakdown: {} })) }
}
export function assignmentView(state: DemoState, a: DemoState['assignments'][number]) {
  const box = allBoxes(state).find(b => b.id === a.box_id)!
  const loc = state.locations.find(l => l.id === a.storage_location_id)!
  return { ...a, assignment_id: a.id, box_number: box.box_number, lot_number: box.lot.lot_number, total_books: box.books.length,
    books: box.books.filter(processable), location_id: loc.id, shelf: loc.shelf, rack: loc.rack, level: loc.level,
    location_label: `Shelf ${loc.shelf} - Rack ${loc.rack} - Level ${loc.level}` }
}
export function locationsView(state: DemoState) {
  return state.locations.map(l => ({ ...l, used: state.assignments.filter(a => a.storage_location_id === l.id && a.status === 'confirmed').length,
    assignments: state.assignments.filter(a => a.storage_location_id === l.id).map(a => assignmentView(state,a)) }))
}
