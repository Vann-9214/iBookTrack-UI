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
    box_id: z.string().optional()
  })
};

export const searchIlmsBookSchema = {
  params: z.object({
    isbn: z.string().min(1)
  })
};

export const flagBookSchema = {
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    issue: z.string().min(1),
    remarks: z.string().optional(),
    box_id: z.string().optional()
  })
};

export const removeFlagSchema = {
  params: z.object({
    id: z.string().min(1)
  })
};
