/**
 * ============================================================
 * iBookTrack Backend - Routes Index & Reference
 * ============================================================
 * This file serves as a central reference for all API routes.
 * Use this as documentation to quickly find and copy route
 * patterns when building new features.
 * ============================================================
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { testConnection } from './utils/testConnection.js'
import authRoutes from './routes/auth.js'

// Load environment variables
dotenv.config({ path: '../.env' })

const app = express()
const PORT = process.env.PORT || 5000

// ============================================================
// MIDDLEWARE CONFIGURATION
// ============================================================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

// ============================================================
// ROUTES REGISTRY
// ============================================================

// ── Root Route ──────────────────────────────────────────────
// GET  /                          - Welcome message
app.get('/', (_, res) => {
  res.send('Hi iBookTrack 👋 - Backend is running!')
})

// ── Authentication Routes ───────────────────────────────────
// Base path: /api/auth
// Import: ./routes/auth.js
//
// POST   /api/auth/register       - Register new user
//        Body: { name, email, password }
//        Response: { message, user: { id, email, name } }
//        Rate limit: 5 requests per hour
//
// POST   /api/auth/login          - Login user
//        Body: { email, password }
//        Response: { message, user, access_token, refresh_token, expires_at }
//        Rate limit: 10 requests per 15 minutes
//
// POST   /api/auth/logout         - Logout user
//        Headers: Authorization: Bearer <token>
//        Response: { message }
//
app.use('/api/auth', authRoutes)

// ── Health Check ────────────────────────────────────────────
// GET  /api/health                - Server health status
//      Response: { status: 'ok', timestamp: ISO8601 }
app.get('/api/health', (_, res) => res.json({ 
  status: 'ok', 
  timestamp: new Date().toISOString() 
}))

// ============================================================
// FUTURE ROUTES - Add new route references below
// ============================================================
//
// Example structure for future routes:
//
// ── Book Routes ─────────────────────────────────────────────
// Base path: /api/books
// Import: ./routes/books.js
//
// GET    /api/books               - Get all books
// POST   /api/books               - Create new book
// GET    /api/books/:id           - Get single book
// PUT    /api/books/:id           - Update book
// DELETE /api/books/:id           - Delete book
//
// app.use('/api/books', bookRoutes)
//
// ── Inventory Routes ────────────────────────────────────────
// Base path: /api/inventory
// Import: ./routes/inventory.js
//
// GET    /api/inventory           - Get inventory items
// POST   /api/inventory           - Add inventory item
// PATCH  /api/inventory/:id       - Update inventory item
//
// app.use('/api/inventory', inventoryRoutes)
//
// ── Transmission Routes ─────────────────────────────────────
// Base path: /api/transmission
// Import: ./routes/transmission.js
//
// GET    /api/transmission        - Get transmission queue
// POST   /api/transmission        - Create transmission
// GET    /api/transmission/:id    - Get transmission status
//
// app.use('/api/transmission', transmissionRoutes)
//
// ============================================================

// ============================================================
// SERVER STARTUP
// ============================================================
app.listen(PORT, async () => {
  console.log(`\n🚀 Backend running at http://localhost:${PORT}`)
  await testConnection()
})

// ============================================================
// ROUTE SUMMARY (Quick Reference)
// ============================================================
// Total Routes: 4
//
// Public Routes:
//   GET  /                        - Welcome message
//   GET  /api/health              - Health check
//   POST /api/auth/register       - User registration
//   POST /api/auth/login          - User login
//
// Protected Routes (Require Authentication):
//   POST /api/auth/logout         - User logout
//
// ============================================================
