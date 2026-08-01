/**
 * services/warehouse/scanning.js
 *
 * Business logic for scanning operations.
 * Orchestrates calls to Scan Manager API, iLMS API, and database repo.
 */

import { logger } from '../../utils/logger.js';
import * as scanningRepo from '../../repositories/warehouse/scanning.js';
import scanManagerApi from '../scan_manager/api/index.js';
import scanManagerStatusCounts from '../scan_manager/status-counts.js';
import { runWarehouseTimeoutSweep } from '../../utils/warehouseTimeout.js';

export const getLiveScanningService = async (req) => {
  await runWarehouseTimeoutSweep();
  const today = new Date().toISOString().split('T')[0];
  const fromDate = req.query.from || today;
  const toDate = req.query.to || today;
  const location = req.query.location || 'mustang';
  const newProcessOnly = req.query.newProcessOnly === 'true';
  const wipOnly = req.query.wipOnly === 'true';

  if (wipOnly) {
    const [byStage, stageCounts] = await Promise.all([
      scanManagerApi.getScanningByStage(fromDate, toDate, location, newProcessOnly),
      scanManagerStatusCounts.getStageCounts(fromDate, toDate, location),
    ]);

    const SCAN_STAGES = ['Scanning', 'Jaguar Validate', 'Tif2PDF', 'Preval'];
    const scanWipCount = byStage.data?.reduce((sum, s) => {
      return SCAN_STAGES.includes(s.Stage) ? sum + (s.Total || 0) : sum;
    }, 0) || 0;

    const transmitStage = (stageCounts.stages || []).find(s => s.stage === 'Transmission_Archive');
    const transmitBooks = transmitStage ? transmitStage.Ongoing : 0;

    return { success: true, scanWipCount, transmitBooks };
  }

  const [summary, byMachine, byStage, data, allTime, dailyOutput, stageCounts, completedTransmissions, allBooks] = await Promise.all([
    scanManagerApi.getTodayScanningSummary(fromDate, toDate, location, newProcessOnly),
    scanManagerApi.getScanningByMachine(fromDate, toDate, location, newProcessOnly),
    scanManagerApi.getScanningByStage(fromDate, toDate, location, newProcessOnly),
    scanManagerApi.getScanningData(fromDate, toDate, location, newProcessOnly),
    scanManagerApi.getTotalScansAllTime(),
    scanManagerApi.getDailyOutputCount(fromDate === toDate ? fromDate : undefined, location),
    scanManagerStatusCounts.getStageCounts(fromDate, toDate, location),
    scanManagerApi.getCompletedTransmissionsCount(fromDate, toDate, location, newProcessOnly),
    scanManagerApi.getAllBooksToday(fromDate, toDate, location, newProcessOnly)
  ]);

  const scanStageResult = req.query.from && req.query.to
    ? await scanManagerApi.getScanStageBoxes(fromDate, toDate, location)
    : await scanManagerApi.getScanStageBoxes(undefined, undefined, location);
    
  logger.info('[/live] getScanStageBoxes result: count=', scanStageResult.count, 'rows=', scanStageResult.data?.length, 'success=', scanStageResult.success, 'error=', scanStageResult.error);
  const scanBooks = scanStageResult.count || 0;

  const SCAN_STAGES = ['Scanning', 'Jaguar Validate', 'Tif2PDF', 'Preval'];
  const scanWipCount = byStage.data?.reduce((sum, s) => {
    return SCAN_STAGES.includes(s.Stage) ? sum + (s.Total || 0) : sum;
  }, 0) || 0;

  const transmitStage = (stageCounts.stages || []).find(s => s.stage === 'Transmission_Archive');
  const transmitBooks = transmitStage ? transmitStage.Ongoing : 0;

  let processedAllBooks = allBooks.books || [];
  let processedRecentScans = Array.isArray(data.data) 
    ? data.data.filter(s => !String(s.Status || '').toUpperCase().includes('COMPLETED')).slice(0, 200) 
    : [];
  
  const allIsbns = new Set([
    ...processedAllBooks.map(b => b.ISBN),
    ...processedRecentScans.map(b => b.ISBN)
  ].filter(Boolean));

  if (allIsbns.size > 0) {
    const isbns = Array.from(allIsbns);
    const chunkSize = 200;
    const dbMap = {};
    for (let i = 0; i < isbns.length; i += chunkSize) {
      const chunk = isbns.slice(i, i + chunkSize);
      const { data: dbBooks, error } = await scanningRepo.getBooksByIsbns(chunk);
      if (error) {
        logger.error("Database Error fetching lot/box:", error);
      }
      if (dbBooks && dbBooks.length > 0) {
        for (const b of dbBooks) {
          const boxObj = Array.isArray(b.box) ? b.box[0] : b.box;
          const lotObj = boxObj && Array.isArray(boxObj.lot) ? boxObj.lot[0] : (boxObj?.lot || null);
          dbMap[b.isbn] = {
            box: boxObj?.box_number || '—',
            lot: lotObj?.lot_number || '—'
          };
        }
      }
    }
    processedAllBooks = processedAllBooks.map(b => ({
      ...b,
      BoxNumber: dbMap[b.ISBN]?.box || '—',
      LotNumber: dbMap[b.ISBN]?.lot || '—'
    }));
    processedRecentScans = processedRecentScans.map(b => ({
      ...b,
      BoxNumber: dbMap[b.ISBN]?.box || '—',
      LotNumber: dbMap[b.ISBN]?.lot || '—'
    }));
  }

  return {
    success: true,
    summary: { ...summary.data, completedTransmissions: completedTransmissions.count || 0 },
    byMachine: byMachine.data,
    byStage: byStage.data,
    recentScans: processedRecentScans,
    allTimeTotal: allTime.total || 0,
    dailyOutput: dailyOutput.count || 0,
    scanBooks,
    scanWipCount,
    transmitBooks,
    allBooks: processedAllBooks,
    totalBooks: allBooks.totalBooks || 0,
    wipCount: allBooks.wipCount || 0,
    limitReached: allBooks.limitReached || false,
  };
};

