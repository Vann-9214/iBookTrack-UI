/**
 * routes/storage.js
 *
 * Physical storage locator endpoints.
 */

import express from 'express';
import { requireAuth, requireRole } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import * as schemas from '../../validators/inventory/storage.js';
import * as controller from '../../controllers/inventory/storage.js';

const router = express.Router();

const requireSupervisor = requireRole(['supervisor']);

router.get('/locations', requireAuth, controller.getLocations);
router.post('/locations/provision', requireAuth, requireSupervisor, validateRequest(schemas.provisionLocationsSchema), controller.provisionLocations);
router.patch('/locations/:id', requireAuth, requireSupervisor, validateRequest(schemas.updateLocationSchema), controller.updateLocationCapacity);
router.delete('/locations/:id', requireAuth, requireSupervisor, validateRequest(schemas.deleteLocationSchema), controller.deleteLocation);
router.get('/ready-boxes', requireAuth, controller.getReadyBoxes);
router.post('/assign/batch', requireAuth, requireSupervisor, validateRequest(schemas.assignBatchSchema), controller.assignBatch);
router.delete('/assignments/batch', requireAuth, requireSupervisor, validateRequest(schemas.removeBatchSchema), controller.removeBatch);
router.get('/search', requireAuth, validateRequest(schemas.searchStorageSchema), controller.searchStorage);
router.get('/pending-assignments', requireAuth, controller.getPendingAssignments);
router.post('/assignments/:id/confirm', requireAuth, requireSupervisor, validateRequest(schemas.confirmAssignmentSchema), controller.confirmAssignment);

export default router;
