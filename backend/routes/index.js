/**
 * ============================================================
 * ROUTES INDEX - Central reference for all API routes
 * ============================================================
 * This file serves as a quick reference/documentation for all
 * available routes in the backend. Copy route patterns from
 * here when you need them in the future.
 * ============================================================
 */

import authRoutes from './auth.js'
import boxesRoutes from './boxes.js'
import booksRoutes from './books.js'
import lotsRoutes from './lots.js'
import dashboardRoutes from './dashboard.js'

// ============================================================
// AUTHENTICATION ROUTES (./auth.js)
// ============================================================
// Base path: /api/auth
//
// POST   /api/auth/register      - Register new user
//        Body: { name, email, password }
//        Response: { message, user: { id, email, name } }
//
// POST   /api/auth/login         - Login user
//        Body: { email, password }
//        Response: { message, user, access_token, refresh_token, expires_at }
//
// POST   /api/auth/logout        - Logout user
//        Headers: Authorization: Bearer <token>
//        Response: { message }
//
// ============================================================

// ============================================================
// BOXES ROUTES (./boxes.js)
// ============================================================
// Base path: /api/boxes
//
// GET    /api/boxes              - Get all boxes (filters: lot_id, current_stage, box_number)
// GET    /api/boxes/:id          - Get single box with all books
// GET    /api/boxes/lot/:lot_number - Get all boxes for a specific lot
// GET    /api/boxes/stats/pipeline - Get pipeline stage counts (filter: lot_number)
// POST   /api/boxes              - Create new box
//        Body: { box_number, lot_id, total_books?, current_stage? }
// PUT    /api/boxes/:id          - Update box (stage, counts)
//        Body: { current_stage?, books_received?, books_transmitted?, total_books? }
//
// ============================================================

// ============================================================
// BOOKS ROUTES (./books.js)
// ============================================================
// Base path: /api/books
//
// GET    /api/books              - Get all books (filters: box_id, isbn, status, is_unaccounted)
// GET    /api/books/isbn/:isbn   - Get book by ISBN
// POST   /api/books              - Create new book (manual or from client API)
//        Body: { isbn, barcode?, box_id?, title?, description?, project_name?, 
//                book_type?, publisher?, language?, page_count?, condition?,
//                date_purchased?, date_catalogued? }
// PUT    /api/books/:id          - Update book
// POST   /api/books/:id/transmit - Mark book as transmitted
// POST   /api/books/:id/unaccounted - Mark book as unaccounted
//        Body: { stage_detected?, notes? }
// POST   /api/books/scan         - Scan book by ISBN/barcode (Inventory Gate)
//        Body: { isbn?, barcode? }
// POST   /api/books/scan/:id/print - Mark scan slip as printed
//
// ============================================================

// ============================================================
// LOTS ROUTES (./lots.js)
// ============================================================
// Base path: /api/lots
//
// GET    /api/lots               - Get all lots (filters: status, shipment_id)
// GET    /api/lots/:lot_number   - Get single lot by lot number
// POST   /api/lots               - Create new lot
//        Body: { lot_number, shipment_id?, total_boxes?, status? }
// PUT    /api/lots/:id           - Update lot
//
// ============================================================

// ============================================================
// DASHBOARD ROUTES (./dashboard.js)
// ============================================================
// Base path: /api/dashboard
//
// GET    /api/dashboard/stats    - Get dashboard statistics
//        Query: lot_number?, lot_range_start?, lot_range_end?
//        Response: { stats: { totalBoxes, totalBooks, transmittedBooks, 
//                             unaccountedBooks, activeLots, transmissionRate } }
// GET    /api/dashboard/transmission-queue - Get transmission queue (last 10)
// GET    /api/dashboard/unaccounted-books - Get unaccounted books (last 10)
// GET    /api/dashboard/pipeline-stats - Get pipeline stage counts
//        Query: lot_number?
// GET    /api/dashboard/scan-history - Get scan history
//        Query: limit? (default: 20)
//
// ============================================================

// ============================================================
// NOTES FOR CLIENT API INTEGRATION
// ============================================================
// When client provides book database API:
// 1. Update POST /api/books to fetch from client API
// 2. Create sync job for periodic updates
// 3. If ISBN-to-barcode API available, integrate in /api/books/scan
// 4. All routes are ready to work with external data
//
// ============================================================

/**
 * Export all route modules
 * Import this in server.js to register routes
 */
export default {
  auth: authRoutes,
  boxes: boxesRoutes,
  books: booksRoutes,
  lots: lotsRoutes,
  dashboard: dashboardRoutes
}
