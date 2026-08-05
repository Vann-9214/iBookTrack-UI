'use client'

import { useToast } from '@/hooks/use-toast'
import { queryIsbnStream } from '../services/warehouse.service'
import { ilmsLotBoxMismatch, isValidIsbn } from '../utils/warehouse.helpers'
import type { ScannedBook } from '../types/warehouse.types'
import type { useWarehouseState } from './useWarehouseState'

export function useWarehouseScans(core: ReturnType<typeof useWarehouseState>) {
  const { toast } = useToast()
  const {
    activeLot, currentBoxNumber, currentSession, setCurrentSession, scannedBooks, setScannedBooks,
    setSessionError, setIlmsMismatchModal, setFlagModalBook, setFlagIssue,
    setFlagRemarks, setFlagSaving, setFlagOpen, setMismatchModalBook, issueIsbn, setIssueIsbn,
    issueType, issues, setIssues, setFetchingIssueBook,
    setCurrentBoxBooks, setBookCounter, setIsbnLoading,
  } = core

  const saveBookToLocal = (
    bookData: { isbn: string; title: string; author: string; ilmsData?: any; mismatch_details?: { ilms_title: string; ilms_author?: string; physical_title: string; physical_author?: string } },
    scan_status: 'processable' | 'non_processable',
    flag_issue: string | null,
    flag_remarks: string | null
  ) => {
    if (!currentSession || !bookData) return
    setCurrentBoxBooks((p) => p + 1)
    setBookCounter((p) => p + 1)
    const newBook: ScannedBook = {
      id: `local-${Date.now()}`,
      isbn: bookData.isbn,
      title: bookData.title,
      author: bookData.author,
      scan_status,
      flag_issue: flag_issue || undefined,
      flag_remarks: flag_remarks || undefined,
      mismatch_details: bookData.mismatch_details,
      timestamp: new Date(),
      ilmsData: bookData.ilmsData || null,
    }
    setScannedBooks((prev) => [newBook, ...prev])
    setCurrentSession((prev) => prev ? {
      ...prev,
      total_scanned_books: prev.total_scanned_books + 1,
      total_processable: scan_status === 'processable' ? prev.total_processable + 1 : prev.total_processable,
      total_non_processable: scan_status === 'non_processable' ? prev.total_non_processable + 1 : prev.total_non_processable,
    } : null)
  }

  const handleScan = async (isbn: string) => {
    if (!currentSession) return
    setSessionError(null)
    const cleanIsbn = isbn.replace(/[^0-9a-zA-Z]/g, '').toUpperCase()
    if (!isValidIsbn(cleanIsbn)) { setSessionError('Scanned code is not a valid ISBN (must be 10 or 13 characters).'); return }
    if (scannedBooks.some((b) => b.isbn === cleanIsbn)) { setSessionError(`ISBN ${cleanIsbn} is already in your scan log. You cannot scan the same book twice before completing the session.`); return }
    if (issues.some((i) => i.isbn === cleanIsbn)) { setSessionError(`ISBN ${cleanIsbn} is already marked as a discrepancy issue in this session. Remove it from your issues list first.`); return }
    setIsbnLoading(true)
    try {
      const ilmsData = await queryIsbnStream(cleanIsbn, currentSession.type)
      if (!ilmsData.success) { setSessionError(ilmsData.error || `ISBN ${cleanIsbn} not found in ${currentSession.type?.toUpperCase() || 'iLMS'} records.`); return }
      const bookData = ilmsData.data
      const mismatch = ilmsLotBoxMismatch(bookData?.LotNo, bookData?.BoxNo, activeLot, currentBoxNumber)
      if (mismatch.mismatched) {
        setIsbnLoading(false)
        setIlmsMismatchModal({
          open: true,
          isbn: cleanIsbn,
          title: bookData?.Title || 'Unknown Title',
          author: bookData?.AuthorName || bookData?.Author || '',
          expectedLot: activeLot,
          expectedBox: currentBoxNumber,
          ilmsLot: mismatch.ilmsLot,
          ilmsBox: mismatch.ilmsBox,
          onConfirm: () => saveBookToLocal({ isbn: cleanIsbn, title: bookData?.Title || 'Unknown Title', author: bookData?.AuthorName || bookData?.Author || '', ilmsData: bookData }, 'processable', null, null),
        })
        return
      }
      saveBookToLocal({ isbn: cleanIsbn, title: bookData?.Title || 'Unknown Title', author: bookData?.AuthorName || bookData?.Author || '', ilmsData: bookData }, 'processable', null, null)
    } catch (error) {
      setSessionError('Failed to verify ISBN. Please try again.')
    } finally {
      setIsbnLoading(false)
    }
  }

  const openFlagModal = (book: ScannedBook) => {
    setFlagModalBook(book)
    setFlagIssue(book.flag_issue || '')
    setFlagRemarks(book.flag_remarks || '')
    setFlagOpen(false)
  }

  const openMismatchModal = (book: ScannedBook) => {
    setMismatchModalBook(book)
  }

  const saveFlagFromLog = async () => {
    if (!currentSession) return
    const modalBook = core.flagModalBook
    if (!modalBook || !core.flagIssue) { setSessionError('Select an issue first'); return }
    setFlagSaving(true)
    try {
      setScannedBooks((prev) => prev.map((b) => b.id === modalBook.id ? { ...b, scan_status: 'non_processable', flag_issue: core.flagIssue, flag_remarks: core.flagRemarks } : b))
      setCurrentSession((prev) => prev ? { ...prev, total_non_processable: prev.total_non_processable + 1, total_processable: Math.max(0, prev.total_processable - 1) } : null)
      setFlagModalBook(null)
      toast({ title: 'Flagged as Non-Processable' })
    } catch (e: any) {
      setSessionError(e.message || 'Failed to flag book')
    } finally {
      setFlagSaving(false)
    }
  }

  const saveMismatchFromLog = async (payload: { ilms_title: string; ilms_author: string; physical_title: string; physical_author: string }) => {
    if (!currentSession) return
    const modalBook = core.mismatchModalBook
    if (!modalBook) return
    setFlagSaving(true)
    try {
      setScannedBooks((prev) => prev.map((b) => b.id === modalBook.id ? { 
        ...b, 
        scan_status: 'processable', 
        flag_issue: 'mismatched-book', 
        mismatch_details: payload 
      } : b))
      setMismatchModalBook(null)
      toast({ title: 'Mismatch Details Saved' })
    } catch (e: any) {
      setSessionError(e.message || 'Failed to save mismatch details')
    } finally {
      setFlagSaving(false)
    }
  }

  const handleRemoveBook = (bookId: string) => {
    const book = scannedBooks.find((b) => b.id === bookId)
    if (!book) return
    setScannedBooks((prev) => prev.filter((b) => b.id !== bookId))
    setCurrentBoxBooks((p) => Math.max(0, p - 1))
    setBookCounter((p) => Math.max(0, p - 1))
    setCurrentSession((prev) => prev ? {
      ...prev,
      total_scanned_books: Math.max(0, prev.total_scanned_books - 1),
      total_processable: book.scan_status === 'processable' ? Math.max(0, prev.total_processable - 1) : prev.total_processable,
      total_non_processable: book.scan_status === 'non_processable' ? Math.max(0, prev.total_non_processable - 1) : prev.total_non_processable,
    } : null)
    toast({ title: 'Book Removed', description: `${book.isbn} removed from scan log.` })
  }

  const handleAddIssue = async () => {
    const cleanIsbn = issueIsbn.trim().replace(/[^0-9a-zA-Z]/g, '').toUpperCase()
    if (!cleanIsbn) return
    if (!isValidIsbn(cleanIsbn)) { setSessionError('Input is not a valid ISBN (must be 10 or 13 characters).'); setIssueIsbn(''); return }
    if (scannedBooks.some((b) => b.isbn === cleanIsbn)) { setSessionError(`You already scanned ISBN ${cleanIsbn} in your scan log. Remove it first if you want to re-add it as missing.`); setIssueIsbn(''); return }
    if (issues.some((i) => i.isbn === cleanIsbn)) { setSessionError(`ISBN ${cleanIsbn} is already listed as a missing issue.`); setIssueIsbn(''); return }
    setFetchingIssueBook(true)
    setSessionError(null)
    try {
      const data = await queryIsbnStream(cleanIsbn, currentSession?.type, true, issueType)
      if (!data.success) { setSessionError(data.error || `ISBN ${cleanIsbn} not found in ${currentSession?.type?.toUpperCase() || 'iLMS'} records.`); setIssueIsbn(''); return }
      setIssues((prev) => [...prev, { isbn: cleanIsbn, type: issueType, title: data.data?.Title || 'Unknown Title', author: data.data?.AuthorName || data.data?.Author || '' }])
      setIssueIsbn('')
    } catch {
      setSessionError('Failed to connect to iLMS. Please try again.')
    } finally {
      setFetchingIssueBook(false)
    }
  }

  const handleRemoveIssue = (isbn: string) => setIssues((prev) => prev.filter((i) => i.isbn !== isbn))
  const handleIssueKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && issueIsbn.trim()) handleAddIssue() }

  return { saveBookToLocal, handleScan, openFlagModal, openMismatchModal, saveFlagFromLog, saveMismatchFromLog, handleRemoveBook, handleAddIssue, handleRemoveIssue, handleIssueKeyPress }
}
