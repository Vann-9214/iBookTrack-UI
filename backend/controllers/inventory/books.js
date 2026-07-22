/**
 * controllers/books.js
 *
 * Handles the HTTP request/response flow for books.
 * Extracts data from the request, passes it to the books service,
 * and sends the formatted JSON response back to the client.
 */

import { logger } from '../../utils/logger.js';
import * as booksService from '../../services/inventory/books.js';

export const getBooks = async (req, res) => {
  try {
    const result = await booksService.getBooksService(req, res);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('Get books error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const searchIlmsBook = async (req, res) => {
  try {
    const result = await booksService.searchIlmsBookService(req, res);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('iLMS API test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const flagBook = async (req, res) => {
  try {
    const result = await booksService.flagBookService(req, res);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('Flag book error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const removeFlag = async (req, res) => {
  try {
    const result = await booksService.removeFlagService(req, res);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json(error.payload);
    logger.error('Delete flag error:', error);
    res.status(500).json({ error: error.message });
  }
};
