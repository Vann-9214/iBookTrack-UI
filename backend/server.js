import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { testConnection } from './utils/testConnection.js'
import authRoutes from './routes/auth.js'
import boxesRoutes from './routes/boxes.js'
import booksRoutes from './routes/books.js'
import lotsRoutes from './routes/lots.js'
import dashboardRoutes from './routes/dashboard.js'
import warehouseRoutes from './routes/warehouse.js'
import reportsRoutes from './routes/reports.js'
import scanningRoutes from './routes/scanning.js'

dotenv.config({ path: '../.env' })

const app = express()
const PORT = process.env.PORT || 5000

// Allow explicit origins from env (FRONTEND_URL, FRONTEND_URLS="a,b,c")
const explicitAllowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || '').split(',').map((url) => url.trim())
].filter(Boolean)

const isPrivateHost = (hostname) => {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  if (/^10\./.test(hostname)) return true
  if (/^192\.168\./.test(hostname)) return true

  const match172 = hostname.match(/^172\.(\d{1,3})\./)
  if (!match172) return false

  const secondOctet = Number(match172[1])
  return secondOctet >= 16 && secondOctet <= 31
}

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
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)

    if (explicitAllowedOrigins.includes(origin) || isDevBrowserOriginAllowed(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json())

// Root route
app.get('/', (_, res) => {
  res.send('Hi iBookTrack 👋 - Backend is running!')
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/boxes', boxesRoutes)
app.use('/api/books', booksRoutes)
app.use('/api/lots', lotsRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/warehouse', warehouseRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/scanning', scanningRoutes)

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.listen(PORT, async () => {
  console.log(`\n🚀 Backend running at http://localhost:${PORT}`)
  await testConnection()
})
