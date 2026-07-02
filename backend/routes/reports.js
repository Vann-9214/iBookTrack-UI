/**
 * routes/reports.js
 *
 * Generates the LOT status report used by the Reports page.
 *
 * Endpoints:
 *   GET /api/reports/lot-status — Real-time Open/In-Progress/Closed status for every lot
 *
 * All routes require authentication (requireAuth middleware).
 */

import express from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

/**
 * GET /api/reports/lot-status
 * Compute real-time LOT status (Closed / Open / In-Progress) for every lot.
 *
 * Status rules:
 *   Closed     — All boxes are in 'storage' stage AND every scanned book is
 *                in a final state (processable box in storage = Transmitted,
 *                or non_processable = Rejected/Hold).
 *   Open       — Lot has NO active boxes in the pipeline AND has at least one
 *                ISBN that is unaccounted for (scanned as processable but its
 *                box is not yet in storage).
 *   In-Progress — One or more boxes are actively moving through the pipeline
 *                (current_stage NOT 'storage').
 */
router.get('/lot-status', requireAuth, async (req, res) => {
  try {
    const db = supabaseAdmin

    // 1. Fetch all lots
    const { data: lots, error: lotsError } = await db
      .from('lots')
      .select('id, lot_number, status, created_at, total_boxes')
      .order('created_at', { ascending: false })

    if (lotsError) throw lotsError

    // 2. Fetch all boxes (id, lot_id, current_stage)
    const { data: boxes, error: boxesError } = await db
      .from('boxes')
      .select('id, lot_id, current_stage')

    if (boxesError) throw boxesError

    // 3. Fetch all scans
    const { data: scans, error: scansError } = await db
      .from('warehouse_book_scans')
      .select('scan_status, books!inner(isbn, box_id)')

    if (scansError) throw scansError

    // Index boxes by id and group by lot
    const boxById = {}
    const boxesByLot = {}
    for (const box of boxes || []) {
      boxById[box.id] = box
      if (!boxesByLot[box.lot_id]) boxesByLot[box.lot_id] = []
      boxesByLot[box.lot_id].push(box)
    }

    // Group scans by lot via box
    const scansByLot = {}
    for (const scan of scans || []) {
      const boxId = scan.books?.box_id
      const box = boxById[boxId]
      if (!box) continue
      const lotId = box.lot_id
      if (!scansByLot[lotId]) scansByLot[lotId] = []
      scansByLot[lotId].push({ ...scan, boxStage: box.current_stage })
    }

    const PIPELINE_STAGES = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit']

    const result = (lots || []).map(lot => {
      const lotBoxes = boxesByLot[lot.id] || []
      const lotScans = scansByLot[lot.id] || []

      const totalBoxes = lotBoxes.length
      const activeBoxes = lotBoxes.filter(b => PIPELINE_STAGES.includes(b.current_stage))
      const storedBoxes = lotBoxes.filter(b => b.current_stage === 'storage')

      const totalScans = lotScans.length
      const processableScans = lotScans.filter(s => s.scan_status === 'processable')
      const nonProcessableScans = lotScans.filter(s => s.scan_status !== 'processable')

      // "Transmitted" = processable book whose box reached storage
      const transmittedScans = processableScans.filter(s => s.boxStage === 'storage')
      // "Pending" = processable book still in pipeline
      const pendingScans = processableScans.filter(s => PIPELINE_STAGES.includes(s.boxStage))

      // Determine computed status
      let computedStatus
      if (totalBoxes === 0) {
        // No boxes at all — lot is open/not started
        computedStatus = 'open'
      } else if (activeBoxes.length > 0) {
        // At least one box still moving through pipeline
        computedStatus = 'in-progress'
      } else if (pendingScans.length === 0 && storedBoxes.length === totalBoxes) {
        // All boxes stored, no unaccounted processable books
        computedStatus = 'closed'
      } else if (activeBoxes.length === 0 && pendingScans.length > 0) {
        // No active boxes but some processable books unresolved
        computedStatus = 'open'
      } else {
        computedStatus = 'in-progress'
      }

      return {
        lot_id: lot.id,
        lot_number: lot.lot_number,
        lot_status: lot.status,
        computed_status: computedStatus,
        created_at: lot.created_at,
        total_boxes: totalBoxes,
        active_boxes: activeBoxes.length,
        stored_boxes: storedBoxes.length,
        total_scans: totalScans,
        transmitted: transmittedScans.length,
        non_processable: nonProcessableScans.length,
        pending: pendingScans.length,
      }
    })

    res.json({ success: true, lots: result })
  } catch (error) {
    console.error('[Reports] lot-status error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
