import express from 'express';
import { requireAuth, requireRole, OPERATIONAL_ROLES } from '../../middleware/authMiddleware.js';
import * as schemas from '../../validators/warehouse/warehouse.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import * as controller from '../../controllers/warehouse/warehouse.js';

const router = express.Router();

router.post('/sessions/start', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.startSessionSchema), controller.startSession);
router.post('/sessions/:session_id/scan', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.scanBookSchema), controller.scanBook);
router.post('/sessions/:session_id/complete', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.completeSessionSchema), controller.completeSession);
router.post('/sessions/bulk-save', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.bulkSaveSchema), controller.bulkSaveSession);
router.post('/boxes/:box_id/resume-session', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.resumeSessionSchema), controller.resumeSession);
router.post('/boxes/:box_id/cancel-session', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.cancelSessionSchema), controller.cancelSession);
// Operational users may cancel/reset their own warehouse sessions; the service
// enforces that non-supervisors can only delete sessions they own.
router.delete('/sessions/:session_id', requireAuth, requireRole(OPERATIONAL_ROLES), controller.deleteSession);
// Data-returning routes: require an assigned operational role (or supervisor).
// requireRole(OPERATIONAL_ROLES) blocks role-less/pending-approval accounts,
// which would otherwise pass requireAuth alone and read warehouse data.
router.get('/sessions', requireAuth, requireRole(OPERATIONAL_ROLES), controller.listSessions);
router.get('/ilms-lots', requireAuth, requireRole(OPERATIONAL_ROLES), controller.getIlmsLots);
router.get('/overview', requireAuth, requireRole(OPERATIONAL_ROLES), controller.getWarehouseOverview);
router.get('/box-exists', requireAuth, requireRole(OPERATIONAL_ROLES), controller.checkBoxExists);
router.get('/isbn-stream', requireAuth, requireRole(OPERATIONAL_ROLES), controller.isbnStream);
router.post('/isbn-stream/query', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.isbnStreamQuerySchema), controller.queryIsbnStream);
router.get('/search/isbn/:isbn', requireAuth, requireRole(OPERATIONAL_ROLES), controller.searchIsbn);
router.get('/rejected-books', requireAuth, requireRole(OPERATIONAL_ROLES), controller.getRejectedBooks);
router.patch('/scans/:scan_id/flag', requireAuth, requireRole(OPERATIONAL_ROLES), controller.flagScan);
router.post('/scans/:scan_id/tag', requireAuth, requireRole(OPERATIONAL_ROLES), validateRequest(schemas.tagScanSchema), controller.tagScan);
router.get('/boxes/:box_id/scans', requireAuth, requireRole(OPERATIONAL_ROLES), controller.getBoxScans);

export default router;