export const getScanRowsService = async (req) => {
  const location = req.query.location || 'mustang';
  const result = await scanManagerApi.getScanStageBoxes(undefined, undefined, location);
  return { success: true, rows: result.data || [], count: result.count };
};

export const getTransmitRowsService = async (req) => {
  const location = req.query.location || 'mustang';
  const boxType = location.charAt(0).toUpperCase() + location.slice(1).toLowerCase();

  const simResult = await scanManagerApi.getTransmitStageRows(location);
  const simRows = simResult.data || [];

  if (simRows.length === 0) return { success: true, rows: [], count: 0 };

  const simflexIsbns = [...new Set(simRows.map(r => String(r.ISBN || '').trim()).filter(Boolean))];

  const { data: dbBooks, error: dbError } = await scanningRepo.getTransmitBooksByIsbnsAndType(simflexIsbns, boxType);
  if (dbError) throw dbError;

  if (!dbBooks || dbBooks.length === 0) return { success: true, rows: [], count: 0 };

  const bookIds = dbBooks.map(b => b.id).filter(Boolean);
  const { data: activities } = await scanningRepo.getBookActivitiesByBookIds(bookIds);

  const processableIds = new Set(
    (activities || [])
      .filter(a => a.scan_status === 'processable')
      .map(a => a.book_id)
  );

  const dbLookup = {};
  for (const book of dbBooks) {
    if (!processableIds.has(book.id)) continue;
    const box = book.boxes;
    if (!box) continue;
    dbLookup[book.isbn] = {
      title: book.title || null,
      box_number: box.box_number,
      lot_number: box.lot?.lot_number || null,
    };
  }

  const enrichedRows = [];
  const seenIsbns = new Set();
  for (const row of simRows) {
    const isbn = String(row.ISBN || '').trim();
    if (!isbn || seenIsbns.has(isbn)) continue;
    const dbInfo = dbLookup[isbn];
    if (!dbInfo) continue; 
    seenIsbns.add(isbn);
    enrichedRows.push({
      ISBN: isbn,
      BoxNumber: dbInfo.box_number,
      LotNumber: dbInfo.lot_number,
      Title: dbInfo.title,
      Status: row.Status,
      ScanUser: row.ScanUser,
      ScanDate: row.ScanDate,
      PageCount: row.PageCount,
      Updated: row.Updated,
    });
  }

  return { success: true, rows: enrichedRows, count: enrichedRows.length };
};

