import { db } from '../../config/db.js';
import { logger } from '../../utils/logger.js';


export const checkBoxExistsService = async (req, res) => {
  try {
    let { lot_number, box_number, type } = req.query

    if (!lot_number || !box_number) {
      return res.status(400).json({ error: 'lot_number and box_number are required' })
    }

    let book_type = type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'Mustang';

    // Resolve the lot
    let lotQuery = 'SELECT id FROM lots WHERE lot_number = $1 AND type = $2';
    let lotParams = [lot_number, book_type];

    const { rows: lotRows } = await db.query(lotQuery + ' LIMIT 1', lotParams);
    const lot = lotRows[0] || null;

    // If the lot doesn't exist yet, no boxes can exist inside it.
    if (!lot) {
      return res.json({ success: true, exists: false })
    }

    let boxQuery = 'SELECT id FROM boxes WHERE lot_id = $1 AND box_number = $2';
    let boxParams = [lot.id, box_number];
    if (book_type) {
      boxQuery += ' AND box_type = $3';
      boxParams.push(book_type);
    } else {
      boxQuery += ' AND box_type IS NULL';
    }

    const { rows: boxRows } = await db.query(boxQuery + ' LIMIT 1', boxParams);
    const box = boxRows[0] || null;

    res.json({ success: true, exists: !!box })
  } catch (error) {
    logger.error('box-exists check error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getRejectedBooksService = async (req, res) => {
  try {
    const { limit = 50, today } = req.query
    const requestedLimit = Math.min(parseInt(limit) || 50, 50)
    const fetchLimit = today === 'true' ? requestedLimit * 5 : requestedLimit

    const query = `
      SELECT 
        uf.id, uf.rejection_reason, uf.notes,
        uf.warehouse_flag_by, uf.warehouse_flag_at,
        uf.inventory_flag_by, uf.inventory_flag_at,
        uf.endorsement_flag_by, uf.endorsement_flag_at,
        wu.name as "warehouse_user.name",
        iu.name as "inventory_user.name",
        eu.name as "endorsement_user.name",
        ba.id as "book_activity.id",
        ba.warehouse_scan_at,
        b.isbn, b.title,
        bx.box_number, l.lot_number
      FROM user_flags uf
      LEFT JOIN users wu ON uf.warehouse_flag_by = wu.id
      LEFT JOIN users iu ON uf.inventory_flag_by = iu.id
      LEFT JOIN users eu ON uf.endorsement_flag_by = eu.id
      JOIN book_activity ba ON uf.book_activity_id = ba.id
      JOIN books b ON ba.book_id = b.id
      LEFT JOIN boxes bx ON b.box_id = bx.id
      LEFT JOIN lots l ON bx.lot_id = l.id
      ORDER BY uf.warehouse_flag_at DESC
      LIMIT $1
    `;
    
    const { rows: userFlags } = await db.query(query, [fetchLimit]);

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)

    let mappedRejectedBooks = (userFlags || []).map(uf => {
      // Determine the latest flag among warehouse, inventory, and endorsement
      const flagCandidates = [
        { at: uf.warehouse_flag_at, by: uf['warehouse_user.name'] },
        { at: uf.inventory_flag_at, by: uf['inventory_user.name'] },
        { at: uf.endorsement_flag_at, by: uf['endorsement_user.name'] },
      ].filter(c => c.at)

      const latestFlag = flagCandidates.sort(
        (a, b) => new Date(b.at) - new Date(a.at)
      )[0]

      return {
        id: uf['book_activity.id'] || uf.id,
        isbn: uf.isbn || null,
        title: uf.title || null,
        rejection_reason: uf.rejection_reason || null,
        scanned_at: latestFlag?.at || uf.warehouse_scan_at || null,
        scanned_by_name: latestFlag?.by || null,
        assigned_box: uf.box_number
          ? { box_number: uf.box_number, lot: uf.lot_number ? { lot_number: uf.lot_number } : null }
          : null
      }
    })

    // Filter to today's latest flag if requested
    if (today === 'true') {
      mappedRejectedBooks = mappedRejectedBooks.filter(item => {
        if (!item.scanned_at) return false
        const d = new Date(item.scanned_at)
        return d >= todayStart && d < tomorrowStart
      })
    }

    // Return only the most recent N
    mappedRejectedBooks = mappedRejectedBooks.slice(0, requestedLimit)

    res.json({ success: true, rejectedBooks: mappedRejectedBooks })
  } catch (error) {
    logger.error('Error fetching non-processable books:', error)
    res.status(500).json({ error: error.message })
  }
}
