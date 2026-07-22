import { logger } from '../utils/logger.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import * as sessionsService from '../services/warehouse/sessions.js';
import * as scansService from '../services/warehouse/scans.js';
import * as searchService from '../services/warehouse/search.js';
import * as lotsService from '../services/warehouse/lots.js';
import * as boxesService from '../services/warehouse/boxes.js';

/**
 * controllers/warehouse.js
 *
 * Handles the HTTP request/response logic for warehouse operations.
 * All heavy business logic is delegated to the micro-services in services/warehouse/.
 */

// Start a new warehouse receiving session
export const startSession = async (req, res) => {
  try {
    const result = await sessionsService.startSessionService(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(error.payload);
    }
    logger.error('Start warehouse session error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Scan a book in the warehouse
export const scanBook = async (req, res) => {
  return await scansService.scanBookService(req, res);
}

// Complete a warehouse session
export const completeSession = async (req, res) => {
  return await sessionsService.completeSessionService(req, res);
}

// Bulk save a complete session in one request
export const bulkSaveSession = async (req, res) => {
  return await sessionsService.bulkSaveSessionService(req, res);
}

// Resume an existing session for a box (used by Inventory)
export const resumeSession = async (req, res) => {
  return await sessionsService.resumeSessionService(req, res);
}

// Cancel an existing session for a box (used by Inventory to reset verification)
export const cancelSession = async (req, res) => {
  return await sessionsService.cancelSessionService(req, res);
}

// Delete/cancel a warehouse session
export const deleteSession = async (req, res) => {
  return await sessionsService.deleteSessionService(req, res);
}

// Get all warehouse sessions
export const listSessions = async (req, res) => {
  return await sessionsService.listSessionsService(req, res);
}

// Fetch historical lots from database (instead of live from iLMS)
// Used to populate the Lot dropdown on the session start screen
export const getIlmsLots = async (req, res) => {
  return await lotsService.getIlmsLotsService(req, res);
}

// Check whether a box_number already exists within a given lot (and brand/type).
// Used by the warehouse UI to prevent starting a session with a duplicate box
// number in the same lot.
export const checkBoxExists = async (req, res) => {
  return await boxesService.checkBoxExistsService(req, res);
}

// ── SSE: persistent ISBN lookup stream ───────────────────────────────────────
// Opens one long-lived connection. Client sends ?isbn=<value> to trigger a
// lookup; the server pushes back a single SSE event with the result.
// Connection stays open indefinitely until the client disconnects.
export const isbnStream = async (req, res) => {
  return await searchService.isbnStreamService(req, res);
}



// ISBN lookup triggered over SSE — client POSTs here with { isbn } body
// and the SSE connection receives the result as an event
export const queryIsbnStream = async (req, res) => {
  return await searchService.queryIsbnStreamService(req, res);
}

// Search book by ISBN to find which box it's in
export const searchIsbn = async (req, res) => {
  return await searchService.searchIsbnService(req, res);
}

// Get non-processable (flagged) books
export const getRejectedBooks = async (req, res) => {
  return await boxesService.getRejectedBooksService(req, res);
}

// Update an existing scan to non_processable (re-flag from scan log)
export const flagScan = async (req, res) => {
  return await scansService.flagScanService(req, res);
}

// Tag an ISBN scan as 'reject' or 'non_processable' with mandatory remarks
// POST /api/warehouse/scans/:scan_id/tag
// Body: { status: 'reject' | 'non_processable', remarks: string }
export const tagScan = async (req, res) => {
  return await scansService.tagScanService(req, res);
}

// Get warehouse scans for a specific box (for inventory comparison)
export const getBoxScans = async (req, res) => {
  return await scansService.getBoxScansService(req, res);
}