/**
 * validators/books.js
 *
 * Defines the Zod validation schemas for all books-related endpoints.
 * This ensures that incoming requests have the correct parameters and body data
 * before they reach the controller.
 */

import { z } from 'zod';

export const getBooksSchema = {
  query: z.object({
    box_id: z.string().trim().max(50).optional()
  })
};

export const searchIlmsBookSchema = {
  params: z.object({
    isbn: z.string().trim().min(1).max(20)
  })
};

export const flagBookSchema = {
  params: z.object({
    id: z.string().trim().min(1).max(50)
  }),
  body: z.object({
    issue: z.string().trim().min(1).max(200),
    remarks: z.string().trim().max(1000).optional(),
    box_id: z.string().trim().max(50).optional()
  })
};

export const removeFlagSchema = {
  params: z.object({
    id: z.string().trim().min(1).max(50)
  })
};
