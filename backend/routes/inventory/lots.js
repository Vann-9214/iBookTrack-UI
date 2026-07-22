
/**
 * routes/lots.js
 *
 * Routes for lot management and Scan Manager transmission summaries.
 */

import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import * as schemas from '../../validators/inventory/lots.js';
import * as controller from '../../controllers/inventory/lots.js';

const router = express.Router();

router.get('/', requireAuth, validateRequest(schemas.getLotsSchema), controller.getLots);
router.get('/:lot_number/transmission-summary', requireAuth, validateRequest(schemas.getLotTransmissionSummarySchema), controller.getLotTransmissionSummary);
router.get('/:lot_number', requireAuth, validateRequest(schemas.getLotSchema), controller.getLot);

export default router;
