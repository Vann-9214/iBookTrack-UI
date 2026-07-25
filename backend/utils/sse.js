/**
 * utils/sse.js
 *
 * Minimal Server-Sent Events (SSE) broadcaster.
 *
 * Keeps a registry of connected HTTP response objects (one per open
 * EventSource on the frontend) and exposes broadcastEvent() so any part of
 * the backend can push a named real-time event to every connected client.
 */
import { logger } from './logger.js';

const clients = new Set();

/**
 * Register a connected SSE response object. Returns an unsubscribe function.
 */
export const addClient = (res) => {
  clients.add(res);
  return () => clients.delete(res);
};

/**
 * Push a named event with a JSON payload to every connected client.
 * Dead/broken connections are dropped silently.
 */
export const broadcastEvent = (eventName, payload) => {
  const frame = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try {
      res.write(frame);
    } catch (err) {
      logger.warn(`SSE broadcast failed for a client, dropping it: ${err.message}`);
      clients.delete(res);
    }
  }
};

export const clientCount = () => clients.size;
