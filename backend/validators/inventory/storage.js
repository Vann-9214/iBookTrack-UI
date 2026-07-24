/**
 * validators/storage.js
 *
 * Zod validation schemas for storage endpoints.
 */

import { z } from 'zod';

export const provisionLocationsSchema = {
  body: z.object({
    section: z.union([z.string().trim().max(50), z.number()]),
    capacity: z.union([z.string().trim().max(20), z.number()]).optional(),
    racks: z.array(z.string().trim().max(20)).max(200).optional(),
    levels: z.array(z.union([z.string().trim().max(20), z.number()])).max(200).optional()
  })
};

export const updateLocationSchema = {
  params: z.object({
    id: z.string().uuid()
  })
  // capacity is validated manually in controller/service
};

export const deleteLocationSchema = {
  params: z.object({
    id: z.string().uuid()
  })
};

export const assignBatchSchema = {
  body: z.object({
    box_ids: z.array(z.string().uuid()).min(1, 'At least one box is required').max(500, 'Too many boxes in one request'),
    storage_location_id: z.string().uuid()
  })
};

export const removeBatchSchema = {
  body: z.object({
    assignment_ids: z.array(z.string().uuid()).min(1, 'At least one assignment is required').max(500, 'Too many assignments in one request')
  })
};

export const searchStorageSchema = {
  query: z.object({
    q: z.string().trim().min(1).max(100),
    box_type: z.string().trim().max(50).optional(),
    search_type: z.string().trim().max(50).optional()
  })
};

export const confirmAssignmentSchema = {
  params: z.object({
    id: z.string().uuid()
  })
};
