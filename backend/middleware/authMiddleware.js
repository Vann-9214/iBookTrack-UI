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
