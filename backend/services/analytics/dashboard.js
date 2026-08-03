/**
 * services/analytics/dashboard.js
 *
 * Business logic for dashboard endpoints.
 */

import { logger } from '../../utils/logger.js';
import * as dashboardRepo from '../../repositories/analytics/dashboard.js';
import scanManagerApi from '../scan_manager/api/index.js';
import { ilmsApi } from '../ilms/api.js';
import { generateLotCandidates } from '../../utils/lotUtils.js';
import { runWarehouseTimeoutSweep } from '../../utils/warehouseTimeout.js';
import { broadcastEvent } from '../../utils/sse.js';
import { syncBoxTransmissionStatus } from '../inventory/boxes.js';

export const getStatsService = async (req) => {
  await runWarehouseTimeoutSweep();
  const { lot_number, lot_range_start, lot_range_end, box_type, type } = req.query;
  const bookType = type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : null;

  let lotIds = null;
  if (lot_number) {
    const { data: lot } = await dashboardRepo.getLotByNumber(lot_number, bookType);
    if (lot) lotIds = [lot.id];
  } else if (lot_range_start && lot_range_end) {
    const { data: lots } = await dashboardRepo.getLotsInRange(lot_range_start, lot_range_end, bookType);
    if (lots) lotIds = lots.map(l => l.id);
  }

  const { count: totalBoxes } = await dashboardRepo.countBoxes(lotIds, box_type ? box_type.charAt(0).toUpperCase() + box_type.slice(1).toLowerCase() : null);
  const { count: totalBooks } = await dashboardRepo.countBooks(lotIds, box_type ? box_type.charAt(0).toUpperCase() + box_type.slice(1).toLowerCase() : null);

  const transmittedBooks = 0;

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const startIso = startOfDay.toISOString();
  const endIso = endOfDay.toISOString();

  const { count: unaccountedBooks, error: flagCountError } = await dashboardRepo.countUnaccountedBooks(
    startIso, 
    endIso, 
    box_type ? box_type.charAt(0).toUpperCase() + box_type.slice(1).toLowerCase() : null
  );
  if (flagCountError) console.warn('user_flags count error:', flagCountError.message);

  let activeLots = 0;
  if (!lot_number && !lot_range_start) {
    try {
      const openLotsData = await getOpenLotsService({ query: { brand: box_type } });
      if (openLotsData && openLotsData.lots) {
        activeLots = openLotsData.lots.filter(lot => lot.status !== 'Completed' && lot.completion_progress !== 100).length;
      }
    } catch (err) {
      console.warn('Failed to fetch open lots for activeLots count:', err);
    }
  } else {
    activeLots = lotIds ? lotIds.length : 0;
  }

  return {
    success: true,
    stats: {
      totalBoxes: totalBoxes || 0,
      totalBooks: totalBooks || 0,
      transmittedBooks: transmittedBooks || 0,
      unaccountedBooks: unaccountedBooks || 0,
      activeLots: activeLots || 0,
      transmissionRate: totalBooks > 0 ? Math.round((transmittedBooks / totalBooks) * 100) : 0
    }
  };
};

