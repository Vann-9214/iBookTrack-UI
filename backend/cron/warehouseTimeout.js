/**
 * cron/warehouseTimeout.js
 *
 * The 20-minute timeout engine for warehouse sessions.
 *
 * Every minute, any warehouse session still 'in_progress' whose last activity
 * (updated_at) is older than 20 minutes is flipped to 'delayed'. Delayed
 * sessions keep the box locked (only the same user or a supervisor can
 * release it), and a WAREHOUSE_DELAYED event is broadcast so connected
 * clients can update their lock state in real time.
 */
import cron from 'node-cron';
import { db } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { broadcastEvent } from '../utils/sse.js';

const TIMEOUT_MINUTES = 20;

export const runWarehouseTimeoutSweep = async () => {
  try {
    const { rows } = await db.query(`
      UPDATE box_sessions bs
      SET status = 'delayed'
      FROM boxes bx
      WHERE bs.box_id = bx.id
        AND bx.current_stage = 'warehouse'
        AND bs.warehouse_user_received IS NOT NULL
        AND bs.status = 'in_progress'
        AND bs.updated_at < NOW() - INTERVAL '${TIMEOUT_MINUTES} minutes'
      RETURNING bs.box_id, bs.warehouse_user_received AS user_id, bx.box_number, bx.box_type,
        (SELECT lot_number FROM lots WHERE id = bx.lot_id) AS lot_number,
        (SELECT name FROM users WHERE id = bs.warehouse_user_received) AS user_name
    `);

    for (const row of rows) {
      logger.info(`Warehouse session timed out for box ${row.box_number} (${row.box_id}) — marked delayed`);
      broadcastEvent('WAREHOUSE_DELAYED', {
        box_id: row.box_id,
        box_number: row.box_number,
        box_type: row.box_type,
        lot_number: row.lot_number,
        user_id: row.user_id,
        user_name: row.user_name,
        status: 'delayed',
      });
    }
  } catch (err) {
    logger.error('Warehouse timeout sweep failed:', err);
  }
};

export const startWarehouseTimeoutJob = () => {
  cron.schedule('* * * * *', runWarehouseTimeoutSweep);
  logger.info(`⏱️ Warehouse timeout job started (marks sessions delayed after ${TIMEOUT_MINUTES} min of inactivity)`);
};
