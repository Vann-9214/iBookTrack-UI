/**
 * services/auth/auth.js
 *
 * Core business logic for authentication using standard PostgreSQL, bcrypt, and jsonwebtoken.
 */

import * as authRepo from '../../repositories/auth/auth.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '../../utils/logger.js';

const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'lax' };

// Name and lifetime of the one-time cookie that ties an SSO callback back to the
// authorize request this server actually started (OAuth2 "state").
const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_MAX_AGE = 10 * 60 * 1000;

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

// Innodata SSO functions omitted for brevity unless needed
export const innodataService = async (req, res) => {
  const authUrl = new URL(process.env.OAUTH_AUTHORIZE_URL);
  authUrl.searchParams.append('client_id', process.env.OAUTH_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', process.env.OAUTH_REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'openid email profile');

  // Unguessable value that links this authorize request to the callback that
  // follows. It is kept in an HttpOnly cookie the browser cannot read and is
  // compared in innodataCallbackService, so a callback triggered by someone else
  // (with their own authorization code) cannot log this browser in.
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie(OAUTH_STATE_COOKIE, state, { ...cookieOpts, maxAge: OAUTH_STATE_MAX_AGE });
  authUrl.searchParams.append('state', state);

  return authUrl.toString();
};

export const innodataCallbackService = async (req, res) => {
  const { code, state } = req.query;
  if (!code) throw { status: 400, payload: { error: 'Authorization code is missing.' } };

  // Verify the callback belongs to an authorize request this server issued.
  // The cookie is single-use and cleared straight away so a captured state
  // cannot be replayed.
  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE, cookieOpts);

  const stateMatches =
    typeof state === 'string' &&
    typeof expectedState === 'string' &&
    state.length === expectedState.length &&
    crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expectedState));

  if (!stateMatches) {
    logger.error('SSO callback rejected: OAuth state missing or does not match the issued value.');
    throw { status: 400, payload: { error: 'Invalid SSO request. Please start the sign-in again.' } };
  }

  try {
    // 1. Exchange code for access token
    const basicAuth = Buffer.from(`${process.env.OAUTH_CLIENT_ID}:${process.env.OAUTH_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await fetch(process.env.OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        redirect_uri: process.env.OAUTH_REDIRECT_URI,
        grant_type: 'authorization_code',
        code,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to get access token: ${errorText}`);
    }
    
    const tokenData = await tokenResponse.json();

    // 2. Get user info
    const userResponse = await fetch(process.env.OAUTH_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`Failed to get user info: ${errorText}`);
    }
    
    const userData = await userResponse.json();

    // 3. Find or create user in DB
    const email = userData.email || userData.upn || userData.username || userData.sub;
    const name = userData.name || userData.given_name || (email ? email.split('@')[0] : 'SSO User');
    
    if (!email) throw new Error('Email not provided by SSO provider');

    let user = await authRepo.getUserByEmail(email);
    if (!user) {
      // Create user with dummy password since they use SSO
      const dummyPassword = await bcrypt.hash(Math.random().toString(36), 10);
      user = await authRepo.createUser(name, email, dummyPassword, null);
    }

    // 4. Generate token and set cookie
    const msDuration = getSessionDurationMs();
    const token = generateToken(user, Math.floor(msDuration / 1000));
    res.cookie('access_token', token, { ...cookieOpts, maxAge: msDuration });

    // 5. Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) throw new Error('FRONTEND_URL environment variable is missing.');
    return frontendUrl;
  } catch (error) {
    // The raw error carries the provider's token/userinfo response body, which
    // can include client configuration and token material. It stays in the
    // server log; the browser only receives an opaque code so nothing sensitive
    // ends up in the URL bar, browser history or Referer header.
    logger.error('SSO callback failed:', error);
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) throw new Error('FRONTEND_URL environment variable is missing.');
    return `${frontendUrl}/login?error=sso_failed`;
  }
};
