import { supabaseAdmin, supabase } from '../config/supabase.js'
import { getSimflexStatusForISBNs } from './simflex-db.js'

const db = () => supabaseAdmin || supabase
const POLL_INTERVAL_MS = 3 * 60 * 1000 // every 3 minutes

async function advanceBoxStage(boxId, lotId, fromStage, toStage, notes) {
  await db().from('boxes').update({ current_stage: toStage, received_at: null }).eq('id', boxId)
  await db().from('pipeline_events').insert({
    box_id: boxId,
    lot_id: lotId,
    from_stage: fromStage,
    to_stage: toStage,
    moved_by: null,
    moved_by_name: 'Auto (Simflex Poller)',
    notes,
  })
}

async function checkAndAdvanceBox(box) {
  try {
    // Get all processable ISBNs in this box
    const { data: scans, error: scansError } = await db()
      .from('warehouse_book_scans')
      .select('isbn')
      .eq('assigned_box_id', box.id)
      .eq('scan_status', 'processable')

    if (scansError || !scans || scans.length === 0) return

    const isbns = [...new Set(scans.map(s => s.isbn))]

    const simflexResult = await getSimflexStatusForISBNs(isbns)
    if (!simflexResult.success) return

    const results = simflexResult.data
    const anyTransmitting = results.some(r => r.transmissionCompleted || r.latestStatus?.toLowerCase().includes('transmit'))
    const allCompleted = results.every(r => r.transmissionCompleted)

    if (box.current_stage === 'scan' && anyTransmitting && !allCompleted) {
      // Some are transmitting but not all done yet → move to transmit
      await advanceBoxStage(box.id, box.lot_id, 'scan', 'transmit',
        `Auto-advanced: ${results.filter(r => r.transmissionCompleted).length}/${isbns.length} ISBNs transmitting in Simflex`)
      console.log(`[Simflex Poller] 📤 Box ${box.box_number}: scan → transmit (${results.filter(r => r.transmissionCompleted).length}/${isbns.length} done)`)

    } else if (box.current_stage === 'scan' && allCompleted) {
      // All done and still in scan → jump straight to storage
      await advanceBoxStage(box.id, box.lot_id, 'scan', 'transmit',
        `Auto-advanced: all ${isbns.length} ISBNs transmitted`)
      await advanceBoxStage(box.id, box.lot_id, 'transmit', 'storage',
        `Auto-advanced: all ${isbns.length} ISBNs confirmed transmitted in Simflex`)
      console.log(`[Simflex Poller] ✅ Box ${box.box_number}: scan → transmit → storage (all ${isbns.length} done)`)

    } else if (box.current_stage === 'transmit' && allCompleted) {
      // Was already in transmit, now all done → move to storage
      await advanceBoxStage(box.id, box.lot_id, 'transmit', 'storage',
        `Auto-advanced: all ${isbns.length} ISBNs confirmed transmitted in Simflex`)
      console.log(`[Simflex Poller] ✅ Box ${box.box_number}: transmit → storage (all ${isbns.length} done)`)
    }
  } catch (err) {
    console.error(`[Simflex Poller] ❌ Error processing box ${box.box_number}:`, err.message)
  }
}

async function runPoll() {
  try {
    const { data: boxes, error } = await db()
      .from('boxes')
      .select('id, box_number, lot_id, current_stage')
      .in('current_stage', ['scan', 'transmit'])

    if (error) { console.error('[Simflex Poller] DB error:', error.message); return }
    if (!boxes || boxes.length === 0) return

    console.log(`[Simflex Poller] Checking ${boxes.length} box(es) in scan stage...`)

    // Process boxes sequentially to avoid hammering Simflex
    for (const box of boxes) {
      await checkAndAdvanceBox(box)
    }
  } catch (err) {
    console.error('[Simflex Poller] Unexpected error:', err.message)
  }
}

export function startSimflexPoller() {
  console.log(`[Simflex Poller] Started — polling every ${POLL_INTERVAL_MS / 60000} minutes`)
  // Run once on startup after a short delay
  setTimeout(runPoll, 15000)
  // Then on interval
  setInterval(runPoll, POLL_INTERVAL_MS)
}
