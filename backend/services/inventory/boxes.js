/**
 * services/inventory/boxes.js
 *
 * Business logic for box pipeline and management.
 */

import { logger } from '../../utils/logger.js';
import * as boxesRepo from '../../repositories/inventory/boxes.js';
import { generateLotCandidates } from '../../utils/lotUtils.js';
import { runWarehouseTimeoutSweep } from '../../utils/warehouseTimeout.js';
import { broadcastEvent } from '../../utils/sse.js';

export const syncBoxTransmissionStatus = async (boxId, location) => {
  try {
    const { getSimflexStatusForISBNs } = await import('../scan_manager/api/index.js');

    let boxLocation = location;
    if (!boxLocation) {
      const { data: box } = await boxesRepo.getBoxTypeById(boxId);
      boxLocation = box?.box_type || 'mustang';
    }

    const { data: scans } = await boxesRepo.getBookActivityForSync(boxId);
    if (!scans || scans.length === 0) return;

    const isbns = [...new Set(scans.map(s => s.books?.isbn).filter(Boolean))];
    if (isbns.length === 0) return;

    const simflexResult = await getSimflexStatusForISBNs(isbns, boxLocation.toLowerCase());
    if (!simflexResult.success) {
      console.warn('Failed to reach Scan Manager for transmission_status sync:', simflexResult.error);
      return;
    }

    const normalizeIsbn = (isbn) => String(isbn || '').replace(/-/g, '').trim().toLowerCase();

    const updates = [];
    for (const scan of scans) {
      const isbn = scan.books?.isbn;
      if (!isbn) continue;

      const cleanIsbn = normalizeIsbn(isbn);
      const sfRecord = simflexResult.data.find(r => normalizeIsbn(r.isbn) === cleanIsbn);

      const statusToSave = (sfRecord && sfRecord.latestStatus)
        ? String(sfRecord.latestStatus).trim()
        : 'Pending';
      const updatedAtToSave = (sfRecord && sfRecord.latestUpdated)
        ? new Date(sfRecord.latestUpdated)
        : null;

      updates.push(boxesRepo.updateTransmissionStatus(scan.book_id, statusToSave, updatedAtToSave));
    }

    if (updates.length > 0) {
      const results = await Promise.all(updates);
      const hasChanges = results.some(res => res.data && res.data.length > 0);
      if (hasChanges) {
        broadcastEvent('PIPELINE_UPDATED', { boxId });
      }
    }
  } catch (err) {
    logger.error('Error syncing transmission_status:', err);
  }
};

