'use client'

import { useCallback, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { fetchUserProfile } from '@/lib/auth-api'
import {
  cancelInventorySession,
  completeInventorySession,
  fetchInventoryBox,
  fetchWarehouseBooks as fetchWarehouseBooksService,
  resumeInventorySession,
  saveInventoryScan,
  searchIlmsBook,
  tagInventoryScan,
} from '../services/inventory.service'
import { normalizeInventoryIsbn } from '../utils/inventory.helpers'
import type {
  BookInBox,
  InventoryBox,
  InventoryIssue,
  VerificationScannedBook,
  VerificationSession,
  WarehouseBook,
} from '../types/inventory.types'
import type { useInventory } from './useInventory'

type InventoryState = ReturnType<typeof useInventory>

export function useVerificationSession(brand: string, inventory: InventoryState) {
  const { toast } = useToast()
  const [verifSessionActive, setVerifSessionActive] = useState(false)
  const [verifUserName, setVerifUserName] = useState(''), [verifUserId, setVerifUserId] = useState('')
  const [verifBox, setVerifBox] = useState<InventoryBox | null>(null)
  const [verifBooks, setVerifBooks] = useState<BookInBox[]>([])
  const [loadingVerifBooks, setLoadingVerifBooks] = useState(false)
  const [verifConfirmComplete, setVerifConfirmComplete] = useState(false)
  const [verifCurrentSession, setVerifCurrentSession] = useState<VerificationSession | null>(null)
  const [verifScannedBooks, setVerifScannedBooks] = useState<VerificationScannedBook[]>([])
  const [verifBookCounter, setVerifBookCounter] = useState(0), [verifCurrentBoxBooks, setVerifCurrentBoxBooks] = useState(0)
  const [verifTotalBooksExpected, setVerifTotalBooksExpected] = useState('')
  const [verifIssues, setVerifIssues] = useState<InventoryIssue[]>([])
  const [verifIssueIsbn, setVerifIssueIsbn] = useState('')
  const [verifIssueType, setVerifIssueType] = useState<'missing' | 'extra'>('missing')
  const [verifFetchingIssueBook, setVerifFetchingIssueBook] = useState(false)
  const [verifFlagModalBook, setVerifFlagModalBook] = useState<VerificationScannedBook | null>(null)
  const [verifFlagIssue, setVerifFlagIssue] = useState(''), [verifFlagRemarks, setVerifFlagRemarks] = useState('')
  const [verifFlagSaving, setVerifFlagSaving] = useState(false)
  const [warehouseBooks, setWarehouseBooks] = useState<WarehouseBook[]>([])
  const [loadingWarehouseBooks, setLoadingWarehouseBooks] = useState(false)

  const loadUserProfile = useCallback(async () => {
    const profile = (await fetchUserProfile()) as { name?: string; id?: string } | null
    if (profile?.name) setVerifUserName(profile.name)
    if (profile?.id) setVerifUserId(profile.id)
  }, [])

  const reset = useCallback(() => {
    setVerifSessionActive(false); setVerifBox(null); setVerifCurrentSession(null); setVerifBooks([])
    setVerifScannedBooks([]); setVerifBookCounter(0); setVerifCurrentBoxBooks(0)
    setVerifTotalBooksExpected(''); setVerifIssues([]); setVerifIssueIsbn(''); setVerifIssueType('missing'); setVerifConfirmComplete(false)
  }, [])

  const fetchWarehouseBooks = useCallback(async (boxId: string) => {
    setLoadingWarehouseBooks(true)
    try {
      const data = await fetchWarehouseBooksService(boxId)
      setWarehouseBooks(data.success ? (data.warehouse_books as WarehouseBook[]) || [] : [])
    } catch (e) { console.error('Error fetching warehouse books:', e); setWarehouseBooks([]) }
    finally { setLoadingWarehouseBooks(false) }
  }, [])

  const handleStartVerifSession = useCallback(async (overrideBoxId: string) => {
    const box = inventory.boxes.find((b) => b.id === overrideBoxId)
    if (!box) return
    setLoadingVerifBooks(true)
    try {
      const data = await resumeInventorySession(box.id)
      if (!data.session) throw new Error('No session returned')
      const boxData = await fetchInventoryBox(box.id)
      setVerifCurrentSession({ ...data.session, total_scanned_books: 0, total_processable: 0, total_non_processable: 0 })
      setVerifBox(box)
      setVerifBooks((boxData.box?.books || []) as BookInBox[])
      setVerifScannedBooks([]); setVerifBookCounter(0); setVerifCurrentBoxBooks(0)
      setVerifTotalBooksExpected(''); setVerifIssues([]); setVerifIssueIsbn(''); setVerifIssueType('missing')
      setVerifSessionActive(true)
      void fetchWarehouseBooks(box.id)
      toast({ title: 'Verification Session Started', description: `Session started for ${box.box_number}.` })
    } catch (e) { toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to start verification session', variant: 'destructive' }) }
    finally { setLoadingVerifBooks(false) }
  }, [fetchWarehouseBooks, inventory.boxes, toast])

  const saveVerifBookToLocal = useCallback((book: { isbn: string; title: string; author: string }, scan_status: 'processable' | 'non_processable', flag_issue: string | null, flag_remarks: string | null) => {
    if (!verifCurrentSession) return
    const newBook: VerificationScannedBook = { id: `local-${Date.now()}`, ...book, scan_status, flag_issue: flag_issue || undefined, flag_remarks: flag_remarks || undefined, timestamp: new Date() }
    setVerifCurrentBoxBooks((v) => v + 1); setVerifBookCounter((v) => v + 1); setVerifScannedBooks((v) => [newBook, ...v])
    setVerifCurrentSession((v) => v ? { ...v, total_scanned_books: v.total_scanned_books + 1, total_processable: v.total_processable + (scan_status === 'processable' ? 1 : 0), total_non_processable: v.total_non_processable + (scan_status === 'non_processable' ? 1 : 0) } : null)
  }, [verifCurrentSession])

  const saveVerifBookToDB = useCallback(async (book: { isbn: string; title: string; author: string }, status: 'processable' | 'non_processable', issue: string | null, remarks: string | null) => {
    if (!verifCurrentSession) return
    return saveInventoryScan(verifCurrentSession.id, { ...book, scan_status: status, rejection_reason: issue || undefined, notes: remarks || undefined })
  }, [verifCurrentSession])

  const handleVerifScan = useCallback(async (isbn: string) => {
    if (!verifCurrentSession) return
    const cleaned = isbn.trim()
    if (verifScannedBooks.some((b) => normalizeInventoryIsbn(b.isbn) === normalizeInventoryIsbn(cleaned))) { toast({ title: 'Duplicate Scan', description: 'This book has already been scanned in this session.', variant: 'destructive' }); return }
    const warehouse = warehouseBooks.find((b) => normalizeInventoryIsbn(b.isbn) === normalizeInventoryIsbn(cleaned))
    if (warehouse?.rejection_reason === 'missing') { toast({ title: 'Cannot Scan Missing Book', description: 'This book was marked as missing by the warehouse and cannot be verified.', variant: 'destructive' }); return }
    setLoadingVerifBooks(true)
    try {
      const data = await searchIlmsBook(isbn)
      const details = data.success && data.data && !data.data.Message ? { isbn: data.data.ISBN || isbn, title: data.data.Title || `ISBN: ${isbn}`, author: data.data.Author || `Author ${verifBookCounter + 1}` } : { isbn, title: `Book ${verifBookCounter + 1}`, author: `Author ${verifBookCounter + 1}` }
      saveVerifBookToLocal(details, warehouse?.scan_status || 'processable', null, null)
      if (!data.success || !data.data || data.data.Message) toast({ title: 'Book Not Found', description: 'ISBN not found in iLMS. Added to verification log anyway.', variant: 'destructive' })
    } catch {
      saveVerifBookToLocal({ isbn, title: `Book ${verifBookCounter + 1}`, author: `Author ${verifBookCounter + 1}` }, warehouse?.scan_status || 'processable', null, null)
      toast({ title: 'API Error', description: 'Failed to fetch book details. Added to verification log anyway.', variant: 'destructive' })
    } finally { setLoadingVerifBooks(false) }
  }, [saveVerifBookToLocal, toast, verifBookCounter, verifCurrentSession, verifScannedBooks, warehouseBooks])

  const handleVerifAddIssue = useCallback(async () => {
    const isbn = verifIssueIsbn.trim()
    if (!isbn) return
    if (verifScannedBooks.some((b) => b.isbn === isbn)) { toast({ title: 'Error', description: 'This book was already scanned successfully in this session.', variant: 'destructive' }); setVerifIssueIsbn(''); return }
    if (verifIssues.some((i) => i.isbn === isbn)) { toast({ title: 'Error', description: 'This issue has already been added.', variant: 'destructive' }); setVerifIssueIsbn(''); return }
    setVerifFetchingIssueBook(true)
    try {
      const data = await searchIlmsBook(isbn)
      const issueData: InventoryIssue = { isbn, type: verifIssueType, title: data.success && data.data && !data.data.Message ? data.data.Title : `Book ${verifBookCounter + 1}`, author: data.success && data.data && !data.data.Message ? data.data.Author : `Author ${verifBookCounter + 1}` }
      setVerifIssues((prev) => [...prev, issueData]); setVerifIssueIsbn('')
    } catch {
      setVerifIssues((prev) => [...prev, { isbn, type: verifIssueType, title: `Book ${verifBookCounter + 1}`, author: `Author ${verifBookCounter + 1}` }]); setVerifIssueIsbn('')
    } finally { setVerifFetchingIssueBook(false) }
  }, [toast, verifBookCounter, verifIssueIsbn, verifIssueType, verifIssues, verifScannedBooks])

  const handleVerifRemoveIssue = useCallback((isbn: string) => {
    setVerifIssues((prev) => prev.filter((issue) => issue.isbn !== isbn))
  }, [])

  const handleVerifIssueKeyPress = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && verifIssueIsbn.trim()) handleVerifAddIssue()
  }, [verifIssueIsbn, handleVerifAddIssue])

  const handleRemoveVerifBook = useCallback((id: string) => {
    const book = verifScannedBooks.find((b) => b.id === id)
    if (!book) return
    setVerifScannedBooks((v) => v.filter((b) => b.id !== id)); setVerifCurrentBoxBooks((v) => Math.max(0, v - 1)); setVerifBookCounter((v) => Math.max(0, v - 1))
    setVerifCurrentSession((v) => v ? { ...v, total_scanned_books: Math.max(0, v.total_scanned_books - 1), total_processable: book.scan_status === 'processable' ? Math.max(0, v.total_processable - 1) : v.total_processable, total_non_processable: book.scan_status === 'non_processable' ? Math.max(0, v.total_non_processable - 1) : v.total_non_processable } : null)
    toast({ title: 'Book Removed', description: `${book.isbn} removed from verification log.` })
  }, [toast, verifScannedBooks])

  const openVerifFlagModal = useCallback((book: VerificationScannedBook) => { setVerifFlagModalBook(book); setVerifFlagIssue(book.flag_issue || ''); setVerifFlagRemarks(book.flag_remarks || '') }, [])

  const saveVerifFlagFromLog = useCallback(async () => {
    if (!verifFlagModalBook || !verifFlagIssue) { toast({ title: 'Select an issue first', variant: 'destructive' }); return }
    setVerifFlagSaving(true)
    const editing = verifFlagModalBook.scan_status === 'non_processable'
    try {
      setVerifScannedBooks((v) => v.map((b) => b.id === verifFlagModalBook.id ? { ...b, scan_status: 'non_processable', flag_issue: verifFlagIssue, flag_remarks: verifFlagRemarks } : b))
      if (!editing) setVerifCurrentSession((v) => v ? { ...v, total_non_processable: v.total_non_processable + 1, total_processable: Math.max(0, v.total_processable - 1) } : null)
      setVerifFlagModalBook(null)
      toast({ title: editing ? 'Flag Updated' : 'Flagged as Non-Processable' })
    } catch (e) { toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' }) }
    finally { setVerifFlagSaving(false) }
  }, [toast, verifFlagIssue, verifFlagModalBook, verifFlagRemarks])

  const handleResetVerifSession = useCallback(async () => {
    if (!verifCurrentSession) return
    try { if (verifBox) await cancelInventorySession(verifBox.id) } catch (e) { console.error('Failed to reset session status:', e) }
    reset()
    toast({ title: 'Verification Session Reset', description: 'Session has been reset. Scanned data was not saved.' })
  }, [reset, toast, verifBox, verifCurrentSession])

  const handleOpenVerifComplete = useCallback(() => {
    if (!verifCurrentSession) return
    if (verifScannedBooks.length === 0) { toast({ title: 'Cannot Complete Session', description: 'Please scan at least one book before completing the session.', variant: 'destructive' }); return }
    const expected = warehouseBooks.filter((wb) => wb.rejection_reason !== 'missing')
    const missing = expected.filter((wb) => !verifScannedBooks.some((vb) => vb.isbn === wb.isbn))
    const extra = verifScannedBooks.filter((vb) => !expected.some((wb) => wb.isbn === vb.isbn))
    if (missing.length > 0 || extra.length > 0) {
      if (missing.length > 0 && extra.length > 0) toast({ title: 'Mismatch Detected', description: `You are missing ${missing.length} expected book(s) and have ${extra.length} extra book(s).`, variant: 'destructive' })
      else if (missing.length > 0) toast({ title: 'Mismatch Detected', description: `You are missing ${missing.length} expected book(s) from the Warehouse guide.`, variant: 'destructive' })
      else toast({ title: 'Mismatch Detected', description: `You have ${extra.length} extra book(s) that were not in the Warehouse guide. Please remove them before completing.`, variant: 'destructive' })
      return
    }
    setVerifTotalBooksExpected(''); setVerifIssues([]); setVerifConfirmComplete(true)
  }, [toast, verifCurrentSession, verifScannedBooks, warehouseBooks])

  const handleCompleteVerifSession = useCallback(async () => {
    if (!verifCurrentSession || !verifBox) return
    setLoadingVerifBooks(true)
    try {
      const booksToSave = verifScannedBooks.filter((b) => b.scan_status === 'non_processable' || !warehouseBooks.some((wb) => wb.isbn === b.isbn))
      for (const book of booksToSave) {
        const warehouseBook = warehouseBooks.find((wb) => wb.isbn === book.isbn)
        try {
          if (warehouseBook && warehouseBook.scan_status === 'processable' && book.scan_status === 'non_processable') {
            if (warehouseBook.id) await tagInventoryScan(warehouseBook.id, book.flag_issue + (book.flag_remarks ? ` - ${book.flag_remarks}` : ''))
            else await saveVerifBookToDB(book, book.scan_status, book.flag_issue || null, book.flag_remarks || null)
          } else if (!warehouseBook) await saveVerifBookToDB(book, book.scan_status, book.flag_issue || null, book.flag_remarks || null)
        } catch (error) { toast({ title: 'Error', description: `Failed to save book ${book.isbn}. Session not completed.`, variant: 'destructive' }); throw error }
      }
      await completeInventorySession(verifCurrentSession.id, verifIssues)
      inventory.setBoxes((prev) => prev.map((b) => b.id === verifBox.id ? { ...b, box_sessions: b.box_sessions?.map((s) => s.id === verifCurrentSession.id ? { ...s, status: 'completed' } : s) || [{ status: 'completed' }] } : b))
      reset()
      toast({ title: 'Verification Session Closed', description: 'Verification completed successfully.' })
    } catch (e) { toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to complete verification session', variant: 'destructive' }) }
    finally { setLoadingVerifBooks(false) }
  }, [inventory, reset, saveVerifBookToDB, toast, verifBox, verifCurrentSession, verifIssues, verifScannedBooks, warehouseBooks])

  return {
    verifSessionActive, verifUserName, verifUserId, verifBox, verifBooks, setVerifBooks, loadingVerifBooks, verifConfirmComplete, setVerifConfirmComplete,
    verifCurrentSession, verifScannedBooks, verifBookCounter, verifCurrentBoxBooks, verifTotalBooksExpected, setVerifTotalBooksExpected,
    verifIssues, setVerifIssues, verifIssueIsbn, setVerifIssueIsbn, verifIssueType, setVerifIssueType, verifFetchingIssueBook,
    verifFlagModalBook, setVerifFlagModalBook, verifFlagIssue, setVerifFlagIssue, verifFlagRemarks, setVerifFlagRemarks, verifFlagSaving,
    warehouseBooks, loadingWarehouseBooks, loadUserProfile, fetchWarehouseBooks,
    handleStartVerifSession, handleVerifScan, handleVerifAddIssue, handleVerifRemoveIssue, handleVerifIssueKeyPress, handleRemoveVerifBook,
    openVerifFlagModal, saveVerifFlagFromLog, handleResetVerifSession, handleOpenVerifComplete, handleCompleteVerifSession,
  }
}
