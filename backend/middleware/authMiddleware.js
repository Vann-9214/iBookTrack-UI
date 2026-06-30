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

  // Header must exist and start with "Bearer "
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header.' })
  }

  // Extract the raw JWT
  const token = authHeader.split(' ')[1]

  // Ask Supabase to validate the token and return the user record
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }

  // Attach the verified user to the request so downstream handlers can use it
  req.user = user
  next()
}
