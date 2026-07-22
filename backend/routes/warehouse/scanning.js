/**
 * routes/scanning.js
 *
 * Routes for live Scan Manager WMS scanning data.
 */

import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import * as schemas from '../../validators/warehouse/scanning.js';
import * as controller from '../../controllers/warehouse/scanning.js';

const router = express.Router();

router.get('/live', requireAuth, validateRequest(schemas.baseQuerySchema), controller.getLiveScanning);
router.get('/scan-rows', requireAuth, validateRequest(schemas.baseQuerySchema), controller.getScanRows);
router.get('/transmit-rows', requireAuth, controller.getTransmitRows);
router.get('/machine-books', requireAuth, controller.getMachineBooks);
router.get('/ranking', requireAuth, validateRequest(schemas.baseQuerySchema), controller.getRanking);
router.get('/export', requireAuth, validateRequest(schemas.baseQuerySchema), controller.getExport);
router.get('/simflex-status', requireAuth, validateRequest(schemas.simflexStatusSchema), controller.getSimflexStatus);
router.post('/enrich-ilms', requireAuth, validateRequest(schemas.enrichIlmsSchema), controller.enrichIlms);

export default router;
