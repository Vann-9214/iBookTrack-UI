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

export const getQcFlagsSchema = {
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    today: z.enum(['true', 'false']).optional(),
    box_type: z.string().optional(),
    from_date: z.string().optional(),
    to_date: z.string().optional()
  })
};

export const getDailyOutputSchema = {
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    brand: z.string().optional()
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
    id: z.string().regex(/^\d+$/)
  })
};
