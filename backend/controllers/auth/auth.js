/**
 * controllers/auth.js
 *
 * Handles HTTP requests and responses for authentication.
 */

import { logger } from '../../utils/logger.js';
import * as authService from '../../services/auth/auth.js';

export const register = async (req, res) => {
  try {
    const result = await authService.registerService(req, res);
    res.status(201).json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again later.' });
  }
};

export const login = async (req, res) => {
  try {
    const result = await authService.loginService(req, res);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again later.' });
  }
};

export const logout = async (req, res) => {
  try {
    const result = await authService.logoutService(req, res);
    res.json(result);
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed. Please try again.' });
  }
};

export const refresh = async (req, res) => {
  try {
    const result = await authService.refreshService(req, res);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('Token refresh error:', error);
    res.status(401).json({ error: 'Failed to refresh token.' });
  }
};

export const password = async (req, res) => {
  try {
    const result = await authService.passwordService(req, res);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('Password update error:', error);
    res.status(500).json({ error: 'Failed to update password. Please try again later.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const result = await authService.resetPasswordService(req, res);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password. Please try again later.' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const result = await authService.getProfileService(req, res);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const result = await authService.updateProfileService(req, res);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile. Please try again later.' });
  }
};

export const innodata = async (req, res) => {
  try {
    const url = await authService.innodataService(req, res);
    res.redirect(url);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload || { error: error.message });
    res.status(500).send(error.message);
  }
};

export const innodataCallback = async (req, res) => {
  try {
    const url = await authService.innodataCallbackService(req, res);
    res.redirect(url);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload || { error: error.message });
    logger.error('SSO Callback error:', error);
    res.status(500).send('SSO Authentication failed');
  }
};
