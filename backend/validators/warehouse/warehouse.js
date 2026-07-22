/**
 * validators/warehouse.js
 *
 * Contains Zod schemas to ensure incoming requests have perfectly formatted data.
 * Rejects bad requests before they ever hit the controller.
 */

import { z } from 'zod';

export const startSessionSchema = {
  body: z.object({
    lot_number: z.string().min(1, 'lot_number is required'),
    box_id: z.string().uuid().optional().nullable(),
    box_number: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    force: z.boolean().optional()
  })
};

export const scanBookSchema = {
  params: z.object({
    session_id: z.string().uuid()
  }),
  body: z.object({
    isbn: z.string().min(1, 'ISBN is required'),
    title: z.string().optional().nullable(),
    scan_status: z.string().optional().nullable(),
    rejection_reason: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    book_type: z.string().optional().nullable()
  })
};

export const completeSessionSchema = {
  params: z.object({
    session_id: z.string().uuid()
  }),
  body: z.object({
    total_expected_books: z.union([z.string(), z.number()]).optional().nullable(),
    issues: z.array(z.any()).optional().nullable(),
    stage: z.string().optional().nullable(),
    book_type: z.string().optional().nullable()
  })
};

export const bulkSaveSchema = {
  body: z.object({
    lot_number: z.string().min(1, 'lot_number is required'),
    box_number: z.string().min(1, 'box_number is required'),
    type: z.string().optional().nullable(),
    force: z.boolean().optional(),
    total_expected_books: z.union([z.string(), z.number()]).optional().nullable(),
    issues: z.array(z.any()).optional().nullable(),
    scanned_books: z.array(z.any()).optional().nullable(),
    book_type: z.string().optional().nullable()
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
    isbn: z.string().min(1, 'isbn is required'),
    type: z.string().optional().nullable(),
    allowExisting: z.boolean().optional()
  })
};

export const tagScanSchema = {
  params: z.object({
    scan_id: z.string().uuid()
  }),
  body: z.object({
    status: z.enum(['reject', 'non_processable']),
    remarks: z.string().min(1, 'remarks are required')
  })
};
