import { logger } from '../../utils/logger.js';
import { db } from '../../config/db.js';

export const getIlmsLotsService = async (req, res) => {
  try {
    const { rows: lots } = await db.query('SELECT lot_number, type FROM lots ORDER BY created_at DESC LIMIT 100');

    // Format them for the frontend
    const formattedLots = lots.map(l => ({
      lot_number: l.lot_number,
      type: l.type,
      boxes: [] 
    }));

    res.json({ success: true, lots: formattedLots });
  } catch (error) {
    logger.error('fetch historical lots error:', error);
    res.status(500).json({ success: false, error: error.message, lots: [] });
  }
};
