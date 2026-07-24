/**
 * middleware/authMiddleware.js
 *
 * Express middleware that protects routes by verifying our custom JWT.
 *
 * Usage:
 *   import { requireAuth } from '../middleware/authMiddleware.js'
 *   router.get('/protected', requireAuth, handler)
 */
import jwt from 'jsonwebtoken';

export const OPERATIONAL_ROLES = ['supervisor', 'warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'storage'];

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Accept token from Authorization header OR access_token cookie
  let token = null;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid authorization token.' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('Missing JWT_SECRET in environment variables');
    
    // Verify our custom JWT and specify algorithm to prevent Algorithm Confusion attacks
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

    // Enforce token revocation: the token's version (tv) must match the user's
    // current token_version in the DB. A password change / forced logout bumps
    // the DB value, immediately invalidating older tokens.
    const { db } = await import('../config/db.js');
    try {
      const { rows } = await db.query('SELECT token_version FROM users WHERE id = $1', [decoded.id]);
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
      }
      const currentVersion = rows[0].token_version ?? 0;
      if ((decoded.tv ?? 0) !== currentVersion) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
    } catch (dbErr) {
      // If migration 010 has not been applied yet the column won't exist
      // (Postgres code 42703). Fail open for this specific config gap so the
      // app is not bricked; all other DB errors are treated as auth failures.
      if (dbErr?.code !== '42703') {
        return res.status(401).json({ error: 'Invalid or expired token.' });
      }
    }

    // Attach the verified user to the request so downstream handlers can use it
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

/**
 * Middleware to restrict access to specific roles.
 * Must be used AFTER requireAuth so req.user exists.
 * Re-validates role from the database to prevent stale JWT claims.
 */
export const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(403).json({ error: 'Access denied: No role assigned.' });
    }

    try {
      // Re-fetch the user's current role from the DB to prevent stale JWT claims
      const { db } = await import('../config/db.js');
      const { rows } = await db.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
      const currentRole = rows[0]?.role;

      if (!currentRole) {
        return res.status(403).json({ error: 'Access denied: No role assigned.' });
      }

      // Update req.user.role with the live value so downstream handlers use the correct role
      req.user.role = currentRole;

      if (currentRole === 'supervisor') {
        return next();
      }
      if (!allowedRoles.includes(currentRole)) {
        return res.status(403).json({ error: 'Access denied: Insufficient permissions.' });
      }
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Authorization check failed.' });
    }
  };
};
