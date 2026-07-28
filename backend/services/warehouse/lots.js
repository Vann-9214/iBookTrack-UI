import { logger } from '../../utils/logger.js';
import { db } from '../../config/db.js';
import { runWarehouseTimeoutSweep } from '../../utils/warehouseTimeout.js';

// ── Warehouse overview: paginated Lots -> Boxes -> latest warehouse status ───
// GET /api/warehouse/overview?page=1&limit=10&type=mustang
// Returns one page of lots (newest first) with every box inside each lot and
// the status of that box's latest warehouse session.
export const getWarehouseOverviewService = async (req, res) => {
  try {
    // Mark any in_progress sessions older than 30 min as delayed before querying
    await runWarehouseTimeoutSweep();

    const requestedPage = parseInt(req.query.page || '1', 10);
    const requestedLimit = parseInt(req.query.limit || '10', 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;
    const type = req.query.type
      ? req.query.type.charAt(0).toUpperCase() + req.query.type.slice(1).toLowerCase()
      : null;

    const search = req.query.search || '';
    const status = req.query.status || '';

    let where = '';
    const params = [];
    if (type) {
      params.push(type);
      where = `WHERE l.type = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      const searchClause = `(l.lot_number ILIKE $${params.length} OR EXISTS (
        SELECT 1 FROM boxes b WHERE b.lot_id = l.id AND b.box_number ILIKE $${params.length}
      ))`;
      where = where ? `${where} AND ${searchClause}` : `WHERE ${searchClause}`;
    }

    if (status) {
      params.push(status);
      const existsClause = `EXISTS (
        SELECT 1 FROM boxes b 
        WHERE b.lot_id = l.id AND (
          SELECT bs.status FROM box_sessions bs 
          WHERE bs.box_id = b.id AND bs.warehouse_user_received IS NOT NULL
          ORDER BY bs.warehouse_time_received DESC NULLS LAST
          LIMIT 1
        ) = $${params.length}
      )`;
      where = where ? `${where} AND ${existsClause}` : `WHERE ${existsClause}`;
    }

    const { rows: countRows } = await db.query(`SELECT COUNT(*)::int AS count FROM lots l ${where}`, params);
    const totalItems = countRows[0]?.count || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const lotParams = [...params, limit, (page - 1) * limit];
    const { rows: lots } = await db.query(`
      SELECT l.id, l.lot_number, l.type, l.created_at, l.created_by, u.name AS created_by_name
      FROM lots l
      LEFT JOIN users u ON u.id = l.created_by
      ${where}
      ORDER BY l.created_at DESC, l.lot_number DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, lotParams);

    let boxesByLot = {};
    if (lots.length > 0) {
      const lotIds = lots.map(l => l.id);
      const { rows: boxes } = await db.query(`
        SELECT b.id, b.lot_id, b.box_number, b.box_type, b.current_stage, b.total_expected_books,
          (
            SELECT bs.status FROM box_sessions bs
            WHERE bs.box_id = b.id AND bs.warehouse_user_received IS NOT NULL
            ORDER BY bs.warehouse_time_received DESC NULLS LAST
            LIMIT 1
          ) AS status,
          (
            SELECT bs.id FROM box_sessions bs
            WHERE bs.box_id = b.id AND bs.warehouse_user_received IS NOT NULL
            ORDER BY bs.warehouse_time_received DESC NULLS LAST
            LIMIT 1
          ) AS session_id,
          (
            SELECT u.name FROM box_sessions bs
            LEFT JOIN users u ON u.id = bs.warehouse_user_received
            WHERE bs.box_id = b.id AND bs.warehouse_user_received IS NOT NULL
            ORDER BY bs.warehouse_time_received DESC NULLS LAST
            LIMIT 1
          ) AS last_touched_by
        FROM boxes b
        WHERE b.lot_id = ANY($1)
        ORDER BY b.box_number ASC
      `, [lotIds]);

      // Create a map of lot ID to lot_number for filtering
      const lotMap = lots.reduce((acc, l) => {
        acc[l.id] = l.lot_number;
        return acc;
      }, {});

      boxesByLot = boxes.reduce((acc, b) => {
        if (status && b.status !== status) {
          return acc;
        }
        
        // If searching, and the lot doesn't match the search, filter the boxes
        if (search) {
          const lotMatches = lotMap[b.lot_id]?.toLowerCase().includes(search.toLowerCase());
          const boxMatches = b.box_number?.toLowerCase().includes(search.toLowerCase());
          if (!lotMatches && !boxMatches) {
            return acc; // skip this box
          }
        }

        (acc[b.lot_id] = acc[b.lot_id] || []).push({
          id: b.id,
          box_number: b.box_number,
          current_stage: b.current_stage,
          total_expected_books: b.total_expected_books,
          status: b.status || null,
          session_id: b.session_id || null,
          last_touched_by: b.last_touched_by || null,
        });
        return acc;
      }, {});
    }

    res.json({
      success: true,
      lots: lots.map(l => ({
        id: l.id,
        lot_number: l.lot_number,
        type: l.type,
        created_by: l.created_by,
        created_by_name: l.created_by_name,
        total_boxes: (boxesByLot[l.id] || []).length, // Update total_boxes based on filtered results
        boxes: boxesByLot[l.id] || [],
      })),
      pagination: { currentPage: page, totalPages, totalItems },
    });
  } catch (error) {
    logger.error('warehouse overview error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

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
