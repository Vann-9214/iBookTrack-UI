/**
 * controllers/dashboard.js
 *
 * Handles HTTP request/response flow for dashboard routes.
 */

import { logger } from '../../utils/logger.js';
import * as dashboardService from '../../services/analytics/dashboard.js';

export const getStats = async (req, res) => {
  try {
    const result = await dashboardService.getStatsService(req);
    res.json(result);
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getOpenLots = async (req, res) => {
  try {
    const result = await dashboardService.getOpenLotsService(req);
    res.json(result);
  } catch (error) {
    logger.error('Get open lots error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getQcFlags = async (req, res) => {
  try {
    const result = await dashboardService.getQcFlagsService(req);
    res.json(result);
  } catch (error) {
    logger.error('Get QC flags error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getDailyOutput = async (req, res) => {
  try {
    const result = await dashboardService.getDailyOutputService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    logger.error('Get daily output error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getLotDetails = async (req, res) => {
  try {
    const result = await dashboardService.getLotDetailsService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message });
    logger.error('Get lot details error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPipelineStats = async (req, res) => {
  try {
    const result = await dashboardService.getPipelineStatsService(req);
    res.json(result);
  } catch (error) {
    logger.error('Get pipeline stats error:', error);
    res.status(500).json({ error: error.message });
  }
};
