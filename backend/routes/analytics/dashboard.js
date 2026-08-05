/**
 * routes/dashboard.js
 *
 * Dashboard data aggregation endpoints.
 */

import express from 'express';
import { requireAuth, requireRole, OPERATIONAL_ROLES } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import * as schemas from '../../validators/analytics/dashboard.js';
import * as controller from '../../controllers/analytics/dashboard.js';

const router = express.Router();

router.get('/stats', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.getStatsSchema), controller.getStats);
router.get('/open-lots', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.getOpenLotsSchema), controller.getOpenLots);
router.get('/qc-flags', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.getQcFlagsSchema), controller.getQcFlags);
router.get('/qc-flags/export/mismatch', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.getMismatchExportSchema), controller.getMismatchExport);
router.get('/daily-output', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.getDailyOutputSchema), controller.getDailyOutput);
router.get('/lot-details/:lot_number', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.getLotDetailsSchema), controller.getLotDetails);
router.get('/pipeline-stats', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.getPipelineStatsSchema), controller.getPipelineStats);

router.post('/qc-flags/:id/resolve', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.resolveQcFlagSchema), controller.resolveQcFlag);
router.get('/check-missing-isbn/:isbn', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.checkMissingIsbnSchema), controller.checkMissingIsbn);

export default router;
