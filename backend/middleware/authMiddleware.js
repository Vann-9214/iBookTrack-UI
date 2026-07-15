/**
 * middleware/authMiddleware.js
 *
 * Express middleware that protects routes by verifying a Supabase JWT.
 *
 * Usage:
 *   import { requireAuth } from '../middleware/authMiddleware.js'
 *   router.get('/protected', requireAuth, handler)
 *
 * How it works:
 *   1. Reads the Authorization header (must be "Bearer <token>").
 *   2. Passes the token to Supabase to verify its signature and expiry.
 *   3. If valid, attaches the decoded user object to req.user and calls next().
 *   4. If invalid or missing, responds with 401 Unauthorized immediately.
 *
 * After this middleware runs, route handlers can safely access:
 *   req.user.id            — Supabase user UUID
 *   req.user.email         — User's email address
 *   req.user.user_metadata — Custom metadata (name, full_name, etc.)
 */

import { supabase } from '../config/supabase.js'

/**
 * requireAuth — attach to any route that should only be accessible to
 * logged-in users.
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization

  // Accept token from Authorization header OR ?token= query param OR access_token cookie
  let token = null
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  } else if (req.query.token) {
    token = req.query.token
  } else if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid authorization header.' })
  }

  // Ask Supabase to validate the token and return the user record
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    // Try checking if it's a custom Innodata JWT
    try {
      const jwt = (await import('jsonwebtoken')).default
      const secret = process.env.JWT_SECRET
      if (!secret) throw new Error('Missing JWT_SECRET in environment variables')
      
      const decoded = jwt.verify(token, secret)
      req.user = decoded
      return next()
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid or expired token.' })
    }
  }

  // Attach the verified user to the request so downstream handlers can use it
  req.user = user
  next()
}
