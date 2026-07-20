/**
 * controllers/storage.js
 *
 * Handles HTTP request/response flow for storage operations.
 */

import { logger } from '../utils/logger.js';
import * as storageService from '../services/storage.js';

export const getLocations = async (req, res) => {
  try {
    const result = await storageService.getLocationsService(req);
    res.json(result);
  } catch (error) {
    logger.error('Get storage locations error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const provisionLocations = async (req, res) => {
  try {
    const result = await storageService.provisionLocationsService(req);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Provision section error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateLocationCapacity = async (req, res) => {
  try {
    const result = await storageService.updateLocationCapacityService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message });
    logger.error('Update location capacity error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const result = await storageService.deleteLocationService(req);
    res.json(result);
  } catch (error) {
    logger.error('Delete storage location error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getReadyBoxes = async (req, res) => {
  try {
    const result = await storageService.getReadyBoxesService(req);
    res.json(result);
  } catch (error) {
    logger.error('Get ready boxes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const assignBatch = async (req, res) => {
  try {
    const result = await storageService.assignBatchService(req);
    res.status(201).json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message });
    logger.error('Batch assign boxes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const removeBatch = async (req, res) => {
  try {
    const result = await storageService.removeBatchService(req);
    res.json(result);
  } catch (error) {
    logger.error('Batch remove assignments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const searchStorage = async (req, res) => {
  try {
    const result = await storageService.searchStorageService(req);
    res.json(result);
  } catch (error) {
    logger.error('Storage search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPendingAssignments = async (req, res) => {
  try {
    const result = await storageService.getPendingAssignmentsService(req);
    res.json(result);
  } catch (error) {
    logger.error('Get pending assignments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const confirmAssignment = async (req, res) => {
  try {
    const result = await storageService.confirmAssignmentService(req);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message });
    logger.error('Confirm assignment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
