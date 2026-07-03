/**
 * services/simflex-poller.js
 *
 * Background job that automatically advances boxes through the pipeline
 * based on their scanning status in Simflex WMS.
 *
 * How it works:
 *   Every 3 minutes, the poller:
 *     1. Fetches all boxes currently in 'scan' or 'transmit' stage.
 *     2. For each box, looks up the Simflex status of every processable ISBN
 *        assigned to that box.
 *     3. Advances the box stage based on what Simflex reports:
 *          - Some ISBNs transmitting but not all done → scan → transmit
 *          - All ISBNs Transmission_Archive COMPLETED in scan stage → scan → transmit → storage
 *          - All ISBNs COMPLETED in transmit stage → transmit → storage
 *
 * This runs automatically on server startup via startSimflexPoller().
 * Manual checks are also available via POST /api/boxes/:id/check-simflex.
 */

import { supabaseAdmin, supabase } from '../config/supabase.js'
import { getSimflexStatusForISBNs } from './simflex-db.js'

// Use admin client if available (bypasses RLS), fall back to anon client
const db = () => supabaseAdmin || supabase

// How often the poller runs (every 3 minutes)
const POLL_INTERVAL_MS = 3 * 60 * 1000

// Prevent a slow poll cycle from stacking up multiple overlapping runs.
let isPolling = false

// Abort a single cycle if it takes longer than 5 minutes so it can't hang forever.
const POLL_CYCLE_TIMEOUT_MS = 5 * 60 * 1000

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Advances a box from one pipeline stage to another and records the event
 * in pipeline_events for audit/history purposes.
 *
 * @param {string} boxId
 * @param {string} lotId
 * @param {string} fromStage - e.g. 'scan'
 * @param {string} toStage   - e.g. 'transmit'
 * @param {string} notes     - Human-readable reason for the transition
 */
async function advanceBoxStage(boxId, lotId, fromStage, toStage, notes) {
  // Update the box's current stage
  await db().from('boxes').update({ current_stage: toStage }).eq('id', boxId)

  // Log the transition so operators can see the auto-advance in the pipeline history
  await db().from('pipeline_events').insert({
    box_id:        boxId,
    lot_id:        lotId,
    from_stage:    fromStage,
    to_stage:      toStage,
    moved_by:      null,                   // null = automated, not a human user
    moved_by_name: 'Auto (Simflex Poller)',
    notes,
  })
}

/**
 * Check a single box against Simflex and advance its stage if warranted.
 * Errors are caught and logged per-box so one failure doesn't stop the whole poll.
 *
 * @param {{ id, box_number, lot_id, current_stage }} box
 */
