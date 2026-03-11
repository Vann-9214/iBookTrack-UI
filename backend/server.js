import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { testConnection } from './utils/testConnection.js'
import authRoutes from './routes/auth.js'

dotenv.config({ path: '../.env' })

const app = express()
const PORT = process.env.PORT || 5000

const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const developmentOriginPatterns = [
  /^http:\/\/localhost:3000$/,
  /^http:\/\/localhost:3001$/,
  /^http:\/\/127\.0\.0\.1:3000$/,
  /^http:\/\/127\.0\.0\.1:3001$/,
  /^http:\/\/\d{1,3}(?:\.\d{1,3}){3}:3000$/,
  /^http:\/\/\d{1,3}(?:\.\d{1,3}){3}:3001$/,
]

function isAllowedOrigin(origin) {
  if (!origin) {
    return true
  }

  if (configuredOrigins.includes(origin)) {
    return true
  }

  if (process.env.NODE_ENV !== 'production') {
    return developmentOriginPatterns.some((pattern) => pattern.test(origin))
  }

  return false
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true)
      return
    }

    callback(new Error(`CORS blocked for origin: ${origin}`))
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

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.listen(PORT, async () => {
  console.log(`\n🚀 Backend running at http://localhost:${PORT}`)
  await testConnection()
})
