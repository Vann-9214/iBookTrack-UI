/**
 * services/auth/auth.js
 *
 * Core business logic for authentication using standard PostgreSQL, bcrypt, and jsonwebtoken.
 */

import * as authRepo from '../../repositories/auth/auth.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'lax' };

const getSessionDurationMs = () => {
  return 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
};

const generateToken = (user, expiresInSeconds) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, tv: user.token_version ?? 0 },
    process.env.JWT_SECRET,
    { expiresIn: expiresInSeconds } 
  );
};

export const registerService = async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    throw { status: 400, payload: { error: 'Name, email, and password are required.' } };
  }

  // Check if user already exists
  const existingUser = await authRepo.getUserByEmail(email);
  if (existingUser) {
    throw { status: 400, payload: { error: 'Registration failed. Please try a different email or contact support.' } };
  }

  // Hash password with bcrypt (salt rounds = 10)
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user in database
  const user = await authRepo.createUser(name, email, passwordHash, null);

  return {
    message: 'Registration successful. You can now log in.',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  };
};

export const loginService = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw { status: 400, payload: { error: 'Email and password are required.' } };
  }

  // Find user by email
  const user = await authRepo.getUserByEmail(email);
  if (!user) {
    throw { status: 401, payload: { error: 'Invalid credentials.' } };
  }

  // Verify password using bcrypt
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw { status: 401, payload: { error: 'Invalid credentials.' } };
  }

  // Generate JWT token
  const msDuration = getSessionDurationMs();
  const token = generateToken(user, Math.floor(msDuration / 1000));

  // Send token securely in HTTP-only cookie
  res.cookie('access_token', token, { ...cookieOpts, maxAge: msDuration });

  return {
    message: 'Login successful.',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  };
};

export const logoutService = async (req, res) => {
  // Browsers only drop a cookie when the clearing instruction carries the same
  // attributes it was set with, so the session cookie is removed using the exact
  // options from res.cookie(). Without this the access_token could survive
  // logout in the browser jar.
  res.clearCookie('access_token', cookieOpts);
  res.clearCookie('refresh_token', cookieOpts); // Clear in case legacy token exists
  return { message: 'Logged out successfully.' };
};

export const refreshService = async (req, res) => {
  // In a full implementation, you would verify a refresh token here.
  // For now, we use a 7-day access token, so refresh just verifies the current token
  // and issues a new one if it's still valid.
  const token = req.cookies?.access_token;
  if (!token) throw { status: 401, payload: { error: 'Not authenticated.' } };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await authRepo.getUserById(decoded.id);
    if (!user) throw new Error();

    // Reject a refresh attempt from a token that has since been revoked
    // (token_version bumped by a password change or forced logout).
    if ((decoded.tv ?? 0) !== (user.token_version ?? 0)) throw new Error('token revoked');

    const msDuration = getSessionDurationMs();
    const newToken = generateToken(user, Math.floor(msDuration / 1000));
    res.cookie('access_token', newToken, { ...cookieOpts, maxAge: msDuration });

    return { message: 'Session refreshed.' };
  } catch (err) {
    // Same attribute-matching requirement as logout: an unusable token must
    // actually leave the browser instead of lingering as a stale cookie.
    res.clearCookie('access_token', cookieOpts);
    throw { status: 401, payload: { error: 'Session expired. Please log in again.' } };
  }
};

export const passwordService = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await authRepo.getUserById(req.user.id);
  if (!user) throw { status: 404, payload: { error: 'User not found.' } };

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) throw { status: 400, payload: { error: 'Current password is incorrect.' } };

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await authRepo.updatePassword(req.user.id, newPasswordHash);

  // Invalidate all tokens issued before this change, then reissue a fresh
  // cookie so the current device stays logged in while other sessions die.
  const newVersion = await authRepo.incrementTokenVersion(req.user.id);
  const msDuration = getSessionDurationMs();
  const refreshedToken = generateToken(
    { ...user, role: user.role, token_version: newVersion },
    Math.floor(msDuration / 1000)
  );
  res.cookie('access_token', refreshedToken, { ...cookieOpts, maxAge: msDuration });

  return { message: 'Password updated successfully.' };
};

export const getProfileService = async (req, res) => {
  const profile = await authRepo.getUserById(req.user.id);
  if (!profile) throw { status: 404, payload: { error: 'Profile not found' } };

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role
  };
};

export const updateProfileService = async (req, res) => {
  // Only the display name can be edited. The account email is the login
  // identity: letting a live session swap it would turn temporary access to an
  // unlocked workstation into a permanent account takeover (the real owner can
  // no longer sign in or be recognised by that address), so email changes are
  // not accepted here at all.
  const { name } = req.body;

  const { data, error } = await authRepo.updateProfile(req.user.id, name);

  if (error || !data) throw { status: 500, payload: { error: 'Failed to update profile.' } };

  return { message: 'Profile updated successfully.', user: data };
};
