import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { mockStore } = require('../.demo-test/mock-data/store.js')
const { mockRouter } = require('../.demo-test/mock-data/mock-router.js')
const values = new Map()
globalThis.window = new EventTarget()
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) }
globalThis.fetch = () => { throw new Error('Demo must never use the network') }
const request = async (url, method = 'GET', body) => {
  const res = await mockRouter(url, { method, body: body && JSON.stringify(body) })
  return { status: res.status, ...(await res.json()) }
}
beforeEach(() => { values.clear(); mockStore.resetToDefault() })
test('supervisor login accepts empty credentials; profile edits persist', async () => {
  assert.equal((await request('/api/auth/login', 'POST', {})).user.role, 'supervisor')
  await request('/api/auth/profile', 'PATCH', { name: 'Demo Visitor', role: 'warehouse' })
  assert.equal((await request('/api/auth/profile')).name, 'Demo Visitor')
  assert.equal(mockStore.getState().user.role, 'supervisor')
})
test('receive, send, advance, rollback persist and preserve station handshakes', async () => {
  const box = mockStore.getState().lots[0].boxes[0]
  const advanced = await request(`/api/boxes/${box.id}/advance`, 'POST', { expected_stage: 'warehouse' })
  assert.equal(advanced.to_stage, 'inventory')
  assert.equal((await request(`/api/boxes/${box.id}/advance`, 'POST', { expected_stage: 'warehouse' })).status, 409)
  await request(`/api/boxes/${box.id}/send-forward`, 'POST', {})
  assert.equal(mockStore.getState().lots[0].boxes[0].current_stage, 'inventory')
  assert.equal(mockStore.getState().lots[0].boxes[0].box_sessions[0].status, 'sent')
  await request(`/api/boxes/${box.id}/rollback`, 'POST', { to_stage: 'warehouse' })
  assert.equal(mockStore.getState().lots[0].boxes[0].current_stage, 'warehouse')
})
test('warehouse bulk save persists books, flags and completion', async () => {
  const started = await request('/api/warehouse/sessions/start', 'POST', { lot_number: 'DEMO-NEW', box_number: 'NEW-BOX', type: 'jaguar' })
  await request('/api/warehouse/sessions/bulk-save', 'POST', { session_id: started.session.id, lot_number: 'DEMO-NEW', box_number: 'NEW-BOX', book_type: 'jaguar', total_expected_books: 1, scanned_books: [{ isbn: '9780132350884', title: 'Clean Code', author: 'Robert Martin', scan_status: 'non_processable', flag_issue: 'torn-pages', flag_remarks: 'Damaged cover' }], issues: [] })
  const saved = await request(`/api/boxes/${started.session.box_id}`)
  assert.equal(saved.box.books.length, 1)
  assert.equal(saved.box.box_sessions[0].status, 'completed')
  const flags = await request('/api/dashboard/qc-flags?box_type=jaguar')
  const flag = flags.flags.find(f => f.assigned_box.box_number === 'NEW-BOX')
  assert.ok(flag)
  await request(`/api/dashboard/qc-flags/${flag.scan_id}/resolve`, 'POST')
  assert.equal((await request(`/api/boxes/${started.session.box_id}`)).box.books[0].is_resolved, true)
})
test('verification updates an existing book instead of losing its flag', async () => {
  const box = mockStore.getState().lots[0].boxes[2]
  const original = box.books[0]
  await request(`/api/warehouse/sessions/${box.box_sessions[0].id}/scan`, 'POST', {
    isbn: original.isbn, title: 'Corrected title', author: original.author,
    stage: 'inventory', scan_status: 'non_processable', rejection_reason: 'torn-pages', notes: 'Damaged during verification',
  })
  const saved = (await request(`/api/boxes/${box.id}`)).box.books.find(b => b.id === original.id)
  assert.equal(saved.scan_status, 'non_processable')
  assert.equal(saved.flag.issue, 'torn-pages')
  assert.equal(saved.title, 'Corrected title')
})
test('a catalog mismatch keeps a physically processable book in the workflow', async () => {
  const box = mockStore.getState().lots[0].boxes[2]
  const book = box.books[0]
  await request(`/api/warehouse/scans/${book.id}/tag`, 'POST', {
    stage: 'inventory', status: 'non_processable', rejection_reason: 'mismatched-book', notes: 'Alternate edition',
    physical_title: 'Alternate edition', ilms_title: book.title,
  })
  const saved = (await request(`/api/boxes/${box.id}`)).box.books.find(b => b.id === book.id)
  assert.equal(saved.scan_status, 'processable')
  assert.equal(saved.flag.issue, 'mismatched-book')
})
test('storage assignments, confirmation and removal survive reload', async () => {
  const ready = await request('/api/storage/ready-boxes?box_type=mustang')
  assert.ok(ready.boxes.length)
  const box = ready.boxes[0]
  const locations = await request('/api/storage/locations')
  const location = locations.locations.find(l => l.used === 0)
  const assigned = await request('/api/storage/assign/batch', 'POST', { box_ids: [box.id], storage_location_id: location.id })
  const id = assigned.assignments[0].assignment_id
  await request(`/api/storage/assignments/${id}/confirm`, 'POST')
  assert.equal((await request(`/api/boxes/${box.id}`)).box.current_stage, 'storage')
  await request('/api/storage/assignments/batch', 'DELETE', { assignment_ids: [id] })
  assert.equal((await request(`/api/boxes/${box.id}`)).box.current_stage, 'scan')
})
test('report and transmission contracts are populated and brand-aware', async () => {
  for (const brand of ['mustang', 'jaguar']) {
    const report = await request(`/api/reports/lot-status?type=${brand}`)
    assert.ok(report.lots.length)
    assert.ok(report.lots[0].lot_id)
    assert.ok(Number.isFinite(report.lots[0].total_scans))
    const live = await request(`/api/scanning/live?location=${brand}`)
    assert.ok(live.byMachine.length && live.byStage.length && live.allBooks.length)
    assert.ok(live.allBooks.every(b => b.book_type.toLowerCase() === brand))
  }
})
test('unknown routes fail locally, reset restores seed, malformed state recovers', async () => {
  assert.equal((await request('/api/not-implemented')).status, 404)
  await request('/api/auth/profile', 'PATCH', { name: 'Changed' })
  mockStore.resetToDefault()
  assert.notEqual(mockStore.getState().user.name, 'Changed')
  localStorage.setItem('ibooktrack_demo_state', '{broken')
  assert.equal(mockStore.getState().user.role, 'supervisor')
})
