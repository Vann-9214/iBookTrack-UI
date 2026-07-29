/**
 * routes/events.js
 *
 * GET /api/events — long-lived Server-Sent Events stream.
 *
 * Clients (EventSource with credentials) connect here to receive real-time
 * pipeline events such as WAREHOUSE_LOCKED / WAREHOUSE_UNLOCKED /
 * WAREHOUSE_DELAYED. On connect the client also receives a
 * WAREHOUSE_LOCK_SNAPSHOT event with all boxes currently locked by an active
 * warehouse session, so late joiners start with the correct state.
 */
import express from 'express';
import { requireAuth, requireRole, OPERATIONAL_ROLES } from '../middleware/authMiddleware.js';
import { addClient } from '../utils/sse.js';
import { db } from '../config/db.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.get('/', requireAuth, requireRole(OPERATIONAL_ROLES), async (req, res) => {
  // SSE headers — keep connection alive
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if present
  res.flushHeaders();

  const removeClient = addClient(res);

  // Send a heartbeat comment every 25 s to prevent proxy timeouts
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send('connected', { message: 'Events stream ready' });

  // Initial snapshot: every warehouse and inventory box currently locked by an active session
  try {
    const { rows } = await db.query(`
      SELECT bs.box_id, bs.status,
             CASE WHEN bx.current_stage = 'inventory' THEN bs.inventory_user_received ELSE bs.warehouse_user_received END AS user_id,
             u.name AS user_name, bx.box_number, bx.box_type, l.lot_number, bx.current_stage
      FROM box_sessions bs
      JOIN boxes bx ON bx.id = bs.box_id
      LEFT JOIN lots l ON l.id = bx.lot_id
      LEFT JOIN users u ON u.id = (CASE WHEN bx.current_stage = 'inventory' THEN bs.inventory_user_received ELSE bs.warehouse_user_received END)
      WHERE bs.status IN ('in_progress', 'delayed')
        AND bx.current_stage IN ('warehouse', 'inventory')
    `);
    
    const warehouseLocks = rows.filter(r => r.current_stage === 'warehouse');
    const inventoryLocks = rows.filter(r => r.current_stage === 'inventory');

    send('WAREHOUSE_LOCK_SNAPSHOT', { locks: warehouseLocks });
    send('INVENTORY_LOCK_SNAPSHOT', { locks: inventoryLocks });
  } catch (err) {
    logger.error('Failed to send warehouse lock snapshot:', err);
  }

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient();
  });
});

export default router;
