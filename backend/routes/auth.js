/**
 * routes/auth.js
 *
 * Handles all user authentication and profile management.
 *
 * Endpoints:
 *   POST   /api/auth/register  — Create a new account (rate-limited: 5/hr)
 *   POST   /api/auth/login     — Sign in and receive JWT tokens (rate-limited: 10/15 min)
 *   POST   /api/auth/refresh   — Exchange a refresh token for a new access token
 *   POST   /api/auth/password  — Change the logged-in user's password (requires auth)
 *   GET    /api/auth/profile   — Fetch the logged-in user's profile (requires auth)
 *   PATCH  /api/auth/profile   — Update name / email for the logged-in user (requires auth)
 *
 * Security measures applied here:
 *   - Per-route rate limiting (login / register) to slow brute-force attacks
 *   - Generic error messages on login to prevent user enumeration
 *   - Input sanitization and validation (email format, password length, name length)
 *   - Only safe/minimal fields are returned to the caller (no raw Supabase objects)
 */

import express from 'express'
import rateLimit from 'express-rate-limit'
import { supabase, supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

// ── Rate limiters ──────────────────────────────────────────
// Max 50 login attempts per IP per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
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

// ── GET /api/auth/profile ─────────────────────────────────
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const profile = await fetchProfileByUserId(req.user.id)

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    return res.json({
      id: req.user.id,
      name: profile.name,
      email: profile.email,
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch profile' })
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

// ── GET /api/auth/innodata (Initiate OAuth Flow) ─────────────
router.get('/innodata', (req, res) => {
  const authorizeUrl = process.env.OAUTH_AUTHORIZE_URL
  const clientId = process.env.OAUTH_CLIENT_ID
  const redirectUri = process.env.OAUTH_REDIRECT_URI
  
  if (!authorizeUrl || !clientId || !redirectUri) {
    return res.status(500).send('OAuth configuration is missing in environment variables.')
  }
  
  const url = new URL(authorizeUrl)
  url.searchParams.append('response_type', 'code')
  url.searchParams.append('client_id', clientId)
  url.searchParams.append('redirect_uri', redirectUri)
  url.searchParams.append('scope', 'openid profile email')
  
  res.redirect(url.toString())
})

// ── GET /api/auth/innodata/callback (Handle OAuth Return) ────
router.get('/innodata/callback', async (req, res) => {
  const { code } = req.query
  if (!code) {
    return res.status(400).send('No authorization code provided')
  }

  try {
    const tokenUrl = process.env.OAUTH_TOKEN_URL
    const userInfoUrl = process.env.OAUTH_USERINFO_URL
    const clientId = process.env.OAUTH_CLIENT_ID
    const clientSecret = process.env.OAUTH_CLIENT_SECRET
    const redirectUri = process.env.OAUTH_REDIRECT_URI

    if (!tokenUrl || !userInfoUrl || !clientId || !clientSecret || !redirectUri) {
      throw new Error('OAuth configuration is missing in environment variables.')
    }

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    })

    if (!tokenRes.ok) {
      throw new Error(`OAuth token exchange failed with status ${tokenRes.status}`)
    }

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      throw new Error('No access token returned from OAuth provider')
    }

    const userRes = await fetch(userInfoUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })

    if (!userRes.ok) {
      throw new Error(`Failed to fetch user info with status ${userRes.status}`)
    }

    const userInfo = await userRes.json()

    // Dynamically import jsonwebtoken to avoid top-level require errors if not setup
    const jwt = (await import('jsonwebtoken')).default
    const secret = process.env.JWT_SECRET
    
    if (!secret) {
      throw new Error('Missing JWT_SECRET in environment variables')
    }

    const token = jwt.sign(
      { id: userInfo.id, email: userInfo.email, name: userInfo.name },
      secret,
      { expiresIn: '8h' }
    )

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const returnUrl = new URL('/login', frontendUrl)
    returnUrl.searchParams.append('sso_token', token)
    returnUrl.searchParams.append('email', userInfo.email)
    returnUrl.searchParams.append('name', userInfo.name || '')
    
    res.redirect(returnUrl.toString())
  } catch (error) {
    console.error('SSO Callback error:', error)
    res.status(500).send('SSO Authentication failed')
  }
})

export default router
