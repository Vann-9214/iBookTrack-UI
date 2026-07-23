/**
 * validators/auth.js
 *
 * Defines Zod validation schemas for all authentication and profile endpoints.
 */

import { z } from 'zod';

export const registerSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.').max(100, 'Name is too long.'),
    email: z.string().trim().toLowerCase().email('Invalid email address.'),
    password: z.string().trim().min(8, 'Password must be at least 8 characters.')
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
    newPassword: z.string().trim().min(8, 'New password must be at least 8 characters.')
  })
};

export const profileSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.').max(100, 'Name is too long.'),
    email: z.string().trim().toLowerCase().email('Invalid email address.')
  })
};
