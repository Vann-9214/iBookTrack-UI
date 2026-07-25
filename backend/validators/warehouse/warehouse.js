/**
 * validators/warehouse.js
 *
 * Contains Zod schemas to ensure incoming requests have perfectly formatted data.
 * Rejects bad requests before they ever hit the controller.
 */

import { z } from 'zod';

// ── Reusable field limits ─────────────────────────────────────────────────────
// Cap free-text so oversized values can't be stored/processed, and cap arrays so
// batch operations can't be abused. Elements of book arrays must be objects, but
// their inner shape stays flexible (passthrough) to avoid breaking existing data.
const isbn        = z.string().trim().min(1, 'ISBN is required').max(20, 'ISBN is too long');
const lotNumber   = z.string().trim().min(1, 'lot_number is required').max(50, 'lot_number is too long');
const boxNumber   = z.string().trim().max(50, 'box_number is too long');
const shortText   = z.string().trim().max(50).optional().nullable();
const title       = z.string().trim().max(500).optional().nullable();
const longText    = z.string().trim().max(2000).optional().nullable();
const bookRecord  = z.object({}).passthrough();
const bookArray   = z.array(bookRecord).max(5000, 'Too many books in one request').optional().nullable();

export const startSessionSchema = {
  body: z.object({
    lot_number: lotNumber,
    box_id: z.string().uuid().optional().nullable(),
    box_number: boxNumber.optional().nullable(),
    type: shortText,
    force: z.boolean().optional()
  })
};

export const scanBookSchema = {
  params: z.object({
    session_id: z.string().uuid()
  }),
  body: z.object({
    isbn,
    title,
    scan_status: shortText,
    rejection_reason: longText.optional(),
    notes: longText.optional(),
    book_type: shortText
  })
};

export const completeSessionSchema = {
  params: z.object({
    session_id: z.string().uuid()
  }),
  body: z.object({
    total_expected_books: z.union([z.string().max(20), z.number()]).optional().nullable(),
    issues: bookArray,
    stage: shortText,
    book_type: shortText
  })
};

export const bulkSaveSchema = {
  body: z.object({
    lot_number: lotNumber,
    box_number: boxNumber.min(1, 'box_number is required'),
    session_id: z.string().uuid().optional().nullable(),
    type: shortText,
    force: z.boolean().optional(),
    total_expected_books: z.union([z.string().max(20), z.number()]).optional().nullable(),
    issues: bookArray,
    scanned_books: bookArray,
    book_type: shortText
  })
};

export const resumeSessionSchema = {
  params: z.object({
    box_id: z.string().uuid()
  })
};

export const cancelSessionSchema = {
  params: z.object({
    box_id: z.string().uuid()
  })
};

export const isbnStreamQuerySchema = {
  body: z.object({
    isbn,
    type: shortText,
    allowExisting: z.boolean().optional()
  })
};

export const tagScanSchema = {
  params: z.object({
    scan_id: z.string().uuid()
  }),
  body: z.object({
    status: z.enum(['reject', 'non_processable']),
    rejection_reason: longText.optional(),
    notes: longText.optional(),
    remarks: z.string().trim().optional(),
    stage: shortText.optional()
  }).refine((data) => {
    const text = data.notes || data.remarks || '';
    return text.trim().length > 0;
  }, {
    message: "notes or remarks are required",
    path: ["notes"]
  })
};