export const getBoxesService = async (req) => {
  const { lot_id, current_stage, box_number, exclude_assigned_storage, box_type, isbn } = req.query;

  let isbnBoxIds = null;
  if (isbn && isbn.trim()) {
    const { data: matchingBooks } = await boxesRepo.searchBooksByIsbn(isbn.trim());
    isbnBoxIds = [...new Set((matchingBooks || []).map(b => b.box_id).filter(Boolean))];
  }

  if (isbnBoxIds && isbnBoxIds.length === 0) {
    return { boxes: [] };
  }

  const query = boxesRepo.getBoxesBaseQuery(lot_id, box_type, current_stage, box_number, isbnBoxIds);
  const { data: boxesData, error } = await query;
  if (error) throw error;

  let boxes = boxesData || [];

  if (boxes.length > 0) {
    const boxIds = boxes.map(b => b.id);
    const scanTimeMap = {};

    let allBooks = [];
    if (boxIds.length > 0) {
      const res = await boxesRepo.getBooksForBoxes(boxIds);
      allBooks = res.data || [];
    }
    const allBookIds = allBooks.map(b => b.id);
    
    let invRows = [];
    let endRows = [];
    if (allBookIds.length > 0) {
      const [invRes, endRes] = await Promise.all([
        boxesRepo.getInventoryScans(allBookIds),
        boxesRepo.getEndorsementScans(allBookIds)
      ]);
      invRows = invRes.data || [];
      endRows = endRes.data || [];
    }

    const bookToBox = {};
    (allBooks || []).forEach(b => { bookToBox[b.id] = b.box_id; });

    const userIds = [...new Set([
      ...(invRows || []).map(r => r.inventory_scan_by),
      ...(endRows || []).map(r => r.endorsement_scan_by)
    ].filter(Boolean))];

    let userMap = {};
    if (userIds.length > 0) {
      const { data: users } = await boxesRepo.getProfilesByIds(userIds);
      (users || []).forEach(u => { userMap[u.id] = u.name; });
    }

    for (const row of (invRows || [])) {
      const id = bookToBox[row.book_id];
      if (id && !scanTimeMap[id]?.latest_inventory_scan_at) {
        scanTimeMap[id] = { 
          ...scanTimeMap[id], 
          latest_inventory_scan_at: row.inventory_scan_at,
          latest_inventory_scan_by_name: userMap[row.inventory_scan_by] || null
        };
      }
    }
    for (const row of (endRows || [])) {
      const id = bookToBox[row.book_id];
      if (id && !scanTimeMap[id]?.latest_endorsement_scan_at) {
        scanTimeMap[id] = { 
          ...scanTimeMap[id], 
          latest_endorsement_scan_at: row.endorsement_scan_at,
          latest_endorsement_scan_by_name: userMap[row.endorsement_scan_by] || null
        };
      }
    }

    let scanCompletionMap = {};
    const scanBoxIds = boxes.filter(b => b.current_stage === 'scan').map(b => b.id);
    if (scanBoxIds.length > 0) {
      const { data: scanActivities } = await boxesRepo.getScanActivities(scanBoxIds);
      const groupedByBox = {};
      scanBoxIds.forEach(id => { groupedByBox[id] = []; });
      
      if (scanActivities) {
        scanActivities.forEach(act => {
          if (act.books && act.books.box_id) groupedByBox[act.books.box_id].push(act);
        });
      }
      
      for (const boxId of scanBoxIds) {
        const activities = groupedByBox[boxId];
        const b = boxes.find(bx => bx.id === boxId);
        let isCompleted = false;
        if (activities.length > 0 && activities.length >= (b.total_processable_books || 0)) {
          isCompleted = activities.every(a => {
             const stat = String(a.transmission_status || '').trim().toUpperCase();
             return stat === 'COMPLETED' || stat === 'TRANSMISSION_ARCHIVE COMPLETED' || stat === 'TRANSMISSION COMPLETED';
          });
        }
        scanCompletionMap[boxId] = isCompleted;
      }
    }

    boxes = boxes.map(b => ({
      ...b,
      latest_inventory_scan_at: scanTimeMap[b.id]?.latest_inventory_scan_at || null,
      latest_inventory_scan_by_name: scanTimeMap[b.id]?.latest_inventory_scan_by_name || null,
      latest_endorsement_scan_at: scanTimeMap[b.id]?.latest_endorsement_scan_at || null,
      latest_endorsement_scan_by_name: scanTimeMap[b.id]?.latest_endorsement_scan_by_name || null,
      is_fully_completed_in_simflex: scanCompletionMap[b.id] || false,
    }));
  }

  if (exclude_assigned_storage === 'true') {
    const { data: assigned } = await boxesRepo.getAssignedStorageBoxIds();
    const assignedIds = new Set((assigned || []).map(a => a.box_id));
    boxes = boxes.filter(b => !(b.current_stage === 'storage' && assignedIds.has(b.id)));
  }

  const scanBoxes = boxes.filter(b => b.current_stage === 'scan' || b.current_stage === 'transmit');
  if (scanBoxes.length > 0) {
    Promise.all(scanBoxes.map(async b => {
      await syncBoxTransmissionStatus(b.id, b.box_type);
    })).catch(err => logger.error('Background sync failed in GET /api/boxes:', err));
  }

  return { boxes };
};

