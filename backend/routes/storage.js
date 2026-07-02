/**
 * routes/storage.js
 *
 * Manages the physical storage locator system — racks, levels, and
 * box-to-slot assignments inside the storage room.
 *
 * The storage room is organized into sections → racks (A/B/C/D) → levels (1–4).
 * Each rack/level slot has a capacity (default 38 boxes).
 *
 * Endpoints:
 *   GET    /api/storage/locations              — All rack/level slots with assigned boxes and their ISBNs
 *   POST   /api/storage/locations/provision    — Bulk-create all 16 slots for a storage section
 *   PATCH  /api/storage/locations/:id          — Update the capacity of a slot
 *   DELETE /api/storage/locations/:id          — Delete a slot (cascades to assignments)
 *   GET    /api/storage/ready-boxes            — Boxes in 'storage' stage not yet assigned to a slot
 *   POST   /api/storage/assign                 — Assign a single box to a slot
 *   POST   /api/storage/assign/batch           — Bulk-assign multiple boxes to a slot
 *   DELETE /api/storage/assignment/:id         — Remove a box from its slot
 *   DELETE /api/storage/assignments/batch      — Bulk-remove multiple boxes from their slots
 *   GET    /api/storage/search                 — Find a box's location by ISBN or box number
 *
 * All routes require authentication (requireAuth middleware).
 */

