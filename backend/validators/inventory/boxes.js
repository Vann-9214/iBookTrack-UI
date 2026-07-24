/**
 * validators/boxes.js
 *
 * Zod validation schemas for box endpoints.
 */

import { z } from 'zod';

export const getBoxesSchema = {
  query: z.object({
    lot_id: z.string().trim().max(50).optional(),
    current_stage: z.string().trim().max(50).optional(),
    box_number: z.string().trim().max(50).optional(),
    exclude_assigned_storage: z.enum(['true', 'false']).optional(),
    box_type: z.string().trim().max(50).optional(),
    isbn: z.string().trim().max(20).optional()
  })
};

export const getPipelineTransitionsSchema = {
  query: z.object({
    limit: z.string().regex(/^\d+$/).max(6).optional(),
    offset: z.string().regex(/^\d+$/).max(9).optional(),
    stage: z.string().trim().max(50).optional(),
    box_type: z.string().trim().max(50).optional(),
    search: z.string().trim().max(100).optional(),
    date_from: z.string().trim().max(30).optional(),
    date_to: z.string().trim().max(30).optional()
  })
};

export const getBoxByNumberSchema = {
  params: z.object({
    box_number: z.string().min(1)
  })
};

export const getBoxByIdSchema = {
  params: z.object({
    id: z.string().uuid('Invalid box ID format')
  })
};

export const getBoxesByLotNumberSchema = {
  params: z.object({
    lot_number: z.string().min(1)
  })
};

export const receiveBoxSchema = {
  params: z.object({
    id: z.string().uuid('Invalid box ID format')
  })
};

export const advanceBoxSchema = {
  params: z.object({
    id: z.string().uuid('Invalid box ID format')
  }),
  body: z.object({
    notes: z.string().trim().max(2000).optional()
  }).optional()
};

export const sendForwardBoxSchema = {
  params: z.object({
    id: z.string().uuid('Invalid box ID format')
  }),
  body: z.object({
    notes: z.string().trim().max(2000).optional()
  }).optional()
};

export const rollbackBoxSchema = {
  params: z.object({
    id: z.string().uuid('Invalid box ID format')
  }),
  body: z.object({
    to_stage: z.string().trim().min(1).max(50)
  })
};

export const getBoxTransmissionSchema = {
  params: z.object({
    id: z.string().min(1)
  })
};

export const checkSimflexSchema = {
  params: z.object({
    id: z.string().uuid('Invalid box ID format')
  })
};

export const deleteBoxSchema = {
  params: z.object({
    id: z.string().uuid('Invalid box ID format')
  })
};
