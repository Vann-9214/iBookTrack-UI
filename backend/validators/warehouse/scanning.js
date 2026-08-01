/**
 * validators/scanning.js
 *
 * Zod validation schemas for scanning endpoints.
 */

import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const baseQuerySchema = {
  query: z.object({
    from: z.string().regex(dateRegex).optional(),
    to: z.string().regex(dateRegex).optional(),
    date: z.string().regex(dateRegex).optional(),
    location: z.enum(['mustang', 'jaguar']).optional(),
    newProcessOnly: z.enum(['true', 'false', '']).optional(),
    wipOnly: z.enum(['true', 'false', '']).optional(),
    machineName: z.string().optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  })
};

// Scan Manager list endpoints that previously accepted unvalidated query
// strings. The machine name reaches the Scan Manager query builder, so it is
// length-capped here in addition to the escaping done by the sql`` helper.
export const locationOnlySchema = {
  query: z.object({
    location: z.enum(['mustang', 'jaguar']).optional()
  })
};

export const machineBooksSchema = {
  query: z.object({
    machine: z.string().trim().min(1, 'machine query param required').max(100, 'machine name is too long'),
    from: z.string().regex(dateRegex).optional(),
    to: z.string().regex(dateRegex).optional(),
    location: z.enum(['mustang', 'jaguar']).optional(),
    newProcessOnly: z.enum(['true', 'false', '']).optional()
  })
};

export const simflexStatusSchema = {
  query: z.object({
    isbns: z.string().optional(),
    location: z.enum(['mustang', 'jaguar']).optional()
  })
};

export const enrichIlmsSchema = {
  body: z.object({
    isbns: z.array(z.string()).optional()
  })
};
