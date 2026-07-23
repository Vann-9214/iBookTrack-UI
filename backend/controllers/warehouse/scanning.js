/**
 * controllers/scanning.js
 *
 * Handles HTTP request/response flow for scanning operations.
 */

import { logger } from '../../utils/logger.js';
import * as scanningService from '../../services/warehouse/scanning.js';

export const getLiveScanning = async (req, res) => {
  try {
    const result = await scanningService.getLiveScanningService(req);
    res.json(result);
  } catch (error) {
    logger.error('Error in /live:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getScanRows = async (req, res) => {
  try {
    const result = await scanningService.getScanRowsService(req);
    res.json(result);
  } catch (error) {
    logger.error('Error in /scan-rows:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTransmitRows = async (req, res) => {
  try {
    const result = await scanningService.getTransmitRowsService(req);
    res.json(result);
  } catch (error) {
    logger.error('Error in /transmit-rows:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMachineBooks = async (req, res) => {
  try {
    const result = await scanningService.getMachineBooksService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('Error in /machine-books:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getRanking = async (req, res) => {
  try {
    const result = await scanningService.getRankingService(req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getExport = async (req, res) => {
  try {
    // Controller delegates stream/response handling directly for exports
    await scanningService.getExportService(req, res);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSimflexStatus = async (req, res) => {
  try {
    const result = await scanningService.getSimflexStatusService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('Scan Manager status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const enrichIlms = async (req, res) => {
  try {
    const result = await scanningService.enrichIlmsService(req);
    res.json(result);
  } catch (error) {
    logger.error('ILMS enrichment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
