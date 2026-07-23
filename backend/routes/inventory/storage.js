/**
 * routes/storage.js
 *
 * Physical storage locator endpoints.
 */

import express from 'express';
import { requireAuth, requireRole, OPERATIONAL_ROLES } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import * as schemas from '../../validators/inventory/storage.js';
import * as controller from '../../controllers/inventory/storage.js';

const router = express.Router();

const requireSupervisor = requireRole([]); // requireRole inherently allows supervisor
const requireStorageAction = requireRole(['storage']);

router.get('/locations', requireAuth, requireRole(OPERATIONAL_ROLES), controller.getLocations);
router.post('/locations/provision', requireAuth, requireSupervisor, validateRequest(schemas.provisionLocationsSchema), controller.provisionLocations);
router.patch('/locations/:id', requireAuth, requireSupervisor, validateRequest(schemas.updateLocationSchema), controller.updateLocationCapacity);
router.delete('/locations/:id', requireAuth, requireSupervisor, validateRequest(schemas.deleteLocationSchema), controller.deleteLocation);
router.get('/ready-boxes', requireAuth, requireRole(OPERATIONAL_ROLES), controller.getReadyBoxes);
router.post('/assign/batch', requireAuth, requireStorageAction, validateRequest(schemas.assignBatchSchema), controller.assignBatch);
router.delete('/assignments/batch', requireAuth, requireStorageAction, validateRequest(schemas.removeBatchSchema), controller.removeBatch);
router.get('/search', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.searchStorageSchema), controller.searchStorage);
router.get('/pending-assignments', requireAuth, requireRole(OPERATIONAL_ROLES), controller.getPendingAssignments);
router.post('/assignments/:id/confirm', requireAuth, requireStorageAction, validateRequest(schemas.confirmAssignmentSchema), controller.confirmAssignment);

export default router;
