import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import * as schemas from '../../validators/warehouse/warehouse.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import * as controller from '../../controllers/warehouse/warehouse.js';

const router = express.Router();

router.post('/sessions/start', requireAuth, validateRequest(schemas.startSessionSchema), controller.startSession);
router.post('/sessions/:session_id/scan', requireAuth, validateRequest(schemas.scanBookSchema), controller.scanBook);
router.post('/sessions/:session_id/complete', requireAuth, validateRequest(schemas.completeSessionSchema), controller.completeSession);
router.post('/sessions/bulk-save', requireAuth, validateRequest(schemas.bulkSaveSchema), controller.bulkSaveSession);
router.post('/boxes/:box_id/resume-session', requireAuth, validateRequest(schemas.resumeSessionSchema), controller.resumeSession);
router.post('/boxes/:box_id/cancel-session', requireAuth, validateRequest(schemas.cancelSessionSchema), controller.cancelSession);
router.delete('/sessions/:session_id', requireAuth, controller.deleteSession);
router.get('/sessions', requireAuth, controller.listSessions);
router.get('/ilms-lots', requireAuth, controller.getIlmsLots);
router.get('/box-exists', requireAuth, controller.checkBoxExists);
router.get('/isbn-stream', requireAuth, controller.isbnStream);
router.post('/isbn-stream/query', requireAuth, validateRequest(schemas.isbnStreamQuerySchema), controller.queryIsbnStream);
router.get('/search/isbn/:isbn', requireAuth, controller.searchIsbn);
router.get('/rejected-books', requireAuth, controller.getRejectedBooks);
router.patch('/scans/:scan_id/flag', requireAuth, controller.flagScan);
router.post('/scans/:scan_id/tag', requireAuth, validateRequest(schemas.tagScanSchema), controller.tagScan);
router.get('/boxes/:box_id/scans', requireAuth, controller.getBoxScans);

export default router;
