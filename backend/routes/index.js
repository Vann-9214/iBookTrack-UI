/**
 * ============================================================
 * ROUTES INDEX - Central reference for all API routes
 * ============================================================
 * This file serves as a quick reference/documentation for all
 * available routes in the backend. Copy route patterns from
 * here when you need them in the future.
 * ============================================================
 */

import authRoutes from './auth.js'

// ============================================================
// AUTHENTICATION ROUTES (./auth.js)
// ============================================================
// Base path: /api/auth
//
// POST   /api/auth/register      - Register new user
//        Body: { name, email, password }
//        Response: { message, user: { id, email, name } }
//
// POST   /api/auth/login         - Login user
//        Body: { email, password }
//        Response: { message, user, access_token, refresh_token, expires_at }
//
// POST   /api/auth/logout        - Logout user
//        Headers: Authorization: Bearer <token>
//        Response: { message }
//
// ============================================================

// ============================================================
// FUTURE ROUTES - Add new route references below
// ============================================================
//
// Example structure for future routes:
//
// POST   /api/posts              - Create new post
// GET    /api/posts              - Get all posts
// GET    /api/posts/:id          - Get single post
// PUT    /api/posts/:id          - Update post
// DELETE /api/posts/:id          - Delete post
//
// ============================================================

/**
 * Export all route modules
 * Import this in server.js to register routes
 */
export default {
  auth: authRoutes,
  // Add future routes here:
  // posts: postsRoutes,
  // users: usersRoutes,
  // etc.
}