export const getOpenLotsService = async (req) => {
  await runWarehouseTimeoutSweep();
  const { brand } = req.query;
  const normalizedBrand = brand ? brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase() : null;

  const { data: lots, error: lotsError } = await dashboardRepo.getOpenLots(normalizedBrand);
  if (lotsError) throw lotsError;
  if (!lots || lots.length === 0) return { success: true, lots: [] };

  const openLots = lots.filter(lot => {
    if (!lot.boxes || lot.boxes.length === 0) return true;
    return lot.boxes.some(b => b.current_stage !== 'storage');
  });

  const formattedLots = openLots.map(lot => {
    const boxes = lot.boxes || [];
    const totalBoxes = boxes.length;
    let totalBooks = 0;
    let lotBoxProgressSum = 0;
    
    let lotStatus = 'Open';
    if (totalBoxes > 0) {
      const PIPELINE_STAGES = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit'];
      const activeBoxes = boxes.filter(b => PIPELINE_STAGES.includes(b.current_stage));
      if (activeBoxes.length > 0) lotStatus = 'In Progress';
    }

    boxes.forEach(box => {
      totalBooks += (box.total_expected_books || 0);
      
      let baseProgress = 0;
      const stage = box.current_stage || '';
      const sessionStatus = box.session_status || 'received';

      if (stage === 'warehouse') {
        baseProgress = sessionStatus === 'received' ? 0 : (sessionStatus === 'completed' ? 10 : 5);
      } else if (stage === 'inventory') {
        baseProgress = sessionStatus === 'received' ? 15 : (sessionStatus === 'completed' ? 20 : 25);
      } else if (stage === 'cut') {
        baseProgress = sessionStatus === 'received' ? 30 : (sessionStatus === 'completed' ? 35 : 40);
      } else if (stage === 'endorsement') {
        baseProgress = sessionStatus === 'received' ? 43 : (sessionStatus === 'completed' ? 46 : 48);
      } else if (stage === 'scan' || stage === 'transmit' || stage === 'storage') {
        baseProgress = 50;
      }

      let bookAverage = 0;
      const activities = box.book_activities || [];
      const proc = activities.filter(a => a && a.scan_status === 'processable');

      if (proc.length > 0) {
        let totalBookScore = 0;
        for (const scan of proc) {
          const status = (scan.transmission_status || '').toUpperCase();
          let score = 0;
          if (status.includes('SCANNING ONGOING')) score = 10;
          else if (status.includes('SCANNING COMPLETED')) score = 20;
          else if (status.includes('VALIDATE ONGOING')) score = 30;
          else if (status.includes('VALIDATE COMPLETED')) score = 40;
          else if (status.includes('TIF2PDF ONGOING') || status.includes('PDF CONVERSION ONGOING')) score = 50;
          else if (status.includes('TIF2PDF COMPLETED') || status.includes('PDF CONVERSION COMPLETED')) score = 60;
          else if (status.includes('PREVAL ONGOING')) score = 70;
          else if (status.includes('PREVAL COMPLETED')) score = 80;
          else if (status.includes('ARCHIVE ONGOING') || status.includes('TRANSMIT ONGOING') || status.includes('TRANSMISSION_ARCHIVE ONGOING')) score = 90;
          else if (status.includes('COMPLETE') || status.includes('RECEIVED') || status.includes('SENT') || stage === 'storage') score = 100;
          
          totalBookScore += score;
        }
        if (baseProgress === 50) {
          bookAverage = totalBookScore / proc.length;
        }
      } else if (stage === 'storage') {
        bookAverage = 100;
      }

      const progress = Math.round(baseProgress + (bookAverage / 2));
      lotBoxProgressSum += progress;
    });

    const completionProgress = totalBoxes > 0 ? Math.round(lotBoxProgressSum / totalBoxes) : 0;

    return {
      id: lot.id,
      lot_number: lot.lot_number,
      total_boxes: totalBoxes,
      total_books: totalBooks,
      status: lotStatus,
      completion_progress: completionProgress,
    };
  });

  return { success: true, lots: formattedLots };
};

