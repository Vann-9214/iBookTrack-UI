/**
 * services/auth.js
 *
 * Core business logic for authentication.
 * Handles tokens, cookies, external OAuth, and profile management flow.
 */

import * as authRepo from '../repositories/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'strict' };

export const registerService = async (req, res) => {
  const { name, email, password } = req.body;
  
  const { data, error } = await authRepo.signUp(email, password, name);
  if (error) throw { status: 400, payload: { error: error.message } };

  const profile = await authRepo.getProfileById(data.user?.id);

  return {
    message: 'Registration successful. Check your email to confirm your account.',
    user: {
      id: data.user?.id,
      email: profile?.email || data.user?.email,
      name: profile?.name || data.user?.user_metadata?.name,
    }
  };
};

export const loginService = async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await authRepo.signInWithPassword(email, password);
  
  // Use same generic error for wrong email OR wrong password (prevents user enumeration)
  if (error) throw { status: 401, payload: { error: 'Invalid credentials.' } };

  const profile = await authRepo.getProfileById(data.user?.id);

  if (data.session?.access_token) {
    res.cookie('access_token', data.session.access_token, { ...cookieOpts, maxAge: 3600 * 1000 });
  }
  if (data.session?.refresh_token) {
    res.cookie('refresh_token', data.session.refresh_token, { ...cookieOpts, maxAge: 7 * 24 * 3600 * 1000 });
  }

  return {
    message: 'Login successful.',
    user: {
      id: data.user?.id,
      email: profile?.email || data.user?.email,
      name: profile?.name || data.user?.user_metadata?.name,
    }
  };
};

export const logoutService = async (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  return { message: 'Logged out successfully.' };
};

export const refreshService = async (req, res) => {
  const refreshToken = req.cookies?.refresh_token || req.body.refresh_token;
  if (!refreshToken) throw { status: 400, payload: { error: 'Refresh token is required.' } };

  const { data, error } = await authRepo.refreshSession(refreshToken);
  
  if (error || !data.session) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    throw { status: 401, payload: { error: 'Invalid or expired refresh token.' } };
  }

  res.cookie('access_token', data.session.access_token, { ...cookieOpts, maxAge: (data.session.expires_in || 3600) * 1000 });
  if (data.session.refresh_token) {
    res.cookie('refresh_token', data.session.refresh_token, { ...cookieOpts, maxAge: 7 * 24 * 3600 * 1000 });
  }

  return { message: 'Token refreshed successfully.' };
};

export const passwordService = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const { error: verifyError } = await authRepo.signInWithPassword(req.user.email, currentPassword);
  if (verifyError) throw { status: 400, payload: { error: 'Current password is incorrect.' } };
  if (!supabaseAdmin) throw { status: 500, payload: { error: 'Password update is unavailable.' } };

  const { error: updateError } = await authRepo.updateAuthPassword(req.user.id, newPassword);
  if (updateError) throw { status: 500, payload: { error: updateError.message } };

  return { message: 'Password updated successfully.' };
};

export const getProfileService = async (req, res) => {
  const profile = await authRepo.getProfileById(req.user.id);
  if (!profile) throw { status: 404, payload: { error: 'Profile not found' } };

  return {
    id: req.user.id,
    name: profile.name,
    email: profile.email,
  };
};

export const updateProfileService = async (req, res) => {
  const { name, email } = req.body;
  if (!supabaseAdmin) throw { status: 500, payload: { error: 'Profile update is unavailable.' } };

  const previousEmail = req.user.email;
  const previousName = req.user.user_metadata?.name || req.user.user_metadata?.full_name || '';

  const { error: authError } = await authRepo.updateAuthUser(req.user.id, email, name);
  if (authError) throw { status: 500, payload: { error: authError.message } };

  const { data, error } = await authRepo.updateProfile(req.user.id, name, email);

  if (error) {
    await authRepo.updateAuthUser(req.user.id, previousEmail, previousName);
    throw { status: 500, payload: { error: error.message } };
  }
  if (!data) throw { status: 404, payload: { error: 'Profile not found.' } };

  return { message: 'Profile updated successfully.', user: data };
};

export const innodataService = async (req, res) => {
  const authorizeUrl = process.env.OAUTH_AUTHORIZE_URL;
  const clientId = process.env.OAUTH_CLIENT_ID;
  const redirectUri = process.env.OAUTH_REDIRECT_URI;
  
  if (!authorizeUrl || !clientId || !redirectUri) {
    throw { status: 500, payload: { error: 'OAuth configuration is missing in environment variables.' } };
  }
  
  const url = new URL(authorizeUrl);
  url.searchParams.append('response_type', 'code');
  url.searchParams.append('client_id', clientId);
  url.searchParams.append('redirect_uri', redirectUri);
  url.searchParams.append('scope', 'openid profile email');
  
  return url.toString();
};

export const innodataCallbackService = async (req, res) => {
  const { code } = req.query;
  if (!code) throw { status: 400, payload: { error: 'No authorization code provided' } };

  const tokenUrl = process.env.OAUTH_TOKEN_URL;
  const userInfoUrl = process.env.OAUTH_USERINFO_URL;
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.OAUTH_REDIRECT_URI;

  if (!tokenUrl || !userInfoUrl || !clientId || !clientSecret || !redirectUri) {
    throw new Error('OAuth configuration is missing in environment variables.');
  }

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    })
  });

  if (!tokenRes.ok) throw new Error(`OAuth token exchange failed with status ${tokenRes.status}`);
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('No access token returned from OAuth provider');

  const userRes = await fetch(userInfoUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });

  if (!userRes.ok) throw new Error(`Failed to fetch user info with status ${userRes.status}`);
  const userInfo = await userRes.json();

  const jwt = (await import('jsonwebtoken')).default;
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET in environment variables');

  const token = jwt.sign(
    { id: userInfo.id, email: userInfo.email, name: userInfo.name },
    secret,
    { expiresIn: '8h' }
  );

  res.cookie('access_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 8 * 3600 * 1000
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const returnUrl = new URL('/login', frontendUrl);
  returnUrl.searchParams.append('sso_success', 'true');
  returnUrl.searchParams.append('email', userInfo.email);
  returnUrl.searchParams.append('name', userInfo.name || '');
  
  return returnUrl.toString();
};
