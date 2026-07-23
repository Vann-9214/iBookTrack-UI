/**
 * routes/scanning.js
 *
 * Routes for live Scan Manager WMS scanning data.
 */

import express from 'express';
import { requireAuth, requireRole, OPERATIONAL_ROLES } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import * as schemas from '../../validators/warehouse/scanning.js';
import * as controller from '../../controllers/warehouse/scanning.js';

const router = express.Router();

router.get('/live', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.baseQuerySchema), controller.getLiveScanning);
router.get('/scan-rows', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.baseQuerySchema), controller.getScanRows);
router.get('/transmit-rows', requireAuth, requireRole(OPERATIONAL_ROLES), controller.getTransmitRows);
router.get('/machine-books', requireAuth, requireRole(OPERATIONAL_ROLES), controller.getMachineBooks);
router.get('/ranking', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.baseQuerySchema), controller.getRanking);
router.get('/export', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.baseQuerySchema), controller.getExport);
router.get('/simflex-status', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.simflexStatusSchema), controller.getSimflexStatus);
router.post('/enrich-ilms', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.enrichIlmsSchema), controller.enrichIlms);

export default router;
