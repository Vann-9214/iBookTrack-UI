/**
 * routes/dashboard.js
 *
 * Dashboard data aggregation endpoints.
 */

import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import * as schemas from '../validators/dashboard.js';
import * as controller from '../controllers/analytics/dashboard.js';

const router = express.Router();

router.get('/stats', requireAuth, validateRequest(schemas.getStatsSchema), controller.getStats);
router.get('/open-lots', requireAuth, validateRequest(schemas.getOpenLotsSchema), controller.getOpenLots);
router.get('/qc-flags', requireAuth, validateRequest(schemas.getQcFlagsSchema), controller.getQcFlags);
router.get('/daily-output', requireAuth, validateRequest(schemas.getDailyOutputSchema), controller.getDailyOutput);
router.get('/lot-details/:lot_number', requireAuth, validateRequest(schemas.getLotDetailsSchema), controller.getLotDetails);
router.get('/pipeline-stats', requireAuth, validateRequest(schemas.getPipelineStatsSchema), controller.getPipelineStats);

export default router;
