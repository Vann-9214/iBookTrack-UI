import express from 'express'
import { supabase, supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()
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
            id, box_number, total_books, lot_id,
            lot:lots(lot_number),
            scans:warehouse_book_scans(isbn, title, scan_status)
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
        total_books: a.box?.total_books || 0,
        books: (a.box?.scans || [])
          .filter(s => s.scan_status === 'processable')
          .map(s => ({ isbn: s.isbn, title: s.title || `ISBN: ${s.isbn}` })),
      })),
    }))

    res.json({ success: true, locations: normalized })
  } catch (error) {
    console.error('Get storage locations error:', error)
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
        id, box_number, total_books, lot_id,
        lot:lots(lot_number),
        scans:warehouse_book_scans(isbn, title, scan_status)
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
      total_books: b.total_books || 0,
      books: (b.scans || [])
        .filter(s => s.scan_status === 'processable')
        .map(s => ({ isbn: s.isbn, title: s.title || `ISBN: ${s.isbn}` })),
    }))

    res.json({ success: true, boxes: normalized })
  } catch (error) {
    console.error('Get ready boxes error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ─── POST /api/storage/assign ─────────────────────────────────────────────────
// Assign a box to a rack/level slot
// Body: { box_id, storage_location_id }
router.post('/assign', requireAuth, async (req, res) => {
  try {
    const { box_id, storage_location_id } = req.body

    if (!box_id || !storage_location_id) {
      return res.status(400).json({ success: false, error: 'box_id and storage_location_id are required' })
    }

    // Check slot capacity
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

    if ((existing || []).length >= location.capacity) {
      return res.status(400).json({
        success: false,
        error: `Rack ${location.rack_id} Level ${location.level} is full (${location.capacity}/${location.capacity} boxes)`
      })
    }

    // Check box isn't already assigned elsewhere
    const { data: alreadyAssigned } = await db()
      .from('storage_assignments')
      .select('id, storage_location_id')
      .eq('box_id', box_id)
      .maybeSingle()

    if (alreadyAssigned) {
      return res.status(400).json({ success: false, error: 'This box is already assigned to a storage location' })
    }

    const { data: assignment, error: insertError } = await db()
      .from('storage_assignments')
      .insert({
        storage_location_id,
        box_id,
        assigned_by: req.user.id,
        assigned_by_name: req.user.user_metadata?.full_name || req.user.email,
      })
      .select()
      .single()

    if (insertError) throw insertError

    res.status(201).json({ success: true, assignment })
  } catch (error) {
    console.error('Assign box error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ─── DELETE /api/storage/assignment/:assignment_id ───────────────────────────
// Remove a box from a storage slot (does NOT change the box stage)
router.delete('/assignment/:assignment_id', requireAuth, async (req, res) => {
  try {
    const { assignment_id } = req.params

    const { error } = await db()
      .from('storage_assignments')
      .delete()
      .eq('id', assignment_id)

    if (error) throw error

    res.json({ success: true, message: 'Box removed from storage location' })
  } catch (error) {
    console.error('Remove assignment error:', error)
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

    // Try matching by ISBN in warehouse_book_scans
    const { data: scansByIsbn } = await db()
      .from('warehouse_book_scans')
      .select('assigned_box_id, isbn, title')
      .ilike('isbn', `%${query}%`)
      .limit(10)

    const boxIds = new Set([
      ...(boxByNumber || []).map(b => b.id),
      ...(scansByIsbn || []).map(s => s.assigned_box_id).filter(Boolean),
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