export const getPipelineTransitionsService = async (req) => {
  await runWarehouseTimeoutSweep();
  const { limit = 50, offset = 0, stage, box_type, search, date_from, date_to } = req.query;
  const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 50);
  const offsetNum = parseInt(offset);

  let lotIds = null;
  if (search) {
    const safeSearch = search.replace(/[,"]/g, '');
    const { data: matchedLots } = await boxesRepo.getLotsBySearch(safeSearch);
    lotIds = (matchedLots || []).map(l => l.id);
  }

  const query = boxesRepo.getPipelineTransitionsQuery(limitNum, offsetNum, stage, box_type, search, date_from, date_to, lotIds);
  const { data: sessions, error } = await query;
  if (error) throw error;

  let filteredSessions = sessions || [];
  const userIds = new Set();
  const boxIds = Array.from(new Set(filteredSessions.map(s => s.box?.id).filter(Boolean)));
  
  let boxScanData = {};
  if (boxIds.length > 0) {
    const { data: boxSessions } = await boxesRepo.getSessionCompletionForPipeline(boxIds);
    for (const session of boxSessions || []) {
      const boxId = session.box_id;
      if (boxId && !boxScanData[boxId]) {
        boxScanData[boxId] = { 
          w_by: session.warehouse_complete_by, w_at: session.warehouse_complete_at,
          i_by: session.inventory_complete_by, i_at: session.inventory_complete_at,
          e_by: session.endorsement_complete_by, e_at: session.endorsement_complete_at
        };
      }
    }

    const { data: storageAssignments } = await boxesRepo.getStorageAssignmentsForPipeline(boxIds);
    for (const sa of storageAssignments || []) {
      if (!boxScanData[sa.box_id]) boxScanData[sa.box_id] = {};
      boxScanData[sa.box_id].s_by = sa.assigned_by;
      boxScanData[sa.box_id].s_at = sa.assigned_at;
    }
  }

  filteredSessions.forEach(s => {
    if (s.warehouse_user_received) userIds.add(s.warehouse_user_received);
    if (s.inventory_user_received) userIds.add(s.inventory_user_received);
    if (s.inventory_user_send) userIds.add(s.inventory_user_send);
    if (s.cut_user_received) userIds.add(s.cut_user_received);
    if (s.cut_user_send) userIds.add(s.cut_user_send);
    if (s.endorsement_user_received) userIds.add(s.endorsement_user_received);
    if (s.endorsement_user_send) userIds.add(s.endorsement_user_send);
    if (s.scan_user_received) userIds.add(s.scan_user_received);
    
    const boxId = s.box?.id;
    if (boxId && boxScanData[boxId]) {
      if (boxScanData[boxId].w_by) userIds.add(boxScanData[boxId].w_by);
      if (boxScanData[boxId].i_by) userIds.add(boxScanData[boxId].i_by);
      if (boxScanData[boxId].e_by) userIds.add(boxScanData[boxId].e_by);
      if (boxScanData[boxId].s_by) userIds.add(boxScanData[boxId].s_by);
    }
  });

  let userMap = {};
  if (userIds.size > 0) {
    const { data: profiles } = await boxesRepo.getProfilesByIds(Array.from(userIds));
    for (const p of profiles || []) {
      userMap[p.id] = p.name || p.email;
    }
  }

  const pagedEvents = filteredSessions.map(s => {
    const boxId = s.box?.id;
    const scanData = boxId ? boxScanData[boxId] : null;
    return {
      ...s,
      warehouse_user_name: userMap[s.warehouse_user_received] || null,
      warehouse_scan_name: scanData ? (userMap[scanData.w_by] || null) : null,
      warehouse_scan_at: scanData ? scanData.w_at : null,
      inventory_user_name: userMap[s.inventory_user_received] || null,
      inventory_scan_name: scanData ? (userMap[scanData.i_by] || null) : null,
      inventory_scan_at: scanData ? scanData.i_at : null,
      inventory_send_name: userMap[s.inventory_user_send] || null,
      cut_user_name: userMap[s.cut_user_received] || null,
      cut_send_name: userMap[s.cut_user_send] || null,
      endorsement_user_name: userMap[s.endorsement_user_received] || null,
      endorsement_scan_name: scanData ? (userMap[scanData.e_by] || null) : null,
      endorsement_scan_at: scanData ? scanData.e_at : null,
      endorsement_send_name: userMap[s.endorsement_user_send] || null,
      scan_user_name: userMap[s.scan_user_received] || null,
      storage_user_name: scanData ? (userMap[scanData.s_by] || null) : null,
      storage_time_assigned: scanData ? scanData.s_at : null,
    };
  });

  return { success: true, transitions: pagedEvents };
};

export const getBoxByNumberService = async (req) => {
  const { box_number } = req.params;
  const { data: box, error: boxError } = await boxesRepo.getBoxByNumber(box_number.trim());

  if (boxError) throw boxError;
  if (!box) throw { status: 404, message: 'Box not found' };

  const { data: scans } = await boxesRepo.getBookActivityForBox(box.id);

  const books = (scans || []).map(s => ({
    id: s.id,
    isbn: s.books?.isbn,
    title: s.books?.title,
    book_type: s.books?.book_type,
    scan_status: s.scan_status,
    transmission_status: s.transmission_status,
    scanned_at: s.warehouse_scan_at,
  }));

  return { box: { ...box, books } };
};

export const getBoxByIdService = async (req) => {
  const { id } = req.params;
  const { data: box, error: boxError } = await boxesRepo.getBoxById(id);

  if (boxError) throw boxError;
  if (!box) throw { status: 404, message: 'Box not found' };

  const { data: scans } = await boxesRepo.getBookActivityWithFlags(id);

  const books = (scans || []).map(s => {
    let flag = null;
    if (s.user_flags || s.scan_status === 'non_processable') {
      const flagRec = Array.isArray(s.user_flags) ? s.user_flags[0] : s.user_flags;
      flag = {
        issue: flagRec?.rejection_reason || 'non-processable',
        remarks: flagRec?.notes || '',
        flagged_at: s.warehouse_scan_at,
        flagged_by_name: 'Warehouse scan',
        source: 'scan_status',
      };
    }
    return { ...s, isbn: s.books?.isbn, title: s.books?.title, author: s.books?.author, flag };
  });

  const totalFlagCount = books.filter(b => b.flag !== null).length;
  return { box: { ...box, books, flag_count: totalFlagCount } };
};

export const getBoxesByLotNumberService = async (req) => {
  const { lot_number } = req.params;
  const candidates = generateLotCandidates(lot_number);
  
  let lot = null;
  for (const candidate of candidates) {
    const { data } = await boxesRepo.searchLotByCandidate(candidate);
    if (data) { lot = data; break; }
  }

  if (!lot) throw { status: 404, message: 'Lot not found' };

  const { data: boxes, error: boxesError } = await boxesRepo.getBoxesByLotId(lot.id);
  if (boxesError) throw boxesError;

  return { success: true, boxes };
};

export const receiveBoxService = async (req) => {
  const { id } = req.params;
  const { data: box, error: boxError } = await boxesRepo.getBoxById(id);
  
  if (boxError || !box) throw { status: 404, message: 'Box not found' };

  const { data: updatedBox, error: updateError } = await boxesRepo.updateBoxReceived(id);
  if (updateError) throw updateError;

  const { data: session } = await boxesRepo.getSessionForAdvance(id);
  if (session && session.status === 'sent') {
    let updates = { status: 'received' };
    if (box.current_stage === 'warehouse') {
      // Actually warehouse doesn't have a specific receive column, but we update status
    } else if (box.current_stage === 'inventory') {
      updates.inventory_user_received = req.user.id;
      updates.inventory_time_received = new Date().toISOString();
    } else if (box.current_stage === 'cut') {
      updates.cut_user_received = req.user.id;
      updates.cut_time_received = new Date().toISOString();
    } else if (box.current_stage === 'endorsement' || box.current_stage === 'qa') {
      updates.endorsement_user_received = req.user.id;
      updates.endorsement_time_received = new Date().toISOString();
    } else if (box.current_stage === 'scan') {
      updates.scan_user_received = req.user.id;
      updates.scan_time_received = new Date().toISOString();
    }
    await boxesRepo.updateSession(session.id, updates);
  }

  broadcastEvent('BOX_UPDATED', { boxId: id, type: 'receive' });
  broadcastEvent('PIPELINE_UPDATED', { boxId: id });
  broadcastEvent('DASHBOARD_REFRESH', { source: 'inventory_receive' });

  return { success: true, box: updatedBox };
};

export const advanceBoxService = async (req) => {
  const { id } = req.params;
  const { expected_stage } = req.body;
  const STAGE_ORDER = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'storage'];

  const { data: box, error: boxError } = await boxesRepo.getBoxById(id);
  if (boxError || !box) throw { status: 404, message: 'Box not found', detail: boxError?.message };

  if (expected_stage && box.current_stage !== expected_stage) {
    throw { status: 409, message: `Box is already in '${box.current_stage}' stage. Please refresh your view.` };
  }

  const currentIdx = STAGE_ORDER.indexOf(box.current_stage);
  if (currentIdx === -1 || currentIdx >= STAGE_ORDER.length - 1) {
    throw { status: 400, message: 'Box is already at the final stage' };
  }

  const nextStage = STAGE_ORDER[currentIdx + 1];

  if (box.current_stage === 'scan' && nextStage === 'storage') {
    const { getSimflexStatusForISBNs } = await import('../scan_manager/api/index.js');
    const { data: scans } = await boxesRepo.getProcessableBooksForBox(id);
    const isbns = [...new Set((scans || []).map(s => s.books?.isbn))];

    if (isbns.length > 0) {
      const simflexResult = await getSimflexStatusForISBNs(isbns);
      if (!simflexResult.success) {
        throw { status: 502, message: 'Failed to reach Scan Manager for validation: ' + (simflexResult.error || 'Unknown error') };
      }

      const pending = simflexResult.data.filter(r => !r.transmissionCompleted);
      if (pending.length > 0) {
        throw { 
          status: 400, 
          message: `${pending.length} of ${isbns.length} processable ISBNs are not yet verified in Scan Manager.`, 
          pending_isbns: pending.map(r => r.isbn), 
          simflex_status: simflexResult.data 
        };
      }
    }
  }



  if (box.current_stage === 'inventory' && (nextStage === 'cut' || nextStage === 'endorsement' || nextStage === 'qa')) {
    const { data: session } = await boxesRepo.getSessionForAdvance(id);
    if (session) {
      let updates = {};
      if (session.status === 'sent') updates.status = 'received';
      if (nextStage === 'cut') {
        updates.cut_user_received = req.user.id;
        updates.cut_time_received = new Date().toISOString();
      }
      if (Object.keys(updates).length > 0) {
        await boxesRepo.updateSession(session.id, updates);
      }
    }
  }

  if ((box.current_stage === 'inventory' || box.current_stage === 'cut') && (nextStage === 'endorsement' || nextStage === 'qa')) {
    const { data: session } = await boxesRepo.getSessionForAdvance(id);
    if (session) {
      let updates = { endorsement_user_received: req.user.id, endorsement_time_received: new Date().toISOString() };
      if (session.status === 'sent') updates.status = 'received';
      await boxesRepo.updateSession(session.id, updates);
    }
  }

  if ((box.current_stage === 'endorsement' || box.current_stage === 'qa') && nextStage === 'scan') {
    const { data: session } = await boxesRepo.getSessionForAdvance(id);
    if (session) {
      let updates = { scan_user_received: req.user.id, scan_time_received: new Date().toISOString() };
      if (session.status === 'sent') updates.status = 'received';
      await boxesRepo.updateSession(session.id, updates);
    }
  }

  if (box.current_stage === 'scan' && nextStage === 'storage') {
    const { data: session } = await boxesRepo.getSessionForAdvance(id);
    if (session) {
      let updates = { scan_user_received: req.user.id, scan_time_received: new Date().toISOString() };
      if (session.status === 'sent') updates.status = 'received';
      await boxesRepo.updateSession(session.id, updates);
    }
  }

  const { data: updatedBox, error: updateError } = await boxesRepo.updateBoxStage(id, nextStage);
  if (updateError) throw updateError;

  if (box.current_stage === 'warehouse' && nextStage === 'inventory') {
    await boxesRepo.updateSessionToReceived(id, req.user.id, nextStage);
  }

  broadcastEvent('BOX_UPDATED', { boxId: id, type: 'advance' });
  broadcastEvent('PIPELINE_UPDATED', { boxId: id });
  broadcastEvent('DASHBOARD_REFRESH', { source: 'inventory_advance' });

  return { success: true, box: updatedBox, from_stage: box.current_stage, to_stage: nextStage };
};

