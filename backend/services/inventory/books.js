/**
 * services/inventory/books.js
 *
 * Contains the core business logic for the books domain.
 * Integrates with external systems (like the iLMS API) and processes data
 * before it is saved or returned to the user.
 */

import * as booksRepo from '../../repositories/inventory/books.js';
import { ilmsApi } from '../../services/ilms/api.js';
import { logger } from '../../utils/logger.js';

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
  const { issue, remarks, box_id } = req.body;
  const { data: scan, error: scanError } = await booksRepo.getScanRecord(id);
  if (scanError || !scan) throw { status: 404, payload: { error: 'Scan record not found' } };
  
  const { data: latestActivity } = await booksRepo.getLatestActivity(scan.book_id || scan.books?.id);
  const activityId = latestActivity?.id || id;
  
  const { data: flagData, error: flagError } = await booksRepo.insertFlag({
    book_activity_id: activityId,
    rejection_reason: issue,
    notes: remarks || null,
    warehouse_flag_by: req.user.id
  });
  if (flagError) throw flagError;
  return { success: true, scan_id: id, issue, remarks };
};

export const removeFlagService = async (req, res) => {
  const { id } = req.params;
  await booksRepo.deleteFlag(id);
  return { success: true, scan_id: id };
};