export const getQcFlagsService = async (req) => {
  await runWarehouseTimeoutSweep();
  const requestedPage = parseInt(req.query.page || '1', 10);
  const requestedLimit = parseInt(req.query.limit || '50', 10);
  const todayOnly = req.query.today === 'true';
  const boxType = req.query.box_type ? req.query.box_type.charAt(0).toUpperCase() + req.query.box_type.slice(1).toLowerCase() : null;
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 50;

  let startIso = null;
  let endIso = null;

  if (req.query.from_date && req.query.to_date) {
    const fromDate = new Date(req.query.from_date);
    const toDate = new Date(req.query.to_date);
    startIso = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate(), 0, 0, 0)).toISOString();
    endIso = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate() + 1, 0, 0, 0)).toISOString();
  } else if (todayOnly) {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    startIso = startOfDay.toISOString();
    endIso = endOfDay.toISOString();
  }

  const { data, error, count } = await dashboardRepo.getQcFlags(page, limit, boxType, startIso, endIso);
  if (error) throw error;

  const firstRel = (rel) => Array.isArray(rel) ? rel[0] : rel;

  const mappedFlags = (data || []).map(f => {
    const ba = firstRel(f.book_activity) || {};
    const book = firstRel(ba.books) || {};
    const box = firstRel(book.boxes) || {};
    const lot = firstRel(box.lot) || {};

    const flagCandidates = [
      { at: f.warehouse_flag_at, by: firstRel(f.warehouse_user)?.name },
      { at: f.inventory_flag_at, by: firstRel(f.inventory_user)?.name },
      { at: f.endorsement_flag_at, by: firstRel(f.endorsement_user)?.name },
      { at: f.scan_flag_at, by: firstRel(f.scan_user)?.name },
    ].filter(c => c.at);

    const latestFlag = flagCandidates.sort((a, b) => new Date(b.at) - new Date(a.at))[0];

    return {
      scan_id: f.id,
      isbn: book.isbn || null,
      title: book.title || null,
      issue: f.rejection_reason,
      remarks: f.notes,
      flagged_at: latestFlag?.at || f.warehouse_flag_at || null,
      flagged_by_name: latestFlag?.by || null,
      assigned_box: box.box_number
        ? { box_number: box.box_number, box_type: box.box_type || null, lot: lot.lot_number ? { lot_number: lot.lot_number } : null }
        : null,
    };
  });

  return { success: true, flags: mappedFlags, total: count || 0, page, limit };
};

