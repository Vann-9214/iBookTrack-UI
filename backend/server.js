/**
 * server.js
 *
 * Entry point for the iBookTrack Express backend.
 *
 * Responsibilities:
 *   - Configure CORS so only the frontend origin(s) and private-network
 *     addresses (localhost / 192.168.x.x / 10.x.x.x / 172.16–31.x.x) are allowed.
 *   - Apply a global rate limiter to every route (prevents abuse / DoS).
 *   - Mount all API route modules under /api/*
 *   - Start the HTTP server and kick off the Simflex background poller.
 *
 * Environment variables used here:
 *   PORT           — TCP port the server listens on (default 5000)
 *   FRONTEND_URL   — Primary frontend origin, e.g. http://localhost:3000
 *   FRONTEND_URLS  — Comma-separated list of additional allowed origins
 */

import dotenv from 'dotenv'
// Load .env before any other imports so all modules see the env vars
dotenv.config({ path: '.env' })

import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { testConnection } from './utils/testConnection.js'
import authRoutes      from './routes/auth.js'
import boxesRoutes     from './routes/boxes.js'
import booksRoutes     from './routes/books.js'
import lotsRoutes      from './routes/lots.js'
import dashboardRoutes from './routes/dashboard.js'
import warehouseRoutes from './routes/warehouse.js'
import reportsRoutes   from './routes/reports.js'
import scanningRoutes  from './routes/scanning.js'
import storageRoutes   from './routes/storage.js'
import { startSimflexPoller } from './services/simflex-poller.js'

const app  = express()
const PORT = process.env.PORT || 5000

// ── Global process error handlers ─────────────────────────────────────────────
// Log fatal errors before the process exits. In Node.js 24 unhandled rejections
// throw by default and crash the process; capturing them here helps identify the
// route/poller that caused the backend to stop, so we can fix the root cause.
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled promise rejection:', reason)
  // Allow the process to continue briefly so the log is flushed, then exit.
  setTimeout(() => process.exit(1), 250)
})

// ── CORS ──────────────────────────────────────────────────────────────────────
// Build the list of explicitly allowed origins from env vars.
// FRONTEND_URL  → single origin (e.g. the production URL)
// FRONTEND_URLS → comma-separated list for multi-domain setups
const explicitAllowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || '').split(',').map((url) => url.trim())
].filter(Boolean)

/**
 * Returns true if the hostname is a private/LAN address.
 * Used to allow developer machines without requiring every IP to be listed in .env.
 */
const isPrivateHost = (hostname) => {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  if (/^10\./.test(hostname)) return true
  if (/^192\.168\./.test(hostname)) return true
  const match172 = hostname.match(/^172\.(\d{1,3})\./)
  if (!match172) return false
  const secondOctet = Number(match172[1])
  return secondOctet >= 16 && secondOctet <= 31
}

/**
 * Returns true if the origin is an http:// request from a private/LAN host.
 * This covers dev machines accessing the backend without needing an .env entry.
 */
const isDevBrowserOriginAllowed = (origin) => {
  try {
    const url = new URL(origin)
    return url.protocol === 'http:' && isPrivateHost(url.hostname)
  } catch {
    return false
  }
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin header (e.g. curl, Postman, server-to-server)
    if (!origin) return callback(null, true)

    if (explicitAllowedOrigins.includes(origin) || isDevBrowserOriginAllowed(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true, // Allow cookies / Authorization headers
}))

// ── Global rate limiter ───────────────────────────────────────────────────────
// Applies to every route. Limits each IP to 200 requests per 15 minutes.
// Individual sensitive routes (login, register) have tighter limits in auth.js.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 200,                  // max requests per IP per window
  standardHeaders: true,     // Return limit info in RateLimit-* headers
  legacyHeaders: false,      // Do not send X-RateLimit-* headers
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
})
app.use(globalLimiter)

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json())

// ── Root health-check ─────────────────────────────────────────────────────────
app.get('/', (_, res) => {
  res.send('Hi iBookTrack 👋 - Backend is running!')
})

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes)
app.use('/api/boxes',     boxesRoutes)
app.use('/api/books',     booksRoutes)
app.use('/api/lots',      lotsRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/warehouse', warehouseRoutes)
app.use('/api/reports',   reportsRoutes)
app.use('/api/scanning',  scanningRoutes)
app.use('/api/storage',   storageRoutes)

// Simple liveness probe — useful for uptime monitors and container health checks
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ── Start server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 Backend running at http://localhost:${PORT}`)
  // Verify Supabase connection on startup
  await testConnection()
  // Start the background job that auto-advances boxes through the Simflex pipeline
  startSimflexPoller()
})

// Drop idle HTTP connections after 2 minutes so the process can't accumulate
// hanging sockets if a frontend tab keeps a connection open.
server.timeout = 120 * 1000
server.keepAliveTimeout = 65 * 1000
server.headersTimeout = 70 * 1000