export const getMachineBooksService = async (req) => {
  const machine = String(req.query.machine || '').trim();
  if (!machine) throw { status: 400, payload: { success: false, error: 'machine query param required' } };

  const result = await scanManagerApi.getBooksByMachine(
    req.query.from,
    req.query.to,
    machine,
    req.query.location || 'mustang',
    req.query.newProcessOnly === 'true'
  );
  if (!result.success) throw { status: 502, payload: result };
  return result;
};

export const getRankingService = async (req) => {
  const location = req.query.location || 'mustang';
  return await scanManagerApi.getScanningRanking(req.query.date, location);
};

export const getExportService = async (req, res) => {
  const location = req.query.location || 'mustang';
  const result = await scanManagerApi.getScanningExportData(req.query.date, location);
  if (!result.success) throw { status: 500, payload: result };
  
  const rows = result.data;
  const headers = ['ScanDate', 'ScanUser', 'BoxNumber', 'ISBN', 'PageCount', 'Status', 'Machine', 'Updated'];
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const v = String(r[h] ?? '');
      // Spreadsheet applications treat a cell starting with = + - @ (or a
      // leading tab/CR) as a formula and will execute it when the export is
      // opened. Values come from Scan Manager, so a leading apostrophe is added
      // to keep them as literal text instead of executable content.
      const safeValue = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
      return `"${safeValue.replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\r\n');
  
  const date = req.query.date || new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="scanning-${date}-${location}.csv"`);
  res.send(csv);
};

export const getSimflexStatusService = async (req) => {
  const { isbns } = req.query;
  const location = req.query.location || 'mustang';
  if (!isbns) throw { status: 400, payload: { success: false, error: 'isbns query param required' } };

  const isbnList = String(isbns).split(',').map(s => s.trim()).filter(Boolean);
  if (isbnList.length === 0) return { success: true, statuses: {} };

  const { getSimflexStatusForISBNs } = await import('../scan_manager/api/index.js');
  const result = await getSimflexStatusForISBNs(isbnList, location);

  if (!result.success) {
    throw { status: 502, payload: { success: false, error: result.error || 'Scan Manager unavailable' } };
  }

  const statuses = {};
  for (const r of result.data) {
    statuses[r.isbn] = {
      latestStatus: r.latestStatus,
      transmissionCompleted: r.transmissionCompleted
    };
  }

  if (Object.keys(statuses).length > 0) {
    const { data: booksData } = await scanningRepo.getBookIdsByIsbns(isbnList);
      
    if (booksData && booksData.length > 0) {
      const updatePromises = booksData.map(book => {
        const statObj = statuses[book.isbn];
        if (statObj) {
          const statusStr = statObj.transmissionCompleted ? 'Transmission Completed' : (statObj.latestStatus || 'Pending');
          return scanningRepo.updateBookActivityTransmissionStatus(book.id, statusStr);
        }
        return null;
      }).filter(Boolean);
      
      await Promise.all(updatePromises);
    }
  }

  return { success: true, statuses };
};

export const enrichIlmsService = async (req) => {
  const { isbns } = req.body;
  if (!Array.isArray(isbns) || isbns.length === 0) {
    return { success: true, enriched: {} };
  }

  const safeIsbns = isbns.slice(0, 100);
  const { ilmsApi } = await import('../ilms/api.js');

  const results = await Promise.all(
    safeIsbns.map(async (isbn) => {
      const result = await ilmsApi.searchBookByISBN(isbn);
      return { isbn, ...result };
    })
  );

  const enriched = {};
  for (const r of results) {
    if (r.success && r.data) {
      enriched[r.isbn] = { 
        box: r.data.BoxNo || '—', 
        lot: r.data.LotNo || '—' 
      };
    } else {
      enriched[r.isbn] = { box: '—', lot: '—' };
    }
  }

  return { success: true, enriched };
};
