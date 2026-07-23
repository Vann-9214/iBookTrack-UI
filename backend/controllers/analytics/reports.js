/**
 * controllers/reports.js
 *
 * Handles HTTP requests for report generation.
 */

import { logger } from '../../utils/logger.js';
import * as reportsService from '../../services/analytics/reports.js';

export const getLotStatus = async (req, res) => {
  try {
    const result = await reportsService.getLotStatusService(req, res);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('[Reports] lot-status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