export const sendForwardBoxService = async (req) => {
  const { id } = req.params;
  const { data: box, error: boxError } = await boxesRepo.getBoxById(id);

  if (boxError || !box) throw { status: 404, message: 'Box not found', detail: boxError?.message };

  if (!['inventory', 'cut', 'endorsement', 'qa'].includes(box.current_stage)) {
    throw { status: 400, message: 'Box cannot be sent forward from this stage' };
  }

  const { data: session, error: sessionError } = await boxesRepo.getLatestActiveSession(id);
  if (sessionError) throw sessionError;
  if (!session) throw { status: 400, message: 'No active session found for this box to send' };

  let updates = { status: 'sent' };
  if (box.current_stage === 'inventory') {
    updates.inventory_user_send = req.user.id;
    updates.inventory_time_send = new Date().toISOString();
  } else if (box.current_stage === 'cut') {
    updates.cut_user_send = req.user.id;
    updates.cut_time_send = new Date().toISOString();
  } else if (box.current_stage === 'endorsement' || box.current_stage === 'qa') {
    updates.endorsement_user_send = req.user.id;
    updates.endorsement_time_send = new Date().toISOString();
  }

  const { error: updateError } = await boxesRepo.updateSession(session.id, updates);
  if (updateError) throw updateError;

  broadcastEvent('BOX_UPDATED', { boxId: id, type: 'send_forward' });
  broadcastEvent('PIPELINE_UPDATED', { boxId: id });
  broadcastEvent('DASHBOARD_REFRESH', { source: 'inventory_send' });

  return { success: true, box, session_status: 'sent', current_stage: box.current_stage };
};

