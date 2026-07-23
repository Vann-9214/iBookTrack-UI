
/**
 * routes/lots.js
 *
 * Routes for lot management and Scan Manager transmission summaries.
 */

import express from 'express';
import { requireAuth, requireRole, OPERATIONAL_ROLES } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import * as schemas from '../../validators/inventory/lots.js';
import * as controller from '../../controllers/inventory/lots.js';

const router = express.Router();

router.get('/', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.getLotsSchema), controller.getLots);
router.get('/:lot_number/transmission-summary', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.getLotTransmissionSummarySchema), controller.getLotTransmissionSummary);
router.get('/:lot_number', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.getLotSchema), controller.getLot);

export default router;
