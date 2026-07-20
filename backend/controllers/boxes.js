/**
 * controllers/boxes.js
 *
 * Handles HTTP request/response flow for boxes routes.
 */

import { logger } from '../utils/logger.js';
import * as boxesService from '../services/boxes.js';

export const getBoxes = async (req, res) => {
  try {
    const result = await boxesService.getBoxesService(req);
    res.json(result);
  } catch (error) {
    logger.error('Fetch boxes error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPipelineTransitions = async (req, res) => {
  try {
    const result = await boxesService.getPipelineTransitionsService(req);
    res.json(result);
  } catch (error) {
    logger.error('Get pipeline transitions error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getBoxByNumber = async (req, res) => {
  try {
    const result = await boxesService.getBoxByNumberService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    logger.error('Get box by number error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getBoxById = async (req, res) => {
  try {
    const result = await boxesService.getBoxByIdService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    logger.error('Get box error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getBoxesByLotNumber = async (req, res) => {
  try {
    const result = await boxesService.getBoxesByLotNumberService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message });
    logger.error('Get boxes by lot error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const receiveBox = async (req, res) => {
  try {
    const result = await boxesService.receiveBoxService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    logger.error('Receive box error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const advanceBox = async (req, res) => {
  try {
    const result = await boxesService.advanceBoxService(req);
    res.json(result);
  } catch (error) {
    if (error.status) {
      const payload = { error: error.message };
      if (error.pending_isbns) payload.pending_isbns = error.pending_isbns;
      if (error.simflex_status) payload.simflex_status = error.simflex_status;
      return res.status(error.status).json(payload);
    }
    logger.error('Advance box stage error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const sendForwardBox = async (req, res) => {
  try {
    const result = await boxesService.sendForwardBoxService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    logger.error('Send to cut error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const rollbackBox = async (req, res) => {
  try {
    const result = await boxesService.rollbackBoxService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    logger.error('Rollback box stage error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getBoxTransmission = async (req, res) => {
  try {
    const result = await boxesService.getBoxTransmissionService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message });
    logger.error('Box transmission view error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const checkSimflex = async (req, res) => {
  try {
    const result = await boxesService.checkSimflexService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message });
    logger.error('Check Scan Manager error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteBox = async (req, res) => {
  try {
    const result = await boxesService.deleteBoxService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message });
    logger.error('Delete box error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