export const rollbackBoxService = async (req) => {
  const { id } = req.params;
  const { to_stage } = req.body;
  const STAGE_ORDER = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit', 'storage'];

  if (!to_stage || !STAGE_ORDER.includes(to_stage)) {
    throw { status: 400, message: 'Invalid target stage' };
  }

  const { data: box, error: boxError } = await boxesRepo.getBoxById(id);
  if (boxError || !box) throw { status: 404, message: 'Box not found' };

  const { data: updatedBox, error: updateError } = await boxesRepo.updateBoxStage(id, to_stage);
  if (updateError) throw updateError;

  broadcastEvent('BOX_UPDATED', { boxId: id, type: 'rollback' });
  broadcastEvent('PIPELINE_UPDATED', { boxId: id });
  broadcastEvent('DASHBOARD_REFRESH', { source: 'inventory_rollback' });

  return { success: true, box: updatedBox };
};

export const getBoxTransmissionService = async (req) => {
  const { id } = req.params;
  let box = null;
  
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(id)) {
    const { data, error } = await boxesRepo.getBoxById(id);
    if (error) throw error;
    box = data;
  } else {
    const { data, error } = await boxesRepo.getBoxByNumber(id);
    if (error) throw error;
    box = data;
  }

  if (!box) throw { status: 404, message: 'Box not found' };

  const { data: scans, error: scansError } = await boxesRepo.getBookActivityWithFlags(box.id);
  if (scansError) throw scansError;

  const allScans = scans || [];
  const processableScans = allScans.filter(s => s.scan_status === 'processable');

  const { getSimflexStatusForISBNs } = await import('../scan_manager/api/index.js');
  const uniqueIsbns = [...new Set(processableScans.map(s => s.books?.isbn))];
  let simflexMap = {};
  
  const normalizeIsbn = (isbn) => String(isbn || '').replace(/-/g, '').trim().toLowerCase();

  if (uniqueIsbns.length > 0) {
    const result = await getSimflexStatusForISBNs(uniqueIsbns);
    if (result.success) {
      for (const r of result.data) simflexMap[normalizeIsbn(r.isbn)] = r;
    }
  }

  const booksList = allScans.map(s => {
    const isbn = s.books?.isbn;
    const sf = simflexMap[normalizeIsbn(isbn)] || {};
    return {
      scan_id: s.id,
      isbn: isbn,
      title: s.books?.title || null,
      scan_status: s.scan_status,
      rejection_reason: (Array.isArray(s.user_flags) ? s.user_flags[0] : s.user_flags)?.rejection_reason || null,
      warehouse_scan_at: s.warehouse_scan_at,
      simflex_status: sf.latestStatus || null,
      transmission_completed: sf.transmissionCompleted || false,
      // Always show the last-updated timestamp regardless of completion —
      // it reflects when Scan Manager last reported a status, not whether
      // the book has finished the Transmission_Archive stage.
      transmission_date: sf.latestUpdated || null,
      scan_user: sf.scanUser || null,
    };
  });

  const transmitted = booksList.filter(b => b.transmission_completed).length;
  const wip = booksList.filter(b => b.scan_status === 'processable' && !b.transmission_completed).length;
  const non_processable = booksList.filter(b => b.scan_status === 'non_processable').length;

  return {
    success: true,
    box: {
      id: box.id,
      box_number: box.box_number,
      current_stage: box.current_stage,
      lot_number: box.lot?.lot_number || null,
    },
    summary: { total: allScans.length, transmitted, wip, non_processable },
    books: booksList,
  };
};

