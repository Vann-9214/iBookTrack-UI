/**
 * services/auth/auth.js
 *
 * Core business logic for authentication using standard PostgreSQL, bcrypt, and jsonwebtoken.
 */

import * as authRepo from '../../repositories/auth/auth.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'strict' };

const getMillisecondsUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  return midnight.getTime() - now.getTime();
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
  const msUntilMidnight = getMillisecondsUntilMidnight();
  const token = generateToken(user, Math.floor(msUntilMidnight / 1000));

  // Send token securely in HTTP-only cookie
  res.cookie('access_token', token, { ...cookieOpts, maxAge: msUntilMidnight });

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
  res.clearCookie('access_token');
  res.clearCookie('refresh_token'); // Clear in case legacy token exists
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

    const msUntilMidnight = getMillisecondsUntilMidnight();
    const newToken = generateToken(user, Math.floor(msUntilMidnight / 1000));
    res.cookie('access_token', newToken, { ...cookieOpts, maxAge: msUntilMidnight });

    return { message: 'Session refreshed.' };
  } catch (err) {
    res.clearCookie('access_token');
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
  const msUntilMidnight = getMillisecondsUntilMidnight();
  const refreshedToken = generateToken(
    { ...user, role: user.role, token_version: newVersion },
    Math.floor(msUntilMidnight / 1000)
  );
  res.cookie('access_token', refreshedToken, { ...cookieOpts, maxAge: msUntilMidnight });

  return { message: 'Password updated successfully.' };
};

/**
 * DEV-ONLY password reset.
 *
 * ⚠️ SECURITY: This resets a password given ONLY an email + new password, with
 * NO proof that the requester owns the account. That is an account-takeover
 * risk, so it is HARD-DISABLED when NODE_ENV=production. Before going live,
 * replace this with a proper token-based reset (emailed single-use link).
 */
export const resetPasswordService = async (req, res) => {
  if (isProd) {
    throw { status: 403, payload: { error: 'Password reset is disabled in production.' } };
  }

  const { email, newPassword } = req.body;

  const user = await authRepo.getUserByEmail(email);
  if (!user) {
    throw { status: 404, payload: { error: 'No account found with that email.' } };
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await authRepo.updatePassword(user.id, newPasswordHash);
  // Invalidate any existing sessions for this account.
  await authRepo.incrementTokenVersion(user.id);

  return { message: 'Password reset successfully. You can now log in.' };
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
  const { name, email } = req.body;

  // Reject email changes that collide with another account, returning a clean
  // 409 instead of surfacing a raw DB unique-constraint error as a 500.
  const existing = await authRepo.getUserByEmail(email);
  if (existing && existing.id !== req.user.id) {
    throw { status: 409, payload: { error: 'That email address is already in use.' } };
  }

  const { data, error } = await authRepo.updateProfile(req.user.id, name, email);

  if (error || !data) throw { status: 500, payload: { error: 'Failed to update profile.' } };

  return { message: 'Profile updated successfully.', user: data };
};

// Innodata SSO functions omitted for brevity unless needed
export const innodataService = async (req, res) => {
  throw { status: 501, payload: { error: 'SSO not implemented yet for vanilla Postgres' } };
};

export const innodataCallbackService = async (req, res) => {
  throw { status: 501, payload: { error: 'SSO not implemented yet for vanilla Postgres' } };
};
