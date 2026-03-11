import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { testConnection } from './utils/testConnection.js'
import authRoutes from './routes/auth.js'

dotenv.config({ path: '../.env' })

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
