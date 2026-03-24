import express from 'express'
import rateLimit from 'express-rate-limit'
import { supabase, supabaseAdmin } from '../config/supabase.js'

const router = express.Router()

// ── Rate limiters ──────────────────────────────────────────
// Max 10 login attempts per IP per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
})

// Max 5 register attempts per IP per hour
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
})

// ── Helpers ────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function sanitize(str) {
  return typeof str === 'string' ? str.trim() : ''
}

// ── POST /api/auth/register ────────────────────────────────
router.post('/register', registerLimiter, async (req, res) => {
  const name     = sanitize(req.body.name)
  const email    = sanitize(req.body.email).toLowerCase()
  const password = sanitize(req.body.password)

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' })
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }
  if (name.length > 100) {
    return res.status(400).json({ error: 'Name is too long.' })
  }

  // Supabase hashes the password with bcrypt internally — we never store it
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { 
      data: { name },
      emailRedirectTo: undefined // Skip email confirmation in development
    },
  })

  if (error) {
    console.error('Supabase signup error:', error)
    return res.status(400).json({ error: error.message })
  }

  // Don't leak internal user object — return only safe fields
  return res.status(201).json({
    message: 'Registration successful. Check your email to confirm your account.',
    user: {
      id:    data.user?.id,
      email: data.user?.email,
      name:  data.user?.user_metadata?.name,
    },
  })
})

// ── POST /api/auth/login ───────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  const email    = sanitize(req.body.email).toLowerCase()
  const password = sanitize(req.body.password)

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }
  if (!EMAIL_REGEX.test(email)) {
    // Generic message — don't confirm whether email exists
    return res.status(400).json({ error: 'Invalid credentials.' })
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  // Use same generic error for wrong email OR wrong password (prevents user enumeration)
  if (error) return res.status(401).json({ error: 'Invalid credentials.' })

  return res.json({
    message: 'Login successful.',
    user: {
      id:    data.user?.id,
      email: data.user?.email,
      name:  data.user?.user_metadata?.name,
    },
    access_token:  data.session?.access_token,
    refresh_token: data.session?.refresh_token,
    expires_at:    data.session?.expires_at,
  })
})

// ── POST /api/auth/logout ──────────────────────────────────
router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ') && supabaseAdmin) {
    const token = authHeader.split(' ')[1]
    const { data } = await supabaseAdmin.auth.getUser(token)
    if (data?.user) {
      await supabaseAdmin.auth.admin.signOut(data.user.id)
    }
  }
  return res.json({ message: 'Logged out successfully.' })
})

// ── POST /api/auth/refresh ─────────────────────────────────
router.post('/refresh', async (req, res) => {
  const refreshToken = req.body.refresh_token

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' })
  }

  try {
    // Call Supabase auth endpoint to refresh the token
    const supabaseAuthUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const response = await fetch(`${supabaseAuthUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiKey': supabaseAnonKey,
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' })
    }

    return res.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return res.status(401).json({ error: 'Failed to refresh token.' })
  }
})

export default router
