import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { testConnection } from './utils/testConnection.js'
import authRoutes from './routes/auth.js'

dotenv.config({ path: '../.env' })

const app = express()
const PORT = process.env.PORT || 5000

// Allow multiple origins for development (localhost + network IP)
const allowedOrigins = [
  'http://localhost:3000',
  'http://172.20.113.200:3000',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
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

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.listen(PORT, async () => {
  console.log(`\n🚀 Backend running at http://localhost:${PORT}`)
  await testConnection()
})
