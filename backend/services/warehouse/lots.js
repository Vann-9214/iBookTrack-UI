import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../utils/logger.js';
import * as warehouseRepo from '../../repositories/warehouse.js';

export const getIlmsLotsService = async (req, res) => {
  try {
    // We now just fetch distinct lots from our local database rather than pinging iLMS
    const { data: lots, error } = await supabaseAdmin
      .from('lots')
      .select('lot_number, type')
      .order('created_at', { ascending: false })
      .limit(100) // fetch up to 100 recent lots

    if (error) throw error

    // Format them for the frontend
    const formattedLots = lots.map(l => ({
      lot_number: l.lot_number,
      type: l.type,
      boxes: [] // we no longer pre-fetch boxes, users manually type them
    }))

    res.json({ success: true, lots: formattedLots })
  } catch (error) {
    logger.error('fetch historical lots error:', error)
    res.status(500).json({ success: false, error: error.message, lots: [] })
  }
}

