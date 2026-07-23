/**
 * validators/reports.js
 *
 * Zod validation schemas for reports endpoints.
 */

import { z } from 'zod';

export const lotStatusSchema = {
  query: z.object({
    location: z.enum(['mustang', 'jaguar']).optional(),
    type: z.string().optional()
  })
};
