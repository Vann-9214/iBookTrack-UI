import { logger } from '../../utils/logger.js'
import { db } from '../../config/db.js'
import { getSimflexStatusForISBNs } from './api/index.js'

/**
 * services/scan-refresh.js
 * 
 * Provides on-demand synchronization with Scan Manager.
 * Called manually by users via the frontend "Refresh" buttons
 * to check Scan Manager and advance a box's stage (scan -> transmit -> storage).
 */

/**
 * Check a single box against Scan Manager and advance its stage if warranted.
 *
 * @param {{ id, box_number, lot_id, current_stage, box_type }} box
 * @returns {Promise<{ advanced: boolean, newStage: string, message: string }>}
 */
export async function syncBoxWithSimflex(box) {
  try {
    // Get all processable ISBNs assigned to this box
    const { rows: scans } = await db.query(`
      SELECT ba.scan_status, b.isbn, b.box_id as "books.box_id" 
      FROM book_activity ba 
      JOIN books b ON ba.book_id = b.id 
      WHERE b.box_id = $1 AND ba.scan_status = 'processable'
    `, [box.id]);

    if (!scans || scans.length === 0) {
      return { advanced: false, newStage: box.current_stage, message: 'No processable books found in box.' }
    }

    // Deduplicate ISBNs
    const isbns = [...new Set(scans.map(s => s.isbn))];

    // Query Scan Manager for the latest status of each ISBN
    const simflexResult = await getSimflexStatusForISBNs(isbns, (box.box_type || 'mustang').toLowerCase())
    if (!simflexResult.success) {
      return { advanced: false, newStage: box.current_stage, message: 'Failed to query Simflex.' }
    }

    const results = simflexResult.data

    // Determine overall completion state
    const anyTransmitting = results.some(r =>
      r.transmissionCompleted || r.latestStatus?.toLowerCase().includes('transmit')
    )
    const allCompleted = results.every(r => r.transmissionCompleted)

    // Calculate doneCount by matching completed ISBNs with the actual books in the box
    const completedIsbns = new Set(results.filter(r => r.transmissionCompleted).map(r => r.isbn || r.ISBN));
    
    // Convert to lowercase without hyphens for matching, just in case
    const normalizeIsbnForMatching = (isbn) => String(isbn || '').replace(/-/g, '').trim().toLowerCase();
    const completedNormalizedIsbns = new Set([...completedIsbns].map(normalizeIsbnForMatching));

    const doneCount = scans.filter(s => completedNormalizedIsbns.has(normalizeIsbnForMatching(s.isbn))).length;

    // Update total_transmitted_books for this box
    await db.query('UPDATE boxes SET total_transmitted_books = $1 WHERE id = $2', [doneCount, box.id]);

    // ── Stage transition logic ────────────────────────────────────────────────
    if (box.current_stage === 'scan' && anyTransmitting && !allCompleted) {
      // Some ISBNs are transmitting but not all done yet.
      logger.info(`[Scan Sync] 📤 Box ${box.box_number} is transmitting (${doneCount}/${isbns.length} done). Box stays in 'scan'.`)
      return { advanced: false, newStage: 'scan', message: `Still Transmitting (${doneCount}/${isbns.length} ISBNs done)` }
      
    } else if (box.current_stage === 'scan' && allCompleted) {
      // All processable ISBNs fully transmitted — box is done!
      // Do NOT auto-advance to 'storage'. It must remain in 'scan' so the 
      // Storage Locator can assign it to a location. The Storage Locator will advance the stage upon assignment.
      logger.info(`[Scan Sync] ✅ Box ${box.box_number}: all ${isbns.length} done. Ready for storage assignment.`)
      return { advanced: true, newStage: 'scan', message: `All ${isbns.length} processable ISBNs fully transmitted. Ready for Storage assignment.` }
    }

    return { advanced: false, newStage: box.current_stage, message: 'No stage advancement needed.' }
  } catch (err) {
    logger.error(`[Scan Refresh] ❌ Error processing box ${box.box_number}:`, err.message)
    return { advanced: false, newStage: box.current_stage, message: 'Error during sync: ' + err.message }
  }
}
