/**
 * routes/storage.js
 *
 * Physical storage locator endpoints.
 */

import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import * as schemas from '../validators/storage.js';
import * as controller from '../controllers/inventory/storage.js';

const router = express.Router();

router.get('/locations', requireAuth, controller.getLocations);
router.post('/locations/provision', requireAuth, validateRequest(schemas.provisionLocationsSchema), controller.provisionLocations);
router.patch('/locations/:id', requireAuth, validateRequest(schemas.updateLocationSchema), controller.updateLocationCapacity);
router.delete('/locations/:id', requireAuth, validateRequest(schemas.deleteLocationSchema), controller.deleteLocation);
router.get('/ready-boxes', requireAuth, controller.getReadyBoxes);
router.post('/assign/batch', requireAuth, validateRequest(schemas.assignBatchSchema), controller.assignBatch);
router.delete('/assignments/batch', requireAuth, validateRequest(schemas.removeBatchSchema), controller.removeBatch);
router.get('/search', requireAuth, validateRequest(schemas.searchStorageSchema), controller.searchStorage);
router.get('/pending-assignments', requireAuth, controller.getPendingAssignments);
router.post('/assignments/:id/confirm', requireAuth, validateRequest(schemas.confirmAssignmentSchema), controller.confirmAssignment);

export default router;
