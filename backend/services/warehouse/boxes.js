import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../utils/logger.js';
import * as warehouseRepo from '../../repositories/warehouse.js';

export const checkBoxExistsService = async (req, res) => {
  try {
    let { lot_number, box_number, type } = req.query

    if (!lot_number || !box_number) {
      return res.status(400).json({ error: 'lot_number and box_number are required' })
    }

    let book_type = null
    if (type) {
      book_type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
    }

    // Resolve the lot (matching the same type-scoping rules as bulk-save)
    let lotQuery = supabaseAdmin.from('lots').select('id').eq('lot_number', lot_number)
    if (book_type) lotQuery = lotQuery.eq('type', book_type)
    else lotQuery = lotQuery.is('type', null)

    const { data: lot } = await lotQuery.maybeSingle()

    // If the lot doesn't exist yet, no boxes can exist inside it.
    if (!lot) {
      return res.json({ success: true, exists: false })
    }

    let boxQuery = supabaseAdmin.from('boxes').select('id').eq('lot_id', lot.id).eq('box_number', box_number)
    if (book_type) boxQuery = boxQuery.eq('box_type', book_type)
    else boxQuery = boxQuery.is('box_type', null)

    const { data: box } = await boxQuery.maybeSingle()

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

    // Fetch a generous pool so we can filter by today's latest flag and still return 10
    const fetchLimit = today === 'true' ? requestedLimit * 5 : requestedLimit

    const { data: userFlags, error } = await supabaseAdmin
      .from('user_flags')
      .select(`
        id,
        rejection_reason,
        notes,
        warehouse_flag_by,
        warehouse_flag_at,
        inventory_flag_by,
        inventory_flag_at,
        endorsement_flag_by,
        endorsement_flag_at,
        warehouse_user:profiles!warehouse_flag_by(name),
        inventory_user:profiles!inventory_flag_by(name),
        endorsement_user:profiles!endorsement_flag_by(name),
        book_activity(
          id,
          warehouse_scan_at,
          books!inner(
            isbn,
            title,
            box:boxes(
              box_number,
              lot:lots(lot_number)
            )
          )
        )
      `)
      .order('warehouse_flag_at', { ascending: false })
      .limit(fetchLimit)

    if (error) throw error

    const firstRel = (rel) => Array.isArray(rel) ? rel[0] : rel

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)

    let mappedRejectedBooks = (userFlags || []).map(uf => {
      const ba = firstRel(uf.book_activity) || {}
      const book = firstRel(ba.books) || {}
      const box = firstRel(book.box) || {}
      const lot = firstRel(box.lot) || {}

      // Determine the latest flag among warehouse, inventory, and endorsement
      const flagCandidates = [
        { at: uf.warehouse_flag_at, by: firstRel(uf.warehouse_user)?.name },
        { at: uf.inventory_flag_at, by: firstRel(uf.inventory_user)?.name },
        { at: uf.endorsement_flag_at, by: firstRel(uf.endorsement_user)?.name },
      ].filter(c => c.at)

      const latestFlag = flagCandidates.sort(
        (a, b) => new Date(b.at) - new Date(a.at)
      )[0]

      return {
        id: ba.id || uf.id,
        isbn: book.isbn || null,
        title: book.title || null,
        rejection_reason: uf.rejection_reason || null,
        scanned_at: latestFlag?.at || ba.warehouse_scan_at || null,
        scanned_by_name: latestFlag?.by || null,
        assigned_box: box.box_number
          ? { box_number: box.box_number, lot: lot.lot_number ? { lot_number: lot.lot_number } : null }
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

