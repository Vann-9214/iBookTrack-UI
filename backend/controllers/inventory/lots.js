/**
 * controllers/lots.js
 *
 * Handles HTTP requests and responses for the lots domain.
 * Extracts parameters from requests, passes them to the service layer,
 * and formats the final JSON response or error.
 */

import { logger } from '../../utils/logger.js';
import * as lotsService from '../../services/inventory/lots.js';

export const getLots = async (req, res) => {
  try {
    const result = await lotsService.getLotsService(req, res);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('Get lots error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getLotTransmissionSummary = async (req, res) => {
  try {
    const result = await lotsService.getLotTransmissionSummaryService(req, res);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('LOT transmission summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getLot = async (req, res) => {
  try {
    const result = await lotsService.getLotService(req, res);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('Get lot error:', error);
    res.status(500).json({ error: error.message });
  }
};