async function checkAndAdvanceBox(box) {
  try {
    // Get all processable ISBNs assigned to this box
    const { data: scans, error: scansError } = await db()
      .from('book_activity')
      .select('scan_status, books!inner(isbn, box_id)')
      .eq('books.box_id', box.id)
      .eq('scan_status', 'processable')

    // Skip boxes with no processable books
    if (scansError || !scans || scans.length === 0) return

    // Deduplicate ISBNs (a book may have been scanned more than once)
    const isbns = [...new Set(scans.map(s => s.books?.isbn))]

    // Query Simflex for the latest status of each ISBN
    const simflexResult = await getSimflexStatusForISBNs(isbns)
    if (!simflexResult.success) return

    const results = simflexResult.data

    // Determine overall completion state
    const anyTransmitting = results.some(r =>
      r.transmissionCompleted || r.latestStatus?.toLowerCase().includes('transmit')
    )
    const allCompleted = results.every(r => r.transmissionCompleted)

    // ── Stage transition logic ────────────────────────────────────────────────
    if (box.current_stage === 'scan' && anyTransmitting && !allCompleted) {
      // Some ISBNs are transmitting but not all done yet — move to transmit stage
      const doneCount = results.filter(r => r.transmissionCompleted).length
      await advanceBoxStage(
        box.id, box.lot_id, 'scan', 'transmit',
        `Auto-advanced: ${doneCount}/${isbns.length} ISBNs transmitting in Simflex`
      )
      console.log(`[Simflex Poller] 📤 Box ${box.box_number}: scan → transmit (${doneCount}/${isbns.length} done)`)

    } else if (box.current_stage === 'scan' && allCompleted) {
      // All ISBNs fully transmitted — skip transmit and jump straight to storage
      await advanceBoxStage(
        box.id, box.lot_id, 'scan', 'transmit',
        `Auto-advanced: all ${isbns.length} ISBNs transmitted`
      )
      await advanceBoxStage(
        box.id, box.lot_id, 'transmit', 'storage',
        `Auto-advanced: all ${isbns.length} ISBNs confirmed transmitted in Simflex`
      )
      console.log(`[Simflex Poller] ✅ Box ${box.box_number}: scan → transmit → storage (all ${isbns.length} done)`)

    } else if (box.current_stage === 'transmit' && allCompleted) {
      // Box was already in transmit stage and now all ISBNs are done
      await advanceBoxStage(
        box.id, box.lot_id, 'transmit', 'storage',
        `Auto-advanced: all ${isbns.length} ISBNs confirmed transmitted in Simflex`
      )
      console.log(`[Simflex Poller] ✅ Box ${box.box_number}: transmit → storage (all ${isbns.length} done)`)
    }
  } catch (err) {
    console.error(`[Simflex Poller] ❌ Error processing box ${box.box_number}:`, err.message)
  }
}

// ── Main poll loop ────────────────────────────────────────────────────────────

/**
 * Run one polling cycle:
 *   1. Fetch all boxes in 'scan' or 'transmit' stage.
 *   2. Check each one against Simflex and advance if ready.
 *
 * Boxes are processed sequentially (not in parallel) to avoid hammering
 * the Simflex API with too many concurrent requests.
 */
async function runPoll() {
  if (isPolling) {
    console.log('[Simflex Poller] Previous cycle still running, skipping this tick')
    return
  }
  isPolling = true
  const cycleTimer = setTimeout(() => {
    console.error('[Simflex Poller] Cycle timed out after 5 minutes; forcing release')
    isPolling = false
  }, POLL_CYCLE_TIMEOUT_MS)

  try {
    const { data: boxes, error } = await db()
      .from('boxes')
      .select('id, box_number, lot_id, current_stage')
      .in('current_stage', ['scan', 'transmit'])

    if (error) { console.error('[Simflex Poller] DB error:', error.message); return }
    if (!boxes || boxes.length === 0) return

    console.log(`[Simflex Poller] Checking ${boxes.length} box(es) in scan/transmit stage...`)

    for (const box of boxes) {
      await checkAndAdvanceBox(box)
    }
  } catch (err) {
    console.error('[Simflex Poller] Unexpected error:', err.message)
  } finally {
    clearTimeout(cycleTimer)
    isPolling = false
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start the Simflex poller.
 * Called once from server.js on startup.
 * Runs an initial poll after a 15-second delay (to let the server fully start),
 * then repeats every POLL_INTERVAL_MS milliseconds using a recursive setTimeout
 * so overlapping cycles never stack up.
 */
export function startSimflexPoller() {
  console.log(`[Simflex Poller] Started — polling every ${POLL_INTERVAL_MS / 60000} minutes`)
  // Short delay before first run so the server is fully ready
  setTimeout(() => schedulePoll(true), 15000)
}

function schedulePoll(runImmediately = false) {
  if (runImmediately) {
    runPollWithCatch()
  }
  setTimeout(() => {
    runPollWithCatch()
    schedulePoll(false)
  }, POLL_INTERVAL_MS)
}

function runPollWithCatch() {
  runPoll().catch((err) => {
    console.error('[Simflex Poller] Unhandled runPoll error:', err)
  })
}
