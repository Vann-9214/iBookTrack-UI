/**
 * services/inventory/lots.js
 *
 * Contains the core business logic for lots.
 * Handles tasks like fetching paginated lot lists, calculating transmission
 * summaries across boxes, and querying external services (Scan Manager).
 */

import { logger } from '../../utils/logger.js';
import * as lotsRepo from '../../repositories/inventory/lots.js';
import { syncBoxTransmissionStatus } from './boxes.js';
import { runWarehouseTimeoutSweep } from '../../utils/warehouseTimeout.js';
import { broadcastEvent } from '../../utils/sse.js';
import { isTransmissionArchiveCompleted } from '../../utils/transmissionStatus.js';

const VALID_LOT_TYPES = ['Mustang', 'Jaguar'];

export const getLotsService = async (req, res) => {
  await runWarehouseTimeoutSweep();
  const { search, limit: rawLimit, offset: rawOffset, type } = req.query;
  const limit = Math.min(parseInt(rawLimit) || 50, 50);
  const offset = parseInt(rawOffset) || 0;
  const lotType = VALID_LOT_TYPES.includes(type) ? type : null;

  const totalCount = await lotsRepo.getLotsCount(search, lotType);
  const data = await lotsRepo.getLotsList(offset, limit, search, lotType);

  return {
    lots: data,
    total: totalCount || 0,
    limit,
    offset,
    hasMore: offset + limit < (totalCount || 0),
  };
};

export const getLotTransmissionSummaryService = async (req, res) => {
  await runWarehouseTimeoutSweep();
  const { lot_number } = req.params;
  const lotType = VALID_LOT_TYPES.includes(req.query.type) ? req.query.type : null;

  const { data: lot, error: lotError } = await lotsRepo.getLotByNumberOrLatest(lot_number, lotType);

  if (lotError && lot_number.toLowerCase() !== 'latest') throw lotError;
  if (lotError || !lot) throw { status: 404, payload: { success: false, error: 'Lot not found' } };

  const boxes = await lotsRepo.getLotBoxes(lot.id);
  const boxIds = boxes.map(b => b.id);

  if (boxIds.length === 0) {
    return {
      success: true,
      lot_number: lot.lot_number,
      lot_id: lot.id,
      total: 0,
      transmitted: 0,
      non_processable: 0,
      rejected: 0,
      wip: { done_scan: 0, validation: 0, pdf_conversion: 0, pre_validation: 0 },
      isbns: []
    };
  }

  // Pull fresh Scan Manager (Simplex) status into our DB first, then read from the DB.
  // The UI is supposed to show persisted DB state, not hit the external API directly.
  const lotLocation = lot.type ? lot.type.toLowerCase() : 'mustang';
  await Promise.all(
    boxes.map(box =>
      syncBoxTransmissionStatus(box.id, lotLocation).catch(err =>
        logger.error(`[Lot Sync] Failed to sync box ${box.id} for lot ${lot.lot_number}:`, err.message)
      )
    )
  );

  const allScans = await lotsRepo.getBookActivitiesForBoxes(boxIds);
  const processableScans = allScans.filter(s => s.scan_status === 'processable');
  const nonProcessableScans = allScans.filter(s => s.scan_status === 'non_processable');

  const isbnRows = allScans.map(s => {
    const isbn = s.books?.isbn;

    const current_stage = s.books?.boxes?.current_stage || null;
    const stg = (current_stage || '').toLowerCase();
    const showSimflex = stg === 'scan' || stg === 'storage';

    const dbStatus = showSimflex ? (s.transmission_status || null) : null;
    // Only "Transmission_Archive COMPLETED" counts as fully transmitted — an
    // intermediate stage (e.g. "Validate COMPLETED", "Preval COMPLETED")
    // must NOT be treated as transmitted.
    const transmissionCompleted = isTransmissionArchiveCompleted(dbStatus);
    // The "Updated" timestamp reflects the last time Scan Manager reported a
    // status for this book — it is NOT tied to transmission completion, so
    // it should show regardless of what stage the book is currently at.
    const transmissionDate = s.transmission_updated_at || null;

    return {
      scan_id: s.id,
      isbn: isbn,
      title: s.books?.title || null,
      author: s.books?.author || null,
      scan_status: s.scan_status,
      rejection_reason: s.user_flags?.is_resolved ? null : s.user_flags?.rejection_reason || null,
      is_resolved: s.user_flags?.is_resolved || false,
      warehouse_scan_at: s.warehouse_scan_at,
      assigned_box_id: s.books?.box_id,
      box_number: s.books?.boxes?.box_number || null,
      current_stage: current_stage,
      simflex_status: dbStatus,
      transmission_completed: transmissionCompleted,
      transmission_date: transmissionDate,
    };
  });

  const wip = { done_scan: 0, pre_validation: 0, pdf_conversion: 0, validation: 0 };
  const transmitted = isbnRows.filter(r => r.transmission_completed).length;

  for (const r of isbnRows) {
    if (!r.transmission_completed && r.simflex_status) {
      const s = r.simflex_status;
      if (s.includes('Validate')) wip.validation++;
      else if (s.includes('Tif2PDF')) wip.pdf_conversion++;
      else if (s.includes('Preval')) wip.pre_validation++;
      else if (s.includes('Scanning')) wip.done_scan++;
    }
  }

  // Sync back to DB if there are changes
  const boxTransmittedCounts = {};
  for (const r of isbnRows) {
    if (r.transmission_completed && r.assigned_box_id) {
      boxTransmittedCounts[r.assigned_box_id] = (boxTransmittedCounts[r.assigned_box_id] || 0) + 1;
    }
  }

  let dbChanged = false;
  for (const box of boxes) {
    const doneCount = boxTransmittedCounts[box.id] || 0;
    if (box.total_transmitted_books !== doneCount) {
      await lotsRepo.updateBoxTransmittedCount(box.id, doneCount);
      dbChanged = true;
    }
  }

  if (dbChanged) {
    broadcastEvent('BOX_UPDATED', { message: `Boxes in lot ${lot.lot_number} updated from Simflex sync` });
    broadcastEvent('PIPELINE_UPDATED', { message: `Boxes in lot ${lot.lot_number} updated from Simflex sync` });
  }

  return {
    success: true,
    lot_number: lot.lot_number,
    lot_id: lot.id,
    total: allScans.length,
    processable: processableScans.length,
    transmitted,
    non_processable: nonProcessableScans.length,
    rejected: allScans.filter(s => s.scan_status === 'rejected').length,
    wip,
    isbns: isbnRows,
  };
};

export const getLotService = async (req, res) => {
  const { lot_number } = req.params;
  const lotType = VALID_LOT_TYPES.includes(req.query.type) ? req.query.type : null;
  const data = await lotsRepo.getLotWithBoxesByNumber(lot_number, lotType);
  if (!data) throw { status: 404, payload: { error: 'Lot not found' } };
  return { lot: data };
};
