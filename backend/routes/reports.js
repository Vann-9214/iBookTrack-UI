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
    const { type } = req.query

    // Normalize brand/type to match database storage (e.g. mustang -> Mustang)
    const brandType = type
      ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
      : null

    // 1. Fetch lots, optionally filtered by brand/type
    let lotsQuery = db
      .from('lots')
      .select('id, lot_number, type, created_at, total_boxes')
      .order('created_at', { ascending: false })
    if (brandType) lotsQuery = lotsQuery.eq('type', brandType)
    const { data: lots, error: lotsError } = await lotsQuery


    if (lotsError) throw lotsError

    // 2. Fetch all boxes (id, lot_id, current_stage, box_number, total_books_expected) along with their current session status
    const { data: boxes, error: boxesError } = await db
      .from('boxes')
      .select('id, lot_id, current_stage, box_number, total_books_expected, box_sessions(status)')

    if (boxesError) throw boxesError

    // 3. Fetch all scans
    const { data: scans, error: scansError } = await db
      .from('book_activity')
      .select('scan_status, transmission_status, warehouse_scan_at, inventory_scan_at, endorsement_scan_at, books!inner(isbn, box_id)')

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
      const totalScans = lotScans.length
      const processableScans = lotScans.filter(s => s.scan_status === 'processable')
      const nonProcessableScans = lotScans.filter(s => s.scan_status !== 'processable')

      // "Transmitted" = processable book whose box reached storage OR explicitly complete/received/sent
      const transmittedScans = processableScans.filter(s => s.boxStage === 'storage' || (s.transmission_status && /COMPLETE|RECEIVED|SENT/i.test(s.transmission_status)))
      // "Pending" = processable book still in pipeline and not explicitly complete/received/sent
      const pendingScans = processableScans.filter(s => s.boxStage !== 'storage' && !(s.transmission_status && /COMPLETE|RECEIVED|SENT/i.test(s.transmission_status)))

      const boxList = lotBoxes.map(b => {
        // Scans specifically for this box
        const bScans = lotScans.filter(s => s.books?.box_id === b.id)
        const proc = bScans.filter(s => s.scan_status === 'processable')
        const trans = proc.filter(s => 
          (s.transmission_status && /COMPLETE|RECEIVED|SENT/i.test(s.transmission_status)) || 
          b.current_stage === 'storage'
        )
        
        // Progress percentage based on stage
        // We start at 10% (so warehouse is never 0%) and distribute the remaining 90%
        const stages = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit', 'storage']
        const sIndex = stages.indexOf(b.current_stage || '')
        let progress = sIndex >= 0 ? 10 + Math.round((sIndex / (stages.length - 1)) * 90) : 0

        // Sub-stage progress for early stages based on box_sessions status
        if (sIndex >= 0 && sIndex <= 3) {
          const sessionStatus = b.box_sessions && b.box_sessions.length > 0 ? b.box_sessions[0].status : 'received'
          
          if (sessionStatus === 'completed') {
            progress += 7 // Roughly half of the 15% stage gap
          } else if (sessionStatus === 'sent') {
            progress += 12 // 12% leaves a 3% gap for transit to the next stage's 'received' base
          }
        }

        // Enhance progress based on real-time transmission status
        if (proc.length > 0) {
          if (trans.length === proc.length) {
            progress = 100
          } else if (trans.length > 0 && progress < 100 && sIndex >= 4) {
            const remaining = 100 - progress
            progress += Math.round(remaining * (trans.length / proc.length))
          }
        } else if (b.current_stage === 'storage') {
           progress = 100
        }

        return {
          box_id: b.id,
          box_number: b.box_number,
          current_stage: progress === 100 ? 'storage' : (b.current_stage || 'Unknown'),
          progress,
          total_books: bScans.length,
          total_books_expected: b.total_books_expected || 0,
          processable: proc.length,
          non_processable: bScans.length - proc.length
        }
      }).sort((a, b) => a.box_number.localeCompare(b.box_number, undefined, { numeric: true }))

      // Now calculate active and stored boxes based on the dynamically updated box list
      const PIPELINE_STAGES = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit']
      const activeBoxes = boxList.filter(b => PIPELINE_STAGES.includes(b.current_stage))
      const storedBoxes = boxList.filter(b => b.current_stage === 'storage')

      // Determine computed status based on strict rules:
      // In-Progress: One or more boxes are actively moving through the pipeline.
      // Closed: No active boxes, all boxes stored, no unaccounted processable books.
      // Open: No active boxes, but some boxes or books remain unaccounted for (or lot is empty).
      let computedStatus
      if (activeBoxes.length > 0) {
        computedStatus = 'in-progress'
      } else {
        if (totalBoxes === 0 || storedBoxes.length !== totalBoxes || pendingScans.length > 0) {
          computedStatus = 'open'
        } else {
          computedStatus = 'closed'
        }
      }

      return {
        lot_id: lot.id,
        lot_number: lot.lot_number,
        lot_status: lot.type ? lot.type.charAt(0).toUpperCase() + lot.type.slice(1) : null,
        computed_status: computedStatus,
        created_at: lot.created_at,
        total_boxes: totalBoxes,
        active_boxes: activeBoxes.length,
        stored_boxes: storedBoxes.length,
        total_scans: totalScans,
        transmitted: transmittedScans.length,
        non_processable: nonProcessableScans.length,
        pending: pendingScans.length,
        boxes: boxList,
      }
    })

    res.json({ success: true, lots: result })
  } catch (error) {
    console.error('[Reports] lot-status error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
