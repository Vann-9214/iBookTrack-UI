import express from 'express'
import rateLimit from 'express-rate-limit'
import { supabase, supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/authMiddleware.js'

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

async function fetchProfileByUserId(userId) {
  if (!supabaseAdmin || !userId) return null

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('name, email')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data
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

  const profile = await fetchProfileByUserId(data.user?.id)

  // Don't leak internal user object — return only safe fields
  return res.status(201).json({
    message: 'Registration successful. Check your email to confirm your account.',
    user: {
      id:    data.user?.id,
      email: profile?.email || data.user?.email,
      name:  profile?.name || data.user?.user_metadata?.name,
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

  const profile = await fetchProfileByUserId(data.user?.id)

  return res.json({
    message: 'Login successful.',
    user: {
      id:    data.user?.id,
      email: profile?.email || data.user?.email,
      name:  profile?.name || data.user?.user_metadata?.name,
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

// ── POST /api/auth/password ───────────────────────────────
router.post('/password', requireAuth, async (req, res) => {
  const currentPassword = sanitize(req.body.currentPassword)
  const newPassword = sanitize(req.body.newPassword)

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' })
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' })
  }

  try {
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword,
    })

    if (verifyError) {
      return res.status(400).json({ error: 'Current password is incorrect.' })
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Password update is unavailable.' })
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
      password: newPassword,
    })

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    return res.json({ message: 'Password updated successfully.' })
  } catch (error) {
    console.error('Password update error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// ── PATCH /api/auth/profile ────────────────────────────────
router.patch('/profile', requireAuth, async (req, res) => {
  const name = sanitize(req.body.name)
  const email = sanitize(req.body.email).toLowerCase()

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' })
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' })
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Profile update is unavailable.' })
  }

  try {
    const previousEmail = req.user.email
    const previousName = req.user.user_metadata?.name || req.user.user_metadata?.full_name || ''

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
      email,
      user_metadata: {
        name,
        full_name: name,
      },
    })

    if (authError) {
      return res.status(500).json({ error: authError.message })
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ name, email })
      .eq('id', req.user.id)
      .select('name, email')
      .single()

    if (error) {
      await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
        email: previousEmail,
        user_metadata: {
          name: previousName,
          full_name: previousName,
        },
      })
      return res.status(500).json({ error: error.message })
    }

    if (!data) {
      return res.status(404).json({ error: 'Profile not found.' })
    }

    return res.json({
      message: 'Profile updated successfully.',
      user: data,
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return res.status(500).json({ error: error.message })
  }
})

export default router
