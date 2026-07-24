/**
 * validators/auth.js
 *
 * Defines Zod validation schemas for all authentication and profile endpoints.
 */

import { z } from 'zod';

// Single source of truth for password strength so that registration and
// password-change enforce identical complexity requirements.
const strongPassword = z.string().trim()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password is too long.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

export const registerSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.').max(100, 'Name is too long.'),
    email: z.string().trim().toLowerCase().email('Invalid email address.'),
    password: strongPassword
  })
};

export const loginSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().min(1, 'Email is required.'),
    password: z.string().trim().min(1, 'Password is required.')
  })
};

export const refreshSchema = {
  body: z.object({
    refresh_token: z.string().optional()
  })
};

export const passwordSchema = {
  body: z.object({
    currentPassword: z.string().trim().min(1, 'Current password is required.'),
    newPassword: strongPassword
  })
};

export const profileSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.').max(100, 'Name is too long.'),
    email: z.string().trim().toLowerCase().email('Invalid email address.')
  })
};

// DEV-ONLY simple reset: verify the email exists, then set a new password.
// There is no ownership proof here, so the service refuses to run in production.
export const resetPasswordSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address.'),
    newPassword: strongPassword
  })
};
