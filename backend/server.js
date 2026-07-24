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
 *   - Start the HTTP server and kick off the Scan Manager background poller.
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
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { testConnection } from './utils/testConnection.js'
import authRoutes      from './routes/auth/auth.js'
import boxesRoutes     from './routes/inventory/boxes.js'
import booksRoutes     from './routes/inventory/books.js'
import lotsRoutes      from './routes/inventory/lots.js'
import dashboardRoutes from './routes/analytics/dashboard.js'
import warehouseRoutes from './routes/warehouse/warehouse.js'
import reportsRoutes   from './routes/analytics/reports.js'
import scanningRoutes  from './routes/warehouse/scanning.js'
import storageRoutes   from './routes/inventory/storage.js'
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { logger } from './utils/logger.js'

const app  = express()

// Trust the reverse proxy (e.g. Nginx, AWS, Cloudflare) so that req.ip contains the real user's IP.
// Without this, the rate limiter would block all users sharing the proxy's IP, creating a DoS vulnerability.
app.set('trust proxy', 1)

// Apply Helmet security headers early in the middleware stack
app.use(helmet())

const PORT = process.env.PORT || 5000

// ── Global process error handlers ─────────────────────────────────────────────
// Log fatal errors before the process exits. In Node.js 24 unhandled rejections
// throw by default and crash the process; capturing them here helps identify the
// route/poller that caused the backend to stop, so we can fix the root cause.
process.on('uncaughtException', (err) => {
  logger.error('[FATAL] Uncaught exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[FATAL] Unhandled promise rejection:', reason)
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

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Returns true for same-machine origins (localhost / 127.0.0.1). These are the
 * developer's own computer, not a real cross-origin risk, so they are always
 * allowed in non-production without needing any flag.
 */
const isLocalhost = (hostname) => hostname === 'localhost' || hostname === '127.0.0.1'

/**
 * Returns true if the hostname is a broader private/LAN address (other devices
 * on the same network, e.g. a phone at 192.168.x.x).
 */
const isPrivateLanHost = (hostname) => {
  if (/^10\./.test(hostname)) return true
  if (/^192\.168\./.test(hostname)) return true
  const match172 = hostname.match(/^172\.(\d{1,3})\./)
  if (!match172) return false
  const secondOctet = Number(match172[1])
  return secondOctet >= 16 && secondOctet <= 31
}

// The BROADER LAN / dev-tunnel CORS bypass (other devices on the Wi-Fi,
// *.trycloudflare.com) is disabled by default and must be opted into with
// ALLOW_DEV_ORIGINS=true. localhost is not affected — it always works in dev.
// Nothing bypasses in production.
const devOriginsEnabled = process.env.ALLOW_DEV_ORIGINS === 'true' && !isProduction

/**
 * Returns true if the origin should be allowed via the development bypass.
 * - localhost/127.0.0.1: always allowed in non-production.
 * - LAN IPs + trycloudflare tunnels: only when ALLOW_DEV_ORIGINS=true.
 */
const isDevBrowserOriginAllowed = (origin) => {
  if (isProduction) return false
  try {
    const url = new URL(origin)
    // Same-machine dev is always fine (no flag required).
    if (url.protocol === 'http:' && isLocalhost(url.hostname)) return true
    if (!devOriginsEnabled) return false
    // Other LAN devices (opt-in).
    if (url.protocol === 'http:' && isPrivateLanHost(url.hostname)) return true
    // Cloudflare dev tunnels (opt-in).
    if (url.protocol === 'https:' && url.hostname.endsWith('.trycloudflare.com')) return true
    return false
  } catch {
    return false
  }
}

app.use(cors({
  origin: (origin, callback) => {
    if (explicitAllowedOrigins.includes(origin) || isDevBrowserOriginAllowed(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true, // Allow cookies / Authorization headers
  exposedHeaders: ['Retry-After', 'RateLimit-Reset'], // Expose rate limit headers to frontend
}))

// Make the effective CORS posture visible so misconfiguration is easy to spot.
logger.info(
  `CORS: explicit origins=[${explicitAllowedOrigins.join(', ') || 'none'}]; ` +
  `localhost=${isProduction ? 'blocked (prod)' : 'always allowed (dev)'}; ` +
  `LAN/tunnel bypass=${devOriginsEnabled ? 'ENABLED' : 'disabled'}`
)

// ── Global rate limiter ───────────────────────────────────────────────────────
// Applies to every route. Limits each IP to 500 requests per 15 minutes.
// Individual sensitive routes (login, register) have tighter limits in auth.js.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 3,                 // max requests per IP per window
  standardHeaders: true,     // Return limit info in RateLimit-* headers
  legacyHeaders: false,      // Do not send X-RateLimit-* headers
  handler: (req, res, next, options) => {
    const timeRemainingMs = req.rateLimit.resetTime.getTime() - Date.now();
    const minutesLeft = Math.ceil(timeRemainingMs / 60000);
    res.status(options.statusCode).json({ 
      error: `Too many requests. Please slow down and try again in ${minutesLeft} minute(s).` 
    });
  }
})
app.use(globalLimiter)

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '16kb' }))
app.use(cookieParser())

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

// ── Global Error Handling ─────────────────────────────────────────────────────
// Catch all unhandled routes and return a 404 JSON response
app.use(notFoundHandler)

// Catch any errors thrown by routes or middleware
app.use(globalErrorHandler)

// ── Start server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', async () => {
  logger.info(`🚀 Backend running at http://localhost:${PORT}`)
  // Verify DB connection on startup
  await testConnection()
})

// Drop idle HTTP connections after 2 minutes so the process can't accumulate
// hanging sockets if a frontend tab keeps a connection open.
server.timeout = 120 * 1000
server.keepAliveTimeout = 65 * 1000
server.headersTimeout = 70 * 1000
