/**
 * routes/boxes.js
 *
 * Physical boxes pipeline endpoints.
 */

import express from 'express';
import { requireAuth, requireRole, OPERATIONAL_ROLES } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import * as schemas from '../../validators/inventory/boxes.js';
import * as controller from '../../controllers/inventory/boxes.js';

const router = express.Router();

router.get('/', requireAuth, validateRequest(schemas.getBoxesSchema), controller.getBoxes);
router.get('/pipeline-transitions', requireAuth, validateRequest(schemas.getPipelineTransitionsSchema), controller.getPipelineTransitions);
router.get('/by-number/:box_number', requireAuth, validateRequest(schemas.getBoxByNumberSchema), controller.getBoxByNumber);
router.get('/:id', requireAuth, validateRequest(schemas.getBoxByIdSchema), controller.getBoxById);
router.get('/lot/:lot_number', requireAuth, validateRequest(schemas.getBoxesByLotNumberSchema), controller.getBoxesByLotNumber);
router.post('/:id/receive', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.receiveBoxSchema), controller.receiveBox);
router.post('/:id/advance', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.advanceBoxSchema), controller.advanceBox);
router.post('/:id/send-forward', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.sendForwardBoxSchema), controller.sendForwardBox);
router.post('/:id/rollback', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.rollbackBoxSchema), controller.rollbackBox);
router.get('/:id/transmission', requireAuth, validateRequest(schemas.getBoxTransmissionSchema), controller.getBoxTransmission);
router.post('/:id/check-simflex', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.checkSimflexSchema), controller.checkSimflex);
router.delete('/:id', requireAuth, requireRole(['supervisor']), validateRequest(schemas.deleteBoxSchema), controller.deleteBox);

export default router;
