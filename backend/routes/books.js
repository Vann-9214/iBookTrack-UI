/**
 * routes/books.js
 *
 * Manages the books (ISBNs) tracked inside iBookTrack.
 *
 * Endpoints:
 *   GET    /api/books/ilms/search/:isbn — Search the iLMS catalog for a book by ISBN
 *   POST   /api/books/:id/flag         — Add a QC flag to a scanned book
 *   DELETE /api/books/:id/flag         — Remove a QC flag from a book
 *
 * All routes require authentication (requireAuth middleware).
 */

import express from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { ilmsApi } from '../services/ilms-api.js'
import { z } from 'zod'
import { validateRequest } from '../middleware/validateRequest.js'

const router = express.Router()

// Get books (optionally filtered by box_id)
// Used by the inventory print-label feature to derive the book type for a box.
router.get('/', requireAuth, validateRequest({
  query: z.object({
    box_id: z.string().optional()
  })
}), async (req, res) => {
  try {
    const { box_id } = req.query
    const db = supabaseAdmin

    let query = db
      .from('books')
      .select('id, isbn, title, book_type, box_id')
      .order('title', { ascending: true })

    if (box_id) {
      query = query.eq('box_id', box_id)
    }

    const { data, error } = await query
    if (error) throw error

    res.json({ success: true, books: data || [] })
  } catch (error) {
    console.error('Get books error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Test iLMS API - Search book by ISBN from client's system
router.get('/ilms/search/:isbn', requireAuth, validateRequest({
  params: z.object({
    isbn: z.string().min(1)
  })
}), async (req, res) => {
  try {
    const { isbn } = req.params

    console.log('🔍 Searching iLMS API for ISBN:', isbn)

    const result = await ilmsApi.searchBookByISBN(isbn)

    if (result.success) {
      console.log('✅ iLMS API response received')
      res.json({
        success: true,
        source: 'iLMS API',
        data: result.data
      })
    } else {
      console.log('❌ iLMS API error:', result.error)
      res.status(404).json({
        success: false,
        error: result.error,
        message: 'Book not found in iLMS system'
      })
    }
  } catch (error) {
    console.error('iLMS API test error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Flag a book with a QC issue (from Book Inspection page)
// :id is a book_activity row ID
router.post('/:id/flag', requireAuth, validateRequest({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    issue: z.string().min(1),
    remarks: z.string().optional(),
    box_id: z.string().optional()
  })
}), async (req, res) => {
  try {
    const { id } = req.params
    const { issue, remarks, box_id } = req.body
    const db = supabaseAdmin

    // Look up the scan record (source of truth for scanned books)
    const { data: scan, error: scanError } = await db
      .from('book_activity')
      .select('id, book_id, books(id, isbn, title, box_id)')
      .eq('id', id)
      .single()

    if (scanError || !scan) return res.status(404).json({ error: 'Scan record not found' })

    // Find the latest activity for this book to attach the flag to
    const { data: latestActivity } = await db
      .from('book_activity')
      .select('id')
      .eq('book_id', scan.book_id || scan.books?.id)
      .order('warehouse_scan_at', { ascending: false })
      .limit(1)
      .single()

    const activityId = latestActivity?.id || id

    // Insert a QC flag record
    const { data: flagData, error: flagError } = await db
      .from('user_flags')
      .insert({
        book_activity_id: activityId,
        rejection_reason: issue,
        notes: remarks || null,
        warehouse_flag_by: req.user.id
      })
      .select('id')
      .single()

    if (flagError) {
      console.error('QC flag insert error:', flagError)
      return res.status(500).json({ error: flagError.message })
    }

    res.json({ success: true, scan_id: id, issue, remarks })
  } catch (error) {
    console.error('Flag book error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Remove a QC flag for a book (mark as OK)
router.delete('/:id/flag', requireAuth, validateRequest({
  params: z.object({
    id: z.string().min(1)
  })
}), async (req, res) => {
  try {
    const { id } = req.params
    const db = supabaseAdmin

    const { error } = await db.from('user_flags').delete().eq('book_activity_id', id)

    if (error) throw error

    res.json({ success: true, scan_id: id })
  } catch (error) {
    console.error('Delete flag error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
