import { logger } from '../../utils/logger.js'
import { supabaseAdmin, supabase } from '../config/supabase.js'
import { getSimflexStatusForISBNs } from './api/index.js'

/**
 * services/scan-refresh.js
 * 
 * Provides on-demand synchronization with Scan Manager.
 * Called manually by users via the frontend "Refresh" buttons
 * to check Scan Manager and advance a box's stage (scan -> transmit -> storage).
 */

// Use admin client if available (bypasses RLS), fall back to anon client
const db = () => supabaseAdmin || supabase

/**
 * Advances a box from one pipeline stage to another.
 */
async function advanceBoxStage(boxId, fromStage, toStage) {
  await db().from('boxes').update({ current_stage: toStage }).eq('id', boxId)
}

/**
 * Check a single box against Scan Manager and advance its stage if warranted.
 *
 * @param {{ id, box_number, lot_id, current_stage, box_type }} box
 * @returns {Promise<{ advanced: boolean, newStage: string, message: string }>}
 */
export async function syncBoxWithSimflex(box) {
  try {
    // Get all processable ISBNs assigned to this box
    const { data: scans, error: scansError } = await db()
      .from('book_activity')
      .select('scan_status, books!inner(isbn, box_id)')
      .eq('books.box_id', box.id)
      .eq('scan_status', 'processable')

    if (scansError) throw scansError
    if (!scans || scans.length === 0) {
      return { advanced: false, newStage: box.current_stage, message: 'No processable books found in box.' }
    }

    // Deduplicate ISBNs
    const isbns = [...new Set(scans.map(s => s.books?.isbn))]

    // Query Scan Manager for the latest status of each ISBN
    const simflexResult = await getSimflexStatusForISBNs(isbns, box.box_type || 'mustang')
    if (!simflexResult.success) {
      return { advanced: false, newStage: box.current_stage, message: 'Failed to query Simflex.' }
    }

    const results = simflexResult.data

    // Determine overall completion state
    const anyTransmitting = results.some(r =>
      r.transmissionCompleted || r.latestStatus?.toLowerCase().includes('transmit')
    )
    const allCompleted = results.every(r => r.transmissionCompleted)

    // ── Stage transition logic ────────────────────────────────────────────────
    if (box.current_stage === 'scan' && anyTransmitting && !allCompleted) {
      // Some ISBNs are transmitting but not all done yet.
      const doneCount = results.filter(r => r.transmissionCompleted).length
      logger.info(`[Scan Sync] 📤 Box ${box.box_number} is transmitting (${doneCount}/${isbns.length} done). Box stays in 'scan'.`)
      return { advanced: false, newStage: 'scan', message: `Still Transmitting (${doneCount}/${isbns.length} ISBNs done)` }
      
    } else if (box.current_stage === 'scan' && allCompleted) {
      // All ISBNs fully transmitted — box is done!
      // NOTE: We do NOT auto-advance to 'storage' here. The operator must physically
      // put the box on a shelf and manually assign a storage locator to transfer it.
      logger.info(`[Scan Sync] ✅ Box ${box.box_number}: all ${isbns.length} done. Ready for storage assignment.`)
      return { advanced: false, newStage: 'scan', message: `All ${isbns.length} ISBNs fully transmitted. Box is ready to be assigned a storage locator.` }
    }

    return { advanced: false, newStage: box.current_stage, message: 'No stage advancement needed.' }
  } catch (err) {
    logger.error(`[Scan Refresh] ❌ Error processing box ${box.box_number}:`, err.message)
    return { advanced: false, newStage: box.current_stage, message: 'Error during sync: ' + err.message }
  }
}
