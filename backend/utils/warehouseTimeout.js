/**
 * utils/warehouseTimeout.js
 *
 * On-demand 30-minute timeout check for warehouse and inventory sessions.
 *
 * Called inline by the warehouse overview and start-session endpoints
 * (instead of running on a cron schedule). Any session still
 * 'in_progress' whose last activity (updated_at) is older than 30 minutes
 * is flipped to 'delayed'. Delayed sessions keep the box locked, and a DELAYED event
 * is broadcast so connected clients can update their lock state in real time.
 */
import { db } from '../config/db.js';
import { logger } from './logger.js';
import { broadcastEvent } from './sse.js';

const TIMEOUT_MINUTES = 30;

export const runWarehouseTimeoutSweep = async () => {
  try {
    const { rows } = await db.query(`
      UPDATE box_sessions bs
      SET status = 'delayed'
      FROM boxes bx
      WHERE bs.box_id = bx.id
        AND bx.current_stage IN ('warehouse', 'inventory', 'endorsement', 'qa')
        AND bs.status = 'in_progress'
        AND bs.updated_at < NOW() - INTERVAL '${TIMEOUT_MINUTES} minutes'
      RETURNING bs.box_id, 
        CASE 
          WHEN bx.current_stage = 'inventory' THEN bs.inventory_user_received 
          WHEN bx.current_stage IN ('endorsement', 'qa') THEN bs.endorsement_user_received
          ELSE bs.warehouse_user_received 
        END AS user_id, 
        bx.current_stage, bx.box_number, bx.box_type,
        (SELECT lot_number FROM lots WHERE id = bx.lot_id) AS lot_number,
        (SELECT name FROM users WHERE id = (
          CASE 
            WHEN bx.current_stage = 'inventory' THEN bs.inventory_user_received 
            WHEN bx.current_stage IN ('endorsement', 'qa') THEN bs.endorsement_user_received
            ELSE bs.warehouse_user_received 
          END
        )) AS user_name
    `);

    for (const row of rows) {
      logger.info(`Session timed out for box ${row.box_number} (${row.box_id}) in stage ${row.current_stage} — marked delayed`);
      let eventName = 'WAREHOUSE_DELAYED';
      if (row.current_stage === 'inventory') eventName = 'INVENTORY_DELAYED';
      if (row.current_stage === 'endorsement' || row.current_stage === 'qa') eventName = 'ENDORSEMENT_DELAYED';
      
      broadcastEvent(eventName, {
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
    logger.error('Timeout sweep failed:', err);
  }
};