export const checkSimflexService = async (req) => {
  const { id } = req.params;
  const { syncBoxWithSimflex } = await import('../scan_manager/sync.js');

  const { data: box, error: boxError } = await boxesRepo.getBoxById(id);
  if (boxError || !box) throw { status: 404, message: 'Box not found' };

  if (box.current_stage !== 'scan' && box.current_stage !== 'transmit') {
    throw { status: 400, message: `Box is in '${box.current_stage}' stage. Only boxes in scan or transmit stage can be synced.` };
  }

  const syncResult = await syncBoxWithSimflex(box);

  broadcastEvent('PIPELINE_UPDATED', { boxId: id });

  return {
    success: true,
    autoAdvanced: syncResult.advanced,
    finalStage: syncResult.newStage,
    message: syncResult.message
  };
};

export const deleteBoxService = async (req) => {
  const { id } = req.params;

  const { data: box, error: findError } = await boxesRepo.getBoxById(id);
  if (findError || !box) throw { status: 404, message: 'Box not found' };

  await boxesRepo.deleteBooks(id);
  await boxesRepo.deleteStorageAssignments(id);
  
  const { error: deleteError } = await boxesRepo.deleteBox(id);
  if (deleteError) throw deleteError;

  broadcastEvent('PIPELINE_UPDATED', { boxId: id });
  broadcastEvent('DASHBOARD_REFRESH', { source: 'inventory_delete' });

  return { success: true, message: `Box ${box.box_number} deleted` };
};

export const printBoxService = async (req) => {
  const { id } = req.params;
  const { data: box, error: boxError } = await boxesRepo.getBoxById(id);
  if (boxError || !box) throw { status: 404, message: 'Box not found' };

  const { error: updateError } = await boxesRepo.updateSessionPrint(id, req.user.id);
  if (updateError) throw updateError;

  broadcastEvent('BOX_UPDATED', { boxId: id, type: 'print' });
  broadcastEvent('DASHBOARD_REFRESH', { source: 'inventory_print' });

  return { success: true, message: 'Box print status updated' };
};
