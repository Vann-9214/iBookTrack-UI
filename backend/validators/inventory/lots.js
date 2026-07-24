/**
 * validators/lots.js
 *
 * Defines Zod validation schemas for all lots-related API endpoints.
 * This ensures that incoming queries and parameters are correctly typed
 * before reaching the controller.
 */

import { z } from 'zod';

export const getLotsSchema = {
  query: z.object({
    limit: z.string().regex(/^\d+$/).max(6).optional(),
    offset: z.string().regex(/^\d+$/).max(9).optional(),
    search: z.string().trim().max(100).optional(),
    type: z.string().trim().max(50).optional()
  })
};

export const getLotTransmissionSummarySchema = {
  params: z.object({
    lot_number: z.string().trim().min(1, 'Lot number is required').max(50)
  }),
  query: z.object({
    type: z.string().trim().max(50).optional()
  })
};

export const getLotSchema = {
  params: z.object({
    lot_number: z.string().trim().min(1, 'Lot number is required').max(50)
  })
};
