/**
 * routes/books.js
 *
 * Manages the books (ISBNs) tracked inside iBookTrack.
 *
 * Endpoints:
 *   GET    /api/books/                      - Get books (optionally filtered by box_id)
 *   GET    /api/books/ilms/search/:isbn     - Search the iLMS catalog for a book by ISBN
 *   POST   /api/books/:id/flag              - Add a QC flag to a scanned book
 *   DELETE /api/books/:id/flag              - Remove a QC flag from a book
 *
 * All routes require authentication (requireAuth middleware).
 */

import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import * as schemas from '../validators/books.js';
import * as controller from '../controllers/books.js';

const router = express.Router();

router.get('/', requireAuth, validateRequest(schemas.getBooksSchema), controller.getBooks);
router.get('/ilms/search/:isbn', requireAuth, validateRequest(schemas.searchIlmsBookSchema), controller.searchIlmsBook);
router.post('/:id/flag', requireAuth, validateRequest(schemas.flagBookSchema), controller.flagBook);
router.delete('/:id/flag', requireAuth, validateRequest(schemas.removeFlagSchema), controller.removeFlag);

export default router;
