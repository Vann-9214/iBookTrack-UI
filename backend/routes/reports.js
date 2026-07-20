
/**
 * routes/reports.js
 *
 * Routes for generating real-time lot status reports.
 */

import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import * as schemas from '../validators/reports.js';
import * as controller from '../controllers/reports.js';

const router = express.Router();

router.get('/lot-status', requireAuth, validateRequest(schemas.lotStatusSchema), controller.getLotStatus);

export default router;
