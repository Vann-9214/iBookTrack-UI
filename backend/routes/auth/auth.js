/**
 * routes/auth.js
 *
 * Routes for user authentication and profile management.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import * as schemas from '../../validators/auth/auth.js';
import * as controller from '../../controllers/auth/auth.js';

const router = express.Router();

// ── Rate limiters ──────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

// ── Routes ──────────────────────────────────────────────────
router.post('/register', registerLimiter, validateRequest(schemas.registerSchema), controller.register);
router.post('/login', loginLimiter, validateRequest(schemas.loginSchema), controller.login);
router.post('/logout', controller.logout);
router.post('/refresh', validateRequest(schemas.refreshSchema), controller.refresh);
router.post('/password', requireAuth, validateRequest(schemas.passwordSchema), controller.password);
router.get('/profile', requireAuth, controller.getProfile);
router.patch('/profile', requireAuth, validateRequest(schemas.profileSchema), controller.updateProfile);
router.get('/innodata', controller.innodata);
router.get('/innodata/callback', controller.innodataCallback);

export default router;