export const getDailyOutputService = async (req) => {
  const requestedPage = parseInt(req.query.page || '1', 10);
  const requestedLimit = parseInt(req.query.limit || '50', 10);
  const sortOrder = req.query.sort === 'asc' ? 'asc' : 'desc';
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 50;

  const userBrand = req.query.brand === 'jaguar' ? 'jaguar' : req.user?.user_metadata?.brand === 'jaguar' ? 'jaguar' : 'mustang';
  const location = userBrand;

  const { success, rows: simflexRows } = await scanManagerApi.getDailyOutputRows(undefined, location, true);
  if (!success) {
    throw { status: 502, message: 'Failed to fetch daily output from Scan Manager' };
  }

  if (simflexRows && simflexRows.length > 0) {
    simflexRows.sort((a, b) => {
      const dateA = a.updated ? new Date(a.updated).getTime() : 0;
      const dateB = b.updated ? new Date(b.updated).getTime() : 0;
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }

  const total = (simflexRows || []).length;
  const start = (page - 1) * limit;
  const paginatedSimflexRows = (simflexRows || []).slice(start, start + limit);

  const isbns = paginatedSimflexRows.map(r => r.isbn).filter(Boolean);
  let booksByIsbn = {};
  
  if (isbns.length > 0) {
    const { data: books } = await dashboardRepo.getBooksByIsbnsWithLots(isbns);
    const firstRel = (rel) => Array.isArray(rel) ? rel[0] : rel;
    
    (books || []).forEach(b => {
      const box = firstRel(b.box) || {};
      const lot = firstRel(box.lot) || {};
      booksByIsbn[b.isbn] = {
        title: b.title || null,
        box_number: box.box_number || null,
        lot_number: lot.lot_number || null,
      };
    });

    const missingIsbns = isbns.filter(isbn => 
      !booksByIsbn[isbn] || !booksByIsbn[isbn].title || !booksByIsbn[isbn].lot_number
    );
    
    if (missingIsbns.length > 0) {
      const ilmsResults = await ilmsApi.searchMultipleISBNs(missingIsbns);
      ilmsResults.forEach((res, i) => {
        if (res.success && res.data) {
          const isbn = missingIsbns[i];
          if (!booksByIsbn[isbn]) booksByIsbn[isbn] = {};
          booksByIsbn[isbn].title = booksByIsbn[isbn].title || res.data.Title || null;
          booksByIsbn[isbn].lot_number = booksByIsbn[isbn].lot_number || res.data.LotNo || null;
          booksByIsbn[isbn].box_number = booksByIsbn[isbn].box_number || res.data.BoxNo || null;
        }
      });
    }
  }

  const paginatedRows = paginatedSimflexRows.map(r => {
    const local = booksByIsbn[r.isbn] || {};
    return {
      isbn: r.isbn,
      title: local.title || null,
      box_number: local.box_number || r.box_number || '—',
      lot_number: local.lot_number || '—',
      scan_user: r.scan_user || '—',
      page_count: r.page_count || 0,
      completed_at: r.updated,
    };
  });

  return { success: true, rows: paginatedRows, total, page, limit };
};

export const getLotDetailsService = async (req) => {
  const { lot_number } = req.params;
  const candidates = generateLotCandidates(lot_number);

  let lot = null;
  for (const candidate of candidates) {
    const { data } = await dashboardRepo.searchLotByCandidate(candidate);
    if (data) { lot = data; break; }
  }

  if (!lot) throw { status: 404, message: 'Lot not found' };

  const { data: boxes, error: boxesError } = await dashboardRepo.getBoxesByLotId(lot.id);
  if (boxesError) throw boxesError;

  const boxIds = (boxes || []).map(b => b.id);
  const boxById = {};
  (boxes || []).forEach(box => { boxById[box.id] = box; });

  const stageBreakdown = {};
  let totalBooks = 0;
  (boxes || []).forEach(box => {
    stageBreakdown[box.current_stage] = (stageBreakdown[box.current_stage] || 0) + 1;
    totalBooks += (box.books?.[0]?.count || 0);
  });

  let processable = 0, nonProcessable = 0, transmitted = 0;
  if (boxIds.length > 0) {
    const { data: activity, error: activityError } = await dashboardRepo.getBookActivitiesByBoxIds(boxIds);
    if (activityError) throw activityError;

    (activity || []).forEach(a => {
      const boxStage = boxById[a.books?.box_id]?.current_stage;
      if (a.scan_status === 'processable') {
        processable++;
        if (boxStage === 'storage') transmitted++;
      } else if (a.scan_status === 'non_processable') {
        nonProcessable++;
      }
    });
  }

  const totalBoxes = (boxes || []).length;
  const completionProgress = totalBooks > 0 ? Math.round((transmitted / totalBooks) * 100) : 0;
  const processingStatus = completionProgress === 100 ? 'Completed' : completionProgress > 0 ? 'In Progress' : 'Not Started';

  return {
    success: true,
    lotDetails: {
      lot_number: lot.lot_number,
      lot_type: lot.type || null,
      total_boxes: totalBoxes,
      total_books: totalBooks,
      completion_progress: completionProgress,
      processing_status: processingStatus,
      stage_breakdown: stageBreakdown,
      books_by_status: {
        transmitted,
        pending: totalBooks - transmitted,
        processable,
        non_processable: nonProcessable,
      },
    },
  };
};

export const getPipelineStatsService = async (req) => {
  await runWarehouseTimeoutSweep();
  const { lot_number, brand } = req.query;
  const selectedBrand = (brand === 'jaguar' || brand === 'mustang') ? brand : null;
  const { getSimflexStatusForISBNs } = await import('../scan_manager/api/index.js');

  let lotId = null;
  if (lot_number) {
    const { data: lot } = await dashboardRepo.searchLotByCandidate(lot_number);
    if (lot) lotId = lot.id;
  }

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const startIso = startOfDay.toISOString();
  const endIso = endOfDay.toISOString();

  let { data: boxes, error: boxesError } = await dashboardRepo.getProcessedBoxesToday(
    startIso, endIso, lotId, selectedBrand ? selectedBrand.charAt(0).toUpperCase() + selectedBrand.slice(1).toLowerCase() : null
  );
  if (boxesError) throw boxesError;

  boxes = boxes || [];
  
  const STAGE_ORDER = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit', 'storage'];
  const stageCountsByType = {};
  STAGE_ORDER.forEach(stage => {
    stageCountsByType[stage] = { mustang: 0, jaguar: 0, total: 0 };
  });

  const activeBoxIds = boxes.filter(b => b.current_stage === 'scan' || b.current_stage === 'transmit').map(b => b.id);
  const boxStateOverrides = {};

  let activeTransmitBooks = 0;
  if (activeBoxIds.length > 0) {
    const { data: activities } = await dashboardRepo.getProcessableBookActivitiesForBoxes(activeBoxIds);

    if (activities && activities.length > 0) {
      const isbns = [...new Set(activities.map(a => a.books?.isbn))];
      const location = selectedBrand || 'mustang';
      
      const simflexResult = await getSimflexStatusForISBNs(isbns, location);
      const simflexData = simflexResult.success ? simflexResult.data : [];

      const boxGroups = {};
      activities.forEach(a => {
        const boxId = a.books?.box_id;
        if (!boxGroups[boxId]) boxGroups[boxId] = { isbns: [], completed: 0, transmitting: 0 };
        const isbn = a.books?.isbn;
        boxGroups[boxId].isbns.push(isbn);
        
        const simStatus = simflexData.find(s => s.isbn === isbn);
        if (simStatus) {
          if (simStatus.transmissionCompleted) {
            boxGroups[boxId].completed++;
          } else if (simStatus.latestStatus?.toLowerCase().includes('transmit')) {
            boxGroups[boxId].transmitting++;
          }
        }
      });

      for (const boxId of activeBoxIds) {
        const group = boxGroups[boxId];
        if (!group || group.isbns.length === 0) continue;

        const allCompleted = group.completed === group.isbns.length;
        const anyTransmitting = group.transmitting > 0 || group.completed > 0;

        if (allCompleted) {
          boxStateOverrides[boxId] = 'storage';
        } else if (anyTransmitting) {
          boxStateOverrides[boxId] = 'transmit';
        } else {
          boxStateOverrides[boxId] = 'scan';
        }

        const box = boxes.find(b => b.id === boxId);
        const session = box?.box_sessions?.[0];
        if (box && box.current_stage === 'scan' && session?.status === 'received') {
          activeTransmitBooks += group.transmitting;
        }
      }
    }
  }

  boxes.forEach(b => {
    const effectiveStage = boxStateOverrides[b.id] || b.current_stage;
    if (stageCountsByType[effectiveStage]) {
      const type = (b.box_type || '').toString().toLowerCase();
      const normalizedType = type === 'jaguar' ? 'jaguar' : 'mustang';
      stageCountsByType[effectiveStage][normalizedType]++;
      stageCountsByType[effectiveStage].total++;
    }
  });

  const stageCounts = {};
  STAGE_ORDER.forEach(stage => {
    stageCounts[stage] = selectedBrand ? stageCountsByType[stage][selectedBrand] : stageCountsByType[stage].total;
  });

  return { stageCounts, stageCountsByType, activeTransmitBooks, today: startIso.split('T')[0] };
};

export const resolveQcFlagService = async (req) => {
  const { id } = req.params;
  const { success, error, box_id } = await dashboardRepo.resolveQcFlag(id);
  if (!success) {
    if (error && error.status === 404) {
      throw { status: 404, message: 'Flag not found' };
    }
    throw error;
  }

  if (box_id) {
    syncBoxTransmissionStatus(box_id).catch(err => logger.error('Error syncing transmission on resolve:', err));
    broadcastEvent('PIPELINE_UPDATED', { boxId: box_id });
  }

  return { success: true };
};

export const checkMissingIsbnService = async (req) => {
  const { isbn } = req.params;
  const { box_id } = req.query; // the box where it is missing, to exclude if we want, or just get any processable box

  const result = await dashboardRepo.findProcessableBookByIsbn(isbn, box_id);
  
  return { success: true, ...result };
};
