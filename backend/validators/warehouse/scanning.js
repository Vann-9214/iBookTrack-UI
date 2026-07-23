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
