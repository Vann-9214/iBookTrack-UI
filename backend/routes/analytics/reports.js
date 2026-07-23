
/**
 * routes/reports.js
 *
 * Routes for generating real-time lot status reports.
 */

import express from 'express';
import { requireAuth, requireRole, OPERATIONAL_ROLES } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import * as schemas from '../../validators/analytics/reports.js';
import * as controller from '../../controllers/analytics/reports.js';

const router = express.Router();

router.get('/lot-status', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.lotStatusSchema), controller.getLotStatus);

export default router;