import express from 'express'
import { supabase, supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()
// Always prefer the admin client (bypasses RLS) for storage operations
const db = () => supabaseAdmin || supabase

// ─── GET /api/storage/locations ──────────────────────────────────────────────
// Returns all rack/level slots with their assigned boxes (and box ISBNs/titles)
router.get('/locations', requireAuth, async (req, res) => {
  try {
    const { data: locations, error } = await db()
      .from('storage_locations')
      .select(`
        id, rack_id, level, capacity,
        assignments:storage_assignments(
          id,
          assigned_at,
          assigned_by_name,
          box:boxes(
            id, box_number, total_books_expected, lot_id,
            lot:lots(lot_number),
            books:books(
              isbn, title,
              scans:warehouse_book_scans(scan_status)
            )
          )
        )
      `)
      .order('rack_id', { ascending: true })
      .order('level', { ascending: true })

    if (error) throw error

    // Normalize: compute used count and flatten box info
    const normalized = locations.map(loc => ({
      id: loc.id,
      rack_id: loc.rack_id,
      level: loc.level,
      capacity: loc.capacity,
      used: (loc.assignments || []).length,
      assignments: (loc.assignments || []).map(a => ({
        assignment_id: a.id,
        assigned_at: a.assigned_at,
        assigned_by_name: a.assigned_by_name,
        box_id: a.box?.id,
        box_number: a.box?.box_number,
        lot_number: a.box?.lot?.lot_number || null,
        total_books: a.box?.total_books_expected || 0,
        books: (a.box?.books || [])
          .flatMap(b => {
            const processable = (b.scans || []).some(s => s.scan_status === 'processable')
            return processable ? [{ isbn: b.isbn, title: b.title || `ISBN: ${b.isbn}` }] : []
          }),
      })),
    }))

    res.json({ success: true, locations: normalized })
  } catch (error) {
    console.error('Get storage locations error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ─── POST /api/storage/locations/provision ───────────────────────────────────
// Bulk-upsert all 16 slots (racks A-D × levels 1-4) for a given section.
// Section 1 uses bare rack IDs ('A','B','C','D'); sections 2+ use 'S{n}-A' etc.
// Body: { section, capacity? }   (capacity defaults to 38)
router.post('/locations/provision', requireAuth, async (req, res) => {
  try {
    const { section, capacity = 38 } = req.body
    if (!section || Number(section) < 1) {
      return res.status(400).json({ success: false, error: 'section is required' })
    }

    const sec = Number(section)
    const racks = req.body.racks || ['A', 'B', 'C', 'D']
    const levels = req.body.levels || [1, 2, 3, 4]

    const rows = racks.flatMap(rack =>
      levels.map(level => ({
        rack_id: sec === 1 ? rack : `S${sec}-${rack}`,
        level: Number(level),
        capacity: Number(capacity),
      }))
    )

    // Upsert to create missing rows (ignoreDuplicates skips existing ones silently)
    const { error: upsertError } = await db()
      .from('storage_locations')
      .upsert(rows, { onConflict: 'rack_id,level', ignoreDuplicates: true })

    if (upsertError) throw upsertError

    // Always fetch ALL rows for this section — upsert only returns newly inserted rows
    const rackIds = rows.map(r => r.rack_id)
    const { data, error: fetchError } = await db()
      .from('storage_locations')
      .select('id, rack_id, level, capacity')
      .in('rack_id', rackIds)

    if (fetchError) throw fetchError

    const normalized = (data || []).map(loc => ({
      id: loc.id,
      rack_id: loc.rack_id,
      level: loc.level,
      capacity: loc.capacity,
      used: 0,
      assignments: [],
    }))

    res.status(201).json({ success: true, locations: normalized })
  } catch (error) {
    console.error('Provision section error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ─── PATCH /api/storage/locations/:id ────────────────────────────────────────
// Update the capacity of a storage slot.
// Body: { capacity }
router.patch('/locations/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { capacity } = req.body
    if (capacity == null || Number(capacity) < 1) {
      return res.status(400).json({ success: false, error: 'capacity must be at least 1' })
    }

    // Ensure new capacity is not less than current usage
    const { data: loc, error: locError } = await db()
      .from('storage_locations')
      .select('capacity, assignments:storage_assignments(id)')
      .eq('id', id)
      .single()

    if (locError || !loc) return res.status(404).json({ success: false, error: 'Location not found' })

    const usedCount = (loc.assignments || []).length
    if (Number(capacity) < usedCount) {
      return res.status(400).json({
        success: false,
        error: `Cannot set capacity below current usage (${usedCount} boxes assigned)`
      })
    }

    const { data, error } = await db()
      .from('storage_locations')
      .update({ capacity: Number(capacity) })
      .eq('id', id)
      .select('id, rack_id, level, capacity')
      .single()

    if (error) throw error

    res.json({ success: true, location: data })
  } catch (error) {
    console.error('Update location capacity error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ─── DELETE /api/storage/locations/:id ───────────────────────────────────────
// Delete a storage location slot (assignments cascade-deleted by FK constraint).
router.delete('/locations/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { error } = await db()
      .from('storage_locations')
      .delete()
      .eq('id', id)
    if (error) throw error
    res.json({ success: true })
  } catch (error) {
    console.error('Delete storage location error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ─── GET /api/storage/ready-boxes ────────────────────────────────────────────
// Returns boxes in 'storage' stage that have NOT yet been assigned to a location
router.get('/ready-boxes', requireAuth, async (req, res) => {
  try {
    // Get all box IDs already assigned
    const { data: assigned, error: assignedError } = await db()
      .from('storage_assignments')
      .select('box_id')

    if (assignedError) throw assignedError

    const assignedIds = (assigned || []).map(a => a.box_id)

    // Fetch storage-stage boxes not yet placed
    let query = db()
      .from('boxes')
      .select(`
        id, box_number, total_books_expected, lot_id,
        lot:lots(lot_number),
        books:books(
          isbn, title,
          scans:warehouse_book_scans(scan_status)
        )
      `)
      .eq('current_stage', 'storage')
      .order('created_at', { ascending: false })

    if (assignedIds.length > 0) {
      query = query.not('id', 'in', `(${assignedIds.join(',')})`)
    }

    const { data: boxes, error: boxesError } = await query
    if (boxesError) throw boxesError

    const normalized = (boxes || []).map(b => ({
      id: b.id,
      box_number: b.box_number,
      lot_number: b.lot?.lot_number || null,
      total_books: b.total_books_expected || 0,
      books: (b.books || [])
        .flatMap(bk => {
          const processable = (bk.scans || []).some(s => s.scan_status === 'processable')
          return processable ? [{ isbn: bk.isbn, title: bk.title || `ISBN: ${bk.isbn}` }] : []
        }),
    }))

    res.json({ success: true, boxes: normalized })
  } catch (error) {
    console.error('Get ready boxes error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ─── POST /api/storage/assign/batch ─────────────────────────────────────────────
// Bulk assign multiple boxes to a rack/level slot
// Body: { box_ids: string[], storage_location_id }
router.post('/assign/batch', requireAuth, async (req, res) => {
  try {
    const { box_ids, storage_location_id } = req.body

    if (!Array.isArray(box_ids) || box_ids.length === 0 || !storage_location_id) {
      return res.status(400).json({ success: false, error: 'box_ids array and storage_location_id are required' })
    }

    const { data: existing, error: countError } = await db()
      .from('storage_assignments')
      .select('id')
      .eq('storage_location_id', storage_location_id)

    if (countError) throw countError

    const { data: location, error: locError } = await db()
      .from('storage_locations')
      .select('capacity, rack_id, level')
      .eq('id', storage_location_id)
      .single()

    if (locError || !location) return res.status(404).json({ success: false, error: 'Storage location not found' })

    const currentCount = (existing || []).length
    if (currentCount + box_ids.length > location.capacity) {
      return res.status(400).json({
        success: false,
        error: `Rack ${location.rack_id} Level ${location.level} can only hold ${location.capacity} boxes. ${currentCount} already assigned, ${box_ids.length} selected.`
      })
    }

    const { data: alreadyAssigned, error: alreadyError } = await db()
      .from('storage_assignments')
      .select('box_id')
      .in('box_id', box_ids)

    if (alreadyError) throw alreadyError

    if ((alreadyAssigned || []).length > 0) {
      const ids = alreadyAssigned.map(a => a.box_id).join(', ')
      return res.status(400).json({ success: false, error: `Some boxes are already assigned: ${ids}` })
    }

    const { data: assignments, error: insertError } = await db()
      .from('storage_assignments')
      .insert(
        box_ids.map(box_id => ({
          storage_location_id,
          box_id,
          assigned_by: req.user.id,
          assigned_by_name: req.user.user_metadata?.full_name || req.user.email,
        }))
      )
      .select()

    if (insertError) throw insertError

    res.status(201).json({ success: true, assignments: assignments || [] })
  } catch (error) {
    console.error('Batch assign boxes error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ─── DELETE /api/storage/assignments/batch ────────────────────────────────────
// Bulk remove multiple boxes from storage slots (does NOT change box stage)
router.delete('/assignments/batch', requireAuth, async (req, res) => {
  try {
    const { assignment_ids } = req.body

    if (!Array.isArray(assignment_ids) || assignment_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'assignment_ids array is required' })
    }

    const { error } = await db()
      .from('storage_assignments')
      .delete()
      .in('id', assignment_ids)

    if (error) throw error

    res.json({ success: true, message: `${assignment_ids.length} box(es) removed from storage locations` })
  } catch (error) {
    console.error('Batch remove assignments error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ─── GET /api/storage/search ──────────────────────────────────────────────────
// Search by ISBN or box_number — returns the rack/level location
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query
    if (!q || !String(q).trim()) {
      return res.status(400).json({ success: false, error: 'Search query is required' })
    }

    const query = String(q).trim()

    // Try matching by box_number first
    const { data: boxByNumber } = await db()
      .from('boxes')
      .select('id, box_number')
      .ilike('box_number', `%${query}%`)
      .limit(10)

    // Try matching by ISBN in warehouse_book_scans (join with books table)
    const { data: scansByIsbn } = await db()
      .from('warehouse_book_scans')
      .select('book:books!inner(box_id, isbn, title)')
      .ilike('book.isbn', `%${query}%`)
      .limit(10)

    const boxIds = new Set([
      ...(boxByNumber || []).map(b => b.id),
      ...(scansByIsbn || []).map(s => s.book?.box_id).filter(Boolean),
    ])

    if (boxIds.size === 0) {
      return res.json({ success: true, results: [], message: 'No boxes found matching the search' })
    }

    // Find assignments for these boxes
    const { data: assignments, error } = await db()
      .from('storage_assignments')
      .select(`
        id,
        box:boxes(id, box_number, lot:lots(lot_number)),
        location:storage_locations(id, rack_id, level)
      `)
      .in('box_id', Array.from(boxIds))

    if (error) throw error

    const results = (assignments || []).map(a => ({
      assignment_id: a.id,
      box_id: a.box?.id,
      box_number: a.box?.box_number,
      lot_number: a.box?.lot?.lot_number || null,
      rack_id: a.location?.rack_id,
      level: a.location?.level,
      location_id: a.location?.id,
      location_label: `Rack ${a.location?.rack_id} – Level ${a.location?.level}`,
    }))

    // Also report which matched boxes are NOT yet in storage
    const assignedBoxIds = new Set(results.map(r => r.box_id))
    const unlocated = Array.from(boxIds).filter(id => !assignedBoxIds.has(id)).map(id => {
      const box = (boxByNumber || []).find(b => b.id === id)
      return { box_id: id, box_number: box?.box_number || id, located: false }
    })

    res.json({ success: true, results, unlocated })
  } catch (error) {
    console.error('Storage search error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
