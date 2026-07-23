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
    limit: z.string().regex(/^\d+$/).optional(),
    offset: z.string().regex(/^\d+$/).optional(),
    search: z.string().optional(),
    type: z.string().optional()
  })
};

export const getLotTransmissionSummarySchema = {
  params: z.object({
    lot_number: z.string().min(1, 'Lot number is required')
  }),
  query: z.object({
    type: z.string().optional()
  })
};

export const getLotSchema = {
  params: z.object({
    lot_number: z.string().min(1, 'Lot number is required')
  })
};
