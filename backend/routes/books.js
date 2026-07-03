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

const router = express.Router()

// Test iLMS API - Search book by ISBN from client's system
router.get('/ilms/search/:isbn', requireAuth, async (req, res) => {
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
router.post('/:id/flag', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { issue, remarks, box_id } = req.body
    const db = supabaseAdmin

    if (!issue) return res.status(400).json({ error: 'issue is required' })

    // Look up the scan record (source of truth for scanned books)
    const { data: scan, error: scanError } = await db
      .from('book_activity')
      .select('id, books(isbn, title, box_id)')
      .eq('id', id)
      .single()

    if (scanError || !scan) return res.status(404).json({ error: 'Scan record not found' })

    // Insert a QC flag record (log it, don't delete the scan)
    const { error: flagError } = await db
      .from('qc_flags')
      .upsert({
        scan_id: id,
        isbn: scan.books?.isbn,
        title: scan.books?.title,
        box_id: scan.books?.box_id || box_id || null,
        issue,
        remarks: remarks || null,
        flagged_by: req.user.id,
        flagged_by_name: req.user.user_metadata?.name || req.user.email
      }, { onConflict: 'scan_id' })

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
router.delete('/:id/flag', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const db = supabaseAdmin

    const { error } = await db
      .from('qc_flags')
      .delete()
      .eq('scan_id', id)

    if (error) throw error

    res.json({ success: true, scan_id: id })
  } catch (error) {
    console.error('Delete flag error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
