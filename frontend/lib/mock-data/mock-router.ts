import { mockStore, allBoxes, brandName, makeBox, makeSession, now, uid, STAGES, type DemoBox, type DemoBook, type DemoLot, type Stage } from './store'
import { bookView, boxView, sessionView, qcFlags, scanRows, liveView, reportLot, completed, processable, matches, sameBrand, locationsView, assignmentView } from './views'

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const error = (message: string, status = 400) => json({ success: false, error: message, message }, status)
const csv = (rows: unknown[][]) => new Response(rows.map(row => row.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n'), { headers: { 'Content-Type': 'text/csv;charset=utf-8' } })

/** Same response contracts as the feature services; never falls back to fetch. */
export async function mockRouter(url: string, options: RequestInit = {}): Promise<Response> {
  try { return route(url, options) } catch (e) { return error(e instanceof Error ? e.message : 'Unable to update demo data', 500) }
}

function route(url: string, options: RequestInit): Response {
  const { pathname, searchParams: p } = new URL(url, 'http://demo.local')
  const path = decodeURIComponent(pathname)
  const method = (options.method || 'GET').toUpperCase()
  // This private boundary accepts the existing feature services' JSON payloads.
  const body = typeof options.body === 'string' ? JSON.parse(options.body) : {}
  const state = mockStore.getState()
  const boxes = allBoxes(state)
  const brand = p.get('box_type') || p.get('type') || p.get('brand') || p.get('location')
  const filtered = boxes.filter(b => sameBrand(b.box_type, brand) && matches(b.lot.lot_number, p.get('lot_number')))
  const lots = state.lots.filter(l => sameBrand(l.type, brand))
  const save = (data: object = { success: true }) => { mockStore.saveState(state); return json(data) }
  const findBook = (id: string) => boxes.flatMap(box => box.books.map(book => ({ box, book }))).find(x => x.book.id === id)
  const take = <T,>(items: T[]) => { const limit = Math.max(1, Number(p.get('limit')) || 1000); const offset = Number(p.get('offset')) || (Math.max(1, Number(p.get('page')) || 1) - 1) * limit; return items.slice(offset, offset + limit) }
  const ready = (box: DemoBox) => box.current_stage === 'scan' && box.books.filter(processable).every(completed)
  function setBook(box: DemoBox, input: Record<string, any>): DemoBook {
    const existing = box.books.find(b => b.isbn === input.isbn)
    const book: DemoBook = { id: existing?.id || uid('book'), isbn: String(input.isbn || ''), title: input.title || 'Demo book', author: input.author || 'Demo author',
      book_type: box.box_type, scan_status: input.scan_status || 'processable', scanned_at: now(), scanned_by_name: state.user.name,
      transmission_status: existing?.transmission_status || 'Pending', ...existing }
    book.scan_status = input.scan_status || book.scan_status
    if (input.title) book.title = input.title
    if (input.author) book.author = input.author
    if (input.flag_issue || input.rejection_reason) {
      book.flag_issue = input.flag_issue || input.rejection_reason
      book.flag_remarks = input.flag_remarks || input.notes || ''
      book.is_resolved = false
    }
    if (input.mismatch_details) book.mismatch_details = input.mismatch_details
    if (existing) box.books[box.books.indexOf(existing)] = book
    else box.books.push(book)
    box.total_expected_books = Math.max(box.total_expected_books, box.books.length)
    return book
  }
  const locateLot = (number: string, type: string) => {
    let lot = state.lots.find(l => l.lot_number === number && sameBrand(l.type, type))
    if (!lot) {
      lot = { id: uid('lot'), lot_number: number, type: brandName(type), created_at: now(), created_by: state.user.id, created_by_name: state.user.name, boxes: [] }
      state.lots.push(lot)
    }
    return lot
  }
  function finish(box: DemoBox) {
    const s = box.box_sessions[0]
    s.status = 'completed'; s.updated_at = now()
    s[`${box.current_stage}_complete_at`] = now()
    s[`${box.current_stage}_complete_by`] = state.user.id
    s[`${box.current_stage}_complete_profile`] = { name: state.user.name }
  }

  if (path === '/api/auth/profile') {
    if (method === 'PATCH') { if (typeof body.name === 'string' && body.name.trim()) state.user.name = body.name.trim(); return save({ success: true, user: state.user, message: 'Demo profile updated.' }) }
    return json(state.user)
  }
  if (['/api/auth/login', '/api/auth/register'].includes(path)) return json({ message: 'Demo login successful', user: state.user })
  if (['/api/auth/logout', '/api/auth/refresh'].includes(path)) return json({ success: true })
  if (path === '/api/auth/password') return json({ message: 'Demo mode: no real password is stored or changed.' })

  if (path === '/api/boxes') {
    const result = filtered.filter(b => (!p.get('lot_id') || b.lot_id === p.get('lot_id')) && (!p.get('current_stage') || p.get('current_stage')!.split(',').includes(b.current_stage)) && matches(b.box_number, p.get('box_number')) && (!p.get('isbn') || b.books.some(book => matches(book.isbn, p.get('isbn')))) && (p.get('exclude_assigned_storage') !== 'true' || !state.assignments.some(a => a.box_id === b.id && a.status === 'confirmed')))
    return json({ success: true, boxes: result.map(boxView) })
  }
  if (path === '/api/boxes/pipeline-transitions') {
    const result = filtered.filter(b => (!p.get('stage') || b.current_stage === p.get('stage')) && (matches(b.box_number, p.get('search')) || matches(b.lot.lot_number, p.get('search')))).map(box => ({
      ...box.box_sessions[0], id: box.box_sessions[0].id, box: boxView(box), from_stage: null, to_stage: box.current_stage,
      created_at: box.created_at, updated_at: box.box_sessions[0].updated_at, moved_by_name: state.user.name, total_scanned_books: box.books.length,
      ...Object.fromEntries(STAGES.flatMap(s => [[`${s}_user_name`, state.user.name], [`${s}_send_name`, state.user.name], [`${s}_scan_name`, state.user.name], [`${s}_scan_at`, box.box_sessions[0][`${s}_complete_at`]]])),
    }))
    return json({ success: true, transitions: take(result), totalCount: result.length })
  }
  const byNumber = path.match(/^\/api\/boxes\/by-number\/(.+)$/)
  if (byNumber) { const box = boxes.find(b => b.box_number === byNumber[1]); return box ? json({ box: boxView(box), success: true }) : error('Box not found', 404) }
  const byLot = path.match(/^\/api\/boxes\/lot\/(.+)$/)
  if (byLot) return json({ success: true, boxes: filtered.filter(b => b.lot.lot_number === byLot[1]).map(boxView) })
  const boxRoute = path.match(/^\/api\/boxes\/([^/]+)(?:\/([^/]+))?$/)
  if (boxRoute) {
    const box = boxes.find(b => b.id === boxRoute[1] || b.box_number === boxRoute[1]); if (!box) return error('Box not found', 404)
    const action = boxRoute[2]; const session = box.box_sessions[0]
    if (!action && method === 'GET') return json({ success: true, box: boxView(box) })
    if (!action && method === 'DELETE') {
      state.lots.forEach(l => { l.boxes = l.boxes.filter(b => b.id !== box.id) }); state.assignments = state.assignments.filter(a => a.box_id !== box.id)
      return save()
    }
    if (action === 'transmission') return json({ success: true, box: boxView(box), summary: { total: box.books.length, transmitted: box.books.filter(completed).length, wip: box.books.filter(b => processable(b) && !completed(b)).length, non_processable: box.books.filter(b => !processable(b)).length }, books: box.books.map(b => ({ ...bookView(b), simflex_status: b.transmission_status, transmission_completed: completed(b), transmission_date: b.scanned_at, scan_user: b.scanned_by_name })) })
    if (action === 'check-simflex') {
      // Explicit local simulation completes this box's digital processing.
      box.books.filter(processable).forEach(b => { b.transmission_status = 'Transmission_Archive COMPLETED' })
      return save({ success: true, autoAdvanced: false, allCompleted: true, finalStage: box.current_stage, totalProcessable: box.books.filter(processable).length, completedCount: box.books.filter(processable).length, pendingCount: 0, notCompleted: [], simflexResults: box.books.map(b => ({ isbn: b.isbn, transmissionCompleted: completed(b), latestStatus: b.transmission_status, boxNumber: box.box_number })), message: 'Demo processing completed. Ready for storage assignment.' })
    }
    if (action === 'advance' || action === 'rollback') {
      if (body.expected_stage && body.expected_stage !== box.current_stage) return error('Box already moved. Refresh the view.', 409)
      const from = box.current_stage; const target = action === 'rollback' ? body.to_stage : STAGES[STAGES.indexOf(from) + 1]
      if (!STAGES.includes(target)) return error('Invalid target stage')
      box.current_stage = target; session.status = 'received'; session.updated_at = now()
      session[`${target}_time_received`] = now(); session[`${target}_user_received`] = state.user.id; session[`${target}_received_profile`] = { name: state.user.name }
      return save({ success: true, box: boxView(box), from_stage: from, to_stage: target })
    }
    if (action === 'send-forward') { session.status = 'sent'; session[`${box.current_stage}_time_send`] = now(); session[`${box.current_stage}_send_profile`] = { name: state.user.name }; return save({ success: true, box: boxView(box) }) }
    if (action === 'receive') { session.status = 'received'; session[`${box.current_stage}_time_received`] = now(); return save({ success: true, box: boxView(box) }) }
    if (action === 'print') { session.inventory_printed_at = now(); session.inventory_printed_by = state.user.id; return save() }
  }

  if (path === '/api/books') return json({ success: true, books: filtered.filter(b => !p.get('box_id') || b.id === p.get('box_id')).flatMap(b => b.books.map(bookView)) })
  const catalog = path.match(/^\/api\/books\/ilms\/search\/(.+)$/)
  if (catalog || path === '/api/warehouse/isbn-stream/query') {
    const isbn = catalog?.[1] || body.isbn
    const box = boxes.find(b => sameBrand(b.box_type, body.type || null) && b.books.some(book => book.isbn === isbn))
    const book = box?.books.find(b => b.isbn === isbn)
    return json({ success: true, data: { ISBN: isbn, Title: book?.title || `Demo book ${isbn}`, AuthorName: book?.author || 'Demo author', LotNo: box?.lot.lot_number || '', BoxNo: box?.box_number || '', 'Received-Status': 'Received' } })
  }
  if (path === '/api/warehouse/ilms-lots') return json({ success: true, lots: state.lots.map(l => ({ lot_number: l.lot_number, type: l.type, boxes: l.boxes.map(b => b.box_number) })) })
  if (path === '/api/warehouse/overview') {
    const result = lots.filter(l => matches(l.lot_number, p.get('search'))).map(l => ({ ...l, total_boxes: l.boxes.length, boxes: l.boxes.filter(b => !p.get('status') || p.get('status') === 'all' || b.box_sessions[0].status === p.get('status')).map(boxView) }))
    return json({ success: true, lots: take(result), pagination: { currentPage: Number(p.get('page')) || 1, totalPages: Math.max(1, Math.ceil(result.length / (Number(p.get('limit')) || 10))), totalItems: result.length } })
  }
  if (path === '/api/warehouse/box-exists') return json({ success: true, exists: filtered.some(b => b.box_number === p.get('box_number') && b.lot.lot_number === p.get('lot_number')) })
  if (path === '/api/warehouse/sessions/start' || path === '/api/warehouse/sessions/bulk-save') {
    const lot = locateLot(body.lot_number, body.book_type || body.type || 'mustang')
    let box = lot.boxes.find(b => b.box_number === body.box_number)
    if (!box) { box = makeBox(lot, body.box_number); lot.boxes.push(box) }
    if (path.endsWith('/start')) { box.box_sessions[0].status = 'in_progress'; return save({ success: true, session: sessionView(box), lot_id: lot.id, lot_number: lot.lot_number }) }
    for (const book of body.scanned_books || []) setBook(box, book)
    for (const issue of body.issues || []) setBook(box, { ...issue, scan_status: 'non_processable', flag_issue: issue.type, flag_remarks: 'Recorded during verification' })
    box.total_expected_books = Number(body.total_expected_books) || box.books.length
    finish(box)
    return save({ success: true, session: sessionView(box), message: 'Demo session saved.' })
  }
  if (path === '/api/warehouse/sessions') return json({ success: true, sessions: boxes.map(sessionView) })
  const sessionRoute = path.match(/^\/api\/warehouse\/sessions\/([^/]+)(?:\/(scan|complete))?$/)
  if (sessionRoute) {
    const box = boxes.find(b => b.box_sessions.some(s => s.id === sessionRoute[1])); if (!box) return error('Session not found', 404)
    if (sessionRoute[2] === 'scan') { const book = setBook(box, body); box.box_sessions[0][`${body.stage || box.current_stage}_session_started_at`] = now(); return save({ success: true, scanLog: bookView(book), session: sessionView(box) }) }
    if (sessionRoute[2] === 'complete') { for (const issue of body.issues || []) setBook(box, { ...issue, scan_status: 'non_processable', flag_issue: issue.type }); finish(box); return save({ success: true, session: sessionView(box) }) }
    if (method === 'DELETE') { box.box_sessions[0].status = 'received'; return save() }
    return json({ success: true, session: sessionView(box), scans: box.books.map(bookView) })
  }
  const warehouseBox = path.match(/^\/api\/warehouse\/boxes\/([^/]+)\/(scans|resume-session|cancel-session)$/)
  if (warehouseBox) {
    const box = boxes.find(b => b.id === warehouseBox[1]); if (!box) return error('Box not found', 404)
    if (warehouseBox[2] === 'scans') return json({ success: true, warehouse_books: box.books.map(bookView) })
    box.box_sessions[0].status = warehouseBox[2] === 'resume-session' ? 'in_progress' : 'received'
    if (warehouseBox[2] === 'resume-session') { box.box_sessions[0][`${box.current_stage}_session_started_at`] = now(); box.box_sessions[0][`${box.current_stage}_session_started_by`] = state.user.id }
    return save({ success: true, session: sessionView(box) })
  }
  const flagRoute = path.match(/^\/api\/(?:warehouse\/scans|books)\/([^/]+)\/(flag|tag)$/)
  if (flagRoute) {
    const found = findBook(flagRoute[1]); if (!found) return error('Book not found', 404)
    if (method === 'DELETE') { found.book.flag_issue = undefined; found.book.flag_remarks = undefined; found.book.scan_status = 'processable' }
    else {
      found.book.flag_issue = body.rejection_reason || body.issue || body.flag_issue || 'other'
      found.book.flag_remarks = body.notes || body.remarks || body.flag_remarks || ''
      found.book.scan_status = ['mismatched-book', 'mismatch'].includes(found.book.flag_issue!) ? 'processable' : 'non_processable'
      found.book.is_resolved = false
      if (body.physical_title) found.book.mismatch_details = { physical_title: body.physical_title, ilms_title: body.ilms_title || found.book.title, physical_author: body.physical_author || '', ilms_author: body.ilms_author || found.book.author }
    }
    return save({ success: true, scan: bookView(found.book) })
  }
  const searchIsbn = path.match(/^\/api\/(?:warehouse\/search\/isbn|dashboard\/check-missing-isbn)\/(.+)$/)
  if (searchIsbn) {
    const box = filtered.find(b => b.books.some(book => book.isbn === searchIsbn[1])); const book = box?.books.find(b => b.isbn === searchIsbn[1])
    return json({ success: !!book, found: !!book, message: book ? 'Found in demo catalog' : 'ISBN not found in demo catalog', book: book && { ...bookView(book), in_warehouse: true, in_ilms: true, box_number: box!.box_number, lot_number: box!.lot.lot_number, current_stage: box!.current_stage } })
  }

  if (path === '/api/dashboard/stats' || path === '/api/dashboard/pipeline-stats') {
    const books = filtered.flatMap(b => b.books)
    const pipelineStages = Object.fromEntries(STAGES.map(s => [s, { total: filtered.filter(b => b.current_stage === s).length, active: filtered.filter(b => b.current_stage === s).length, received: filtered.filter(b => b.current_stage === s).length, sent: 0, delayed: 0, completed: 0 }]))
    return json({ success: true, stats: { totalBooks: books.length, activeBoxes: filtered.filter(b => b.current_stage !== 'storage').length, activeLots: lots.filter(l => l.boxes.some(b => b.current_stage !== 'storage')).length, unaccountedBooks: qcFlags(filtered).filter(f => !f.is_resolved).length, openLots: lots.length, pipelineStages, dailyTransmitted: books.filter(completed).length }, today: filtered.length, activeTransmitBooks: books.filter(b => b.transmission_status === 'Transmission_Archive ONGOING').length, pipelineToday: filtered.length })
  }
  if (path === '/api/dashboard/qc-flags' || path === '/api/warehouse/rejected-books') { const flags = qcFlags(filtered); return json({ success: true, flags: take(flags), total: flags.length, books: take(flags) }) }
  const resolve = path.match(/^\/api\/dashboard\/qc-flags\/([^/]+)\/resolve$/)
  if (resolve) { const found = findBook(resolve[1]); if (!found) return error('Flag not found', 404); found.book.is_resolved = true; found.book.scan_status = 'processable'; return save() }
  if (path === '/api/dashboard/qc-flags/export/mismatch') return json({ success: true, rows: filtered.flatMap(box => box.books.filter(b => b.mismatch_details).map(book => ({ ...book.mismatch_details, isbn: book.isbn, lot: box.lot.lot_number, box: box.box_number, project_type: box.box_type, date: book.scanned_at, lot_number: box.lot.lot_number, box_number: box.box_number, scanned_at: book.scanned_at, flagged_at: book.scanned_at, notes: book.flag_remarks }))) })
  if (path === '/api/dashboard/daily-output') { const rows = scanRows(filtered).filter(r => !r.isWip).map(r => ({ isbn: r.ISBN, title: r.Title, author: r.Author, lot_number: r.LotNumber, box_number: r.BoxNumber, scan_user: r.ScanUser, page_count: 200, completed_at: r.Updated })); return json({ success: true, rows: take(rows), total: rows.length }) }
  if (path === '/api/dashboard/open-lots') return json({ success: true, lots: take(lots.map(l => { const r = reportLot(l); return { ...r, total_books: r.total_scans, status: r.computed_status, completion_progress: r.total_scans ? Math.round(r.transmitted / r.total_scans * 100) : 0 } })), total: lots.length })
  const lotDetails = path.match(/^\/api\/dashboard\/lot-details\/(.+)$/)
  if (lotDetails) { const lot = lots.find(l => l.lot_number === lotDetails[1]); return json({ success: !!lot, lot: lot && { ...reportLot(lot), boxes: lot.boxes.map(boxView) } }) }
  if (path === '/api/reports/lot-status') return json({ success: true, lots: lots.map(reportLot) })
  if (path === '/api/lots') { const result = lots.filter(l => matches(l.lot_number, p.get('search'))).map(l => ({ ...l, total_boxes: l.boxes.length })); return json({ lots: take(result), total: result.length }) }
  const lotRoute = path.match(/^\/api\/lots\/([^/]+)(?:\/transmission-summary)?$/)
  if (lotRoute) {
    const lot = lots.find(l => l.lot_number === lotRoute[1]); if (!lot) return error('Lot not found', 404)
    const books = lot.boxes.flatMap(box => box.books.map(book => ({ ...bookView(book), box_number: box.box_number, current_stage: box.current_stage, simflex_status: book.transmission_status, transmission_completed: completed(book), transmission_date: book.scanned_at })))
    return json({ success: true, lot, lot_number: lot.lot_number, total: books.length, processable: books.filter(processable).length, non_processable: books.filter(b => !processable(b)).length, transmitted: books.filter(completed).length, isbns: books, wip: { done_scan: 0, pre_validation: 0, pdf_conversion: 0, validation: 0 } })
  }

  if (path === '/api/storage/locations') return json({ success: true, locations: locationsView(state) })
  if (path === '/api/storage/ready-boxes') return json({ success: true, boxes: filtered.filter(b => ready(b) && !state.assignments.some(a => a.box_id === b.id)).map(b => ({ ...boxView(b), lot_number: b.lot.lot_number, total_books: b.books.length })) })
  if (path === '/api/storage/pending-assignments') return json({ success: true, assignments: state.assignments.filter(a => a.status === 'pending' && filtered.some(b => b.id === a.box_id)).map(a => assignmentView(state,a)) })
  if (path === '/api/storage/locations/provision') {
    for (const rack of body.racks || ['A','B','C','D']) for (const level of body.levels || [1,2,3,4]) {
      if (!state.locations.some(l => l.shelf === Number(body.section) && l.rack === rack && l.level === Number(level))) state.locations.push({ id: uid('loc'), shelf: Number(body.section), rack, level: Number(level), capacity: Number(body.capacity) || 8 })
    }
    return save({ success: true, locations: locationsView(state) })
  }
  const locationRoute = path.match(/^\/api\/storage\/locations\/([^/]+)$/)
  if (locationRoute) {
    const loc = state.locations.find(l => l.id === locationRoute[1]); if (!loc) return error('Location not found', 404)
    const count = state.assignments.filter(a => a.storage_location_id === loc.id).length
    if (method === 'DELETE') { if (count) return error('Remove assigned boxes first'); state.locations = state.locations.filter(l => l.id !== loc.id); return save() }
    if (!Number.isInteger(body.capacity) || body.capacity < Math.max(1,count)) return error('Capacity must accommodate current assignments')
    loc.capacity = body.capacity; return save({ success: true, location: loc })
  }
  if (path === '/api/storage/assign/batch') {
    const loc = state.locations.find(l => l.id === body.storage_location_id); if (!loc) return error('Location not found',404)
    const ids = [...new Set<string>(body.box_ids || [])]
    if (state.assignments.filter(a => a.storage_location_id === loc.id).length + ids.length > loc.capacity) return error('Location capacity exceeded')
    if (ids.some(id => !boxes.some(b => b.id === id && ready(b)) || state.assignments.some(a => a.box_id === id))) return error('Choose unassigned boxes with completed processing')
    const added = ids.map(box_id => ({ id: uid('assignment'), box_id, storage_location_id: loc.id, status: 'pending' as const, assigned_at: now() }))
    state.assignments.push(...added); return save({ success: true, assignments: added.map(a => assignmentView(state,a)) })
  }
  const confirm = path.match(/^\/api\/storage\/assignments\/([^/]+)\/confirm$/)
  if (confirm) { const a = state.assignments.find(a => a.id === confirm[1]); if (!a) return error('Assignment not found',404); a.status = 'confirmed'; boxes.find(b => b.id === a.box_id)!.current_stage = 'storage'; return save({ success: true, assignment: assignmentView(state,a) }) }
  if (path === '/api/storage/assignments/batch') {
    const removed = state.assignments.filter(a => body.assignment_ids?.includes(a.id)); for (const a of removed) boxes.find(b => b.id === a.box_id)!.current_stage = 'scan'
    state.assignments = state.assignments.filter(a => !body.assignment_ids?.includes(a.id)); return save()
  }
  if (path === '/api/storage/search') {
    const found = filtered.filter(b => p.get('search_type') === 'isbn' ? b.books.some(book => matches(book.isbn,p.get('q'))) : matches(p.get('search_type') === 'lot' ? b.lot.lot_number : b.box_number,p.get('q')))
    return json({ success: true, results: state.assignments.filter(a => found.some(b => b.id === a.box_id)).map(a => assignmentView(state,a)), unlocated: found.filter(b => !state.assignments.some(a => a.box_id === b.id)).map(b => ({ box_id: b.id, box_number: b.box_number })), lot_summary: { lot_numbers: [...new Set(found.map(b => b.lot.lot_number))], box_count: found.length } })
  }

  if (path === '/api/scanning/live') return json(liveView(filtered,p))
  if (path === '/api/scanning/scan-rows' || path === '/api/scanning/transmit-rows') return json({ success: true, rows: scanRows(filtered).filter(r => path.endsWith('/transmit-rows') ? r.Status.startsWith('Transmission') : !r.Status.startsWith('Transmission')) })
  if (path === '/api/scanning/machine-books') return json({ success: true, books: liveView(filtered,p).allBooks.filter(r => r.MachineName === p.get('machine')) })
  if (path === '/api/scanning/ranking') {
    const rows = scanRows(filtered); const users = [...new Set(rows.map(r => r.ScanUser))]
    return json({ totalBooks: rows.length, totalPages: rows.length * 200, highestOutput: String(Math.ceil(rows.length / Math.max(users.length,1))), avgOutput: String(rows.length / Math.max(users.length,1)), data: users.map((ScanUser,i) => ({ Rank:i+1, ScanUser, Books:rows.filter(r=>r.ScanUser===ScanUser).length, Pages:rows.filter(r=>r.ScanUser===ScanUser).length*200, Score:'100', ScoreNum:100 })) })
  }
  if (path === '/api/scanning/simflex-status') {
    const results = (p.get('isbns') || '').split(',').filter(Boolean).map(isbn => { const b = filtered.flatMap(b=>b.books).find(b=>b.isbn===isbn); return { isbn, latestStatus: b?.transmission_status || 'Pending', transmissionCompleted: b ? completed(b) : false, latestUpdated: b?.scanned_at } })
    return json({ success: true, results, statuses: Object.fromEntries(results.map(r => [r.isbn, r])) })
  }
  if (path === '/api/scanning/enrich-ilms') return json({ success: true, enriched: Object.fromEntries((body.isbns || []).map((isbn: string) => { const box = boxes.find(b => b.books.some(book=>book.isbn===isbn)); return [isbn,{ box:box?.box_number || '—', lot:box?.lot.lot_number || '—' }] })) })
  if (path === '/api/scanning/export') return csv([['ISBN','Title','Box','Lot','Machine','Status'], ...liveView(filtered,p).allBooks.map(r=>[r.ISBN,r.Title,r.BoxNumber,r.LotNumber,r.MachineName,r.Status])])
  return error(`Demo route not implemented: ${method} ${path}`, 404)
}
