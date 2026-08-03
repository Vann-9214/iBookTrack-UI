/**
 * validators/dashboard.js
 *
 * Zod validation schemas for dashboard endpoints.
 */

import { z } from 'zod';

export const getStatsSchema = {
  query: z.object({
    lot_number: z.string().optional(),
    lot_range_start: z.string().optional(),
    lot_range_end: z.string().optional(),
    box_type: z.string().optional()
  })
};

export const getOpenLotsSchema = {
  query: z.object({
    location: z.enum(['mustang', 'jaguar']).optional(),
    brand: z.string().optional()
  })
};

// box_type and the date range reach the SQL layer of getQcFlags, so they are
// restricted to the exact brands the app supports and to YYYY-MM-DD dates.
// Anything else is rejected with a 400 rather than reaching the database or
// throwing an invalid-date RangeError deeper in the service.
export const getQcFlagsSchema = {
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    today: z.enum(['true', 'false']).optional(),
    box_type: z.enum(['mustang', 'jaguar', 'Mustang', 'Jaguar']).optional(),
    from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from_date must be in YYYY-MM-DD format.').optional(),
    to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to_date must be in YYYY-MM-DD format.').optional()
  })
};

export const getDailyOutputSchema = {
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    brand: z.string().optional(),
    sort: z.enum(['asc', 'desc']).optional()
  })
};

export const getLotDetailsSchema = {
  params: z.object({
    lot_number: z.string().min(1)
  })
};

export const getPipelineStatsSchema = {
  query: z.object({
    lot_number: z.string().optional(),
    brand: z.string().optional()
  })
};

export const resolveQcFlagSchema = {
  params: z.object({
    id: z.string().min(1)
  })
};
