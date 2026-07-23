/**
 * validators/boxes.js
 *
 * Zod validation schemas for box endpoints.
 */

import { z } from 'zod';

export const getBoxesSchema = {
  query: z.object({
    lot_id: z.string().optional(),
    current_stage: z.string().optional(),
    box_number: z.string().optional(),
    exclude_assigned_storage: z.enum(['true', 'false']).optional(),
    box_type: z.string().optional(),
    isbn: z.string().optional()
  })
};

export const getPipelineTransitionsSchema = {
  query: z.object({
    limit: z.string().regex(/^\d+$/).optional(),
    offset: z.string().regex(/^\d+$/).optional(),
    stage: z.string().optional(),
    box_type: z.string().optional(),
    search: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional()
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
    notes: z.string().optional()
  }).optional()
};

export const sendForwardBoxSchema = {
  params: z.object({
    id: z.string().uuid('Invalid box ID format')
  }),
  body: z.object({
    notes: z.string().optional()
  }).optional()
};

export const rollbackBoxSchema = {
  params: z.object({
    id: z.string().uuid('Invalid box ID format')
  }),
  body: z.object({
    to_stage: z.string().min(1)
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
