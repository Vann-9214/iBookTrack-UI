/**
 * services/inventory/books.js
 *
 * Contains the core business logic for the books domain.
 * Integrates with external systems (like the iLMS API) and processes data
 * before it is saved or returned to the user.
 */

import { db } from '../../config/db.js';
import * as booksRepo from '../../repositories/inventory/books.js';
import { ilmsApi } from '../../services/ilms/api.js';
import { logger } from '../../utils/logger.js';
import { broadcastEvent } from '../../utils/sse.js';

export const getBooksService = async (req, res) => {
  const { box_id } = req.query;
  const books = await booksRepo.getBooks(box_id);
  return { success: true, books };
};

export const searchIlmsBookService = async (req, res) => {
  const { isbn } = req.params;
  logger.info('🔍 Searching iLMS API for ISBN:', isbn);
  const result = await ilmsApi.searchBookByISBN(isbn);
  if (result.success) {
    logger.info('✅ iLMS API response received');
    return { success: true, source: 'iLMS API', data: result.data };
  } else {
    logger.info('❌ iLMS API error:', result.error);
    throw { status: 404, payload: { success: false, error: result.error, message: 'Book not found in iLMS system' } };
  }
};

export const flagBookService = async (req, res) => {
  const { id } = req.params;
  const { issue, remarks, box_id, ilms_title, ilms_author, physical_title, physical_author } = req.body;
  const { data: scan, error: scanError } = await booksRepo.getScanRecord(id);
  if (scanError || !scan) throw { status: 404, payload: { error: 'Scan record not found' } };
  
  const { data: latestActivity } = await booksRepo.getLatestActivity(scan.book_id || scan.books?.id);
  const activityId = latestActivity?.id || id;
  const actualBookId = scan.book_id || scan.books?.id;

  const { rows: resFlags } = await db.query('SELECT 1 FROM user_flags uf JOIN book_activity ba ON uf.book_activity_id = ba.id WHERE ba.book_id = $1 AND uf.is_resolved = true LIMIT 1', [actualBookId]);
  if (resFlags.length > 0) throw { status: 400, payload: { error: 'This book has a resolved flag and cannot be flagged again.' } };

  
  const { data: flagData, error: flagError } = await booksRepo.insertFlag({
    book_activity_id: activityId,
    rejection_reason: issue,
    notes: remarks || null,
    inventory_flag_by: req.user.id,
    inventory_flag_at: new Date().toISOString()
  });
  if (flagError) throw flagError;

  if (issue === 'mismatched-book') {
    await booksRepo.markBookAsMismatch(actualBookId);
    if (ilms_title && physical_title) {
      await booksRepo.insertMismatchInfo({
        book_id: actualBookId,
        ilms_title,
        ilms_author,
        physical_title,
        physical_author,
        created_by: req.user.id
      });
    }
  }
  
  if (box_id) {
    broadcastEvent('FLAG_UPDATED', { scanId: id, boxId: box_id });
    broadcastEvent('DASHBOARD_REFRESH', { source: 'inventory_flag' });
  }

  return { success: true, scan_id: id, issue, remarks };
};

export const removeFlagService = async (req, res) => {
  const { id } = req.params;
  await booksRepo.deleteFlag(id);
  
  broadcastEvent('FLAG_UPDATED', { scanId: id });
  broadcastEvent('DASHBOARD_REFRESH', { source: 'inventory_unflag' });
  
  return { success: true, scan_id: id };
};
