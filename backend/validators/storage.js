/**
 * validators/storage.js
 *
 * Zod validation schemas for storage endpoints.
 */

import { z } from 'zod';

export const provisionLocationsSchema = {
  body: z.object({
    section: z.union([z.string(), z.number()]),
    capacity: z.union([z.string(), z.number()]).optional(),
    racks: z.array(z.string()).optional(),
    levels: z.array(z.union([z.string(), z.number()])).optional()
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
    box_ids: z.array(z.string()),
    storage_location_id: z.string()
  })
};

export const removeBatchSchema = {
  body: z.object({
    assignment_ids: z.array(z.string())
  })
};

export const searchStorageSchema = {
  query: z.object({
    q: z.string().min(1),
    box_type: z.string().optional(),
    search_type: z.string().optional()
  })
};

export const confirmAssignmentSchema = {
  params: z.object({
    id: z.string().uuid()
  })
};
