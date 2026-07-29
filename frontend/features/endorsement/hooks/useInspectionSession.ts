import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { fetchUserProfile } from '@/lib/auth-api'
import { BoxEntry, InspScannedBook, WarehouseBook, InspSession } from '../types/endorsement.types'
import { endorsementService } from '../services/endorsement.service'

export function useInspectionSession(inspectionBoxes: BoxEntry[], onCompletedSuccess: () => void) {
  const [inspSessionActive, setInspSessionActive] = useState(false)
  const [inspBox, setInspBox] = useState<BoxEntry | null>(null)
  const [inspUserName, setInspUserName] = useState('')
  const [inspUserId, setInspUserId] = useState('')
  const [inspCurrentSession, setInspCurrentSession] = useState<InspSession | null>(null)
  const [inspScannedBooks, setInspScannedBooks] = useState<InspScannedBook[]>([])
  const [inspBookCounter, setInspBookCounter] = useState(0)
  const [inspCurrentBoxBooks, setInspCurrentBoxBooks] = useState(0)
  const [loadingInspSession, setLoadingInspSession] = useState(false)
  const [inspConfirmComplete, setInspConfirmComplete] = useState(false)
  const [inspFlagModalBook, setInspFlagModalBook] = useState<InspScannedBook | null>(null)
  const [inspFlagIssue, setInspFlagIssue] = useState('')
  const [inspFlagRemarks, setInspFlagRemarks] = useState('')
  const [inspFlagSaving, setInspFlagSaving] = useState(false)

  const [warehouseBooks, setWarehouseBooks] = useState<WarehouseBook[]>([])
  const [loadingWarehouseBooks, setLoadingWarehouseBooks] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await fetchUserProfile()
      if (profile?.name) setInspUserName(profile.name)
      if (profile?.id) setInspUserId(profile.id)
    }
    loadProfile()
  }, [])

  const fetchWarehouseBooks = async (boxId: string) => {
    setLoadingWarehouseBooks(true)
    try {
      const books = await endorsementService.fetchWarehouseScans(boxId)
      setWarehouseBooks(books)
    } catch (e) {
      console.error('Error fetching warehouse books:', e)
      setWarehouseBooks([])
    } finally {
      setLoadingWarehouseBooks(false)
    }
  }

  const handleStartInspSession = async (boxId: string) => {
    const box = inspectionBoxes.find((b) => b.id === boxId)
    if (!box) return
    setLoadingInspSession(true)
    try {
      const session = await endorsementService.resumeSession(box.id)
      setInspCurrentSession({ ...session, total_scanned_books: 0, total_processable: 0, total_non_processable: 0 })
      setInspBox(box)
      setInspScannedBooks([])
      setInspBookCounter(0)
      setInspCurrentBoxBooks(0)
      setInspSessionActive(true)
      fetchWarehouseBooks(box.id)
      toast.success(`Session started for ${box.box_number}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start inspection session')
    } finally {
      setLoadingInspSession(false)
    }
  }

  const addInspBookLocal = (bookData: { isbn: string; title: string; author: string }, scan_status: 'processable' | 'non_processable') => {
    if (!inspCurrentSession) return
    setInspCurrentBoxBooks((p) => p + 1)
    setInspBookCounter((p) => p + 1)
    const newBook: InspScannedBook = {
      id: `local-${Date.now()}`,
      isbn: bookData.isbn,
      title: bookData.title,
      author: bookData.author,
      scan_status,
      timestamp: new Date(),
    }
    setInspScannedBooks((prev) => [newBook, ...prev])
    setInspCurrentSession((prev) =>
      prev
        ? {
            ...prev,
            total_scanned_books: prev.total_scanned_books + 1,
            total_processable: scan_status === 'processable' ? prev.total_processable + 1 : prev.total_processable,
            total_non_processable: scan_status === 'non_processable' ? prev.total_non_processable + 1 : prev.total_non_processable,
          }
        : null
    )
  }

  const handleInspScan = async (isbn: string) => {
    if (!inspCurrentSession) return

    const cleanedIsbn = isbn.trim()
    if (inspScannedBooks.some((b) => b.isbn.trim().toLowerCase() === cleanedIsbn.toLowerCase())) {
      toast.error('This book has already been scanned in this session.')
      return
    }

    const warehouseBook = warehouseBooks.find((wb) => wb.isbn.trim().toLowerCase() === cleanedIsbn.toLowerCase())
    if (warehouseBook?.rejection_reason === 'missing') {
      toast.error('This book was marked as missing by the inventory guide and cannot be verified.')
      return
    }

    const prevStatus = (warehouseBook?.scan_status ?? 'processable') as 'processable' | 'non_processable'

    setLoadingInspSession(true)
    try {
      const data = await endorsementService.searchIlms(isbn)
      if (data.success && data.data && !data.data.Message) {
        addInspBookLocal({ isbn: data.data.ISBN || isbn, title: data.data.Title || `ISBN: ${isbn}`, author: data.data.Author || '' }, prevStatus)
      } else {
        addInspBookLocal({ isbn, title: `Book ${inspBookCounter + 1}`, author: '' }, prevStatus)
        toast.warning('ISBN not found in iLMS — added to log anyway.')
      }
    } catch {
      addInspBookLocal({ isbn, title: `Book ${inspBookCounter + 1}`, author: '' }, prevStatus)
      toast.error('API error — added to log anyway.')
    } finally {
      setLoadingInspSession(false)
    }
  }

  const handleRemoveInspBook = (bookId: string) => {
    const book = inspScannedBooks.find((b) => b.id === bookId)
    if (!book) return
    setInspScannedBooks((prev) => prev.filter((b) => b.id !== bookId))
    setInspCurrentBoxBooks((p) => Math.max(0, p - 1))
    setInspBookCounter((p) => Math.max(0, p - 1))
    setInspCurrentSession((prev) =>
      prev
        ? {
            ...prev,
            total_scanned_books: Math.max(0, prev.total_scanned_books - 1),
            total_processable: book.scan_status === 'processable' ? Math.max(0, prev.total_processable - 1) : prev.total_processable,
            total_non_processable: book.scan_status === 'non_processable' ? Math.max(0, prev.total_non_processable - 1) : prev.total_non_processable,
          }
        : null
    )
  }

  const openInspFlagModal = (book: InspScannedBook) => {
    setInspFlagModalBook(book)
    setInspFlagIssue(book.flag_issue || '')
    setInspFlagRemarks(book.flag_remarks || '')
  }

  const closeInspFlagModal = () => {
    setInspFlagModalBook(null)
    setInspFlagIssue('')
    setInspFlagRemarks('')
  }

  const saveInspFlagFromLog = () => {
    if (!inspFlagModalBook || !inspFlagIssue) {
      toast.error('Select an issue first')
      return
    }
    setInspFlagSaving(true)
    setInspScannedBooks((prev) =>
      prev.map((b) =>
        b.id === inspFlagModalBook.id ? { ...b, scan_status: 'non_processable', flag_issue: inspFlagIssue, flag_remarks: inspFlagRemarks } : b
      )
    )
    setInspCurrentSession((prev) =>
      prev
        ? {
            ...prev,
            total_non_processable: prev.total_non_processable + 1,
            total_processable: Math.max(0, prev.total_processable - 1),
          }
        : null
    )
    setInspFlagModalBook(null)
    toast.success('Flagged as Non-Processable')
    setInspFlagSaving(false)
  }

  const handleResetInspSession = async () => {
    if (!inspCurrentSession) return
    try {
      if (inspBox) await endorsementService.cancelSession(inspBox.id)
    } catch (e) {
      console.error('Failed to reset session status:', e)
    }
    setInspSessionActive(false)
    setInspBox(null)
    setInspCurrentSession(null)
    setInspScannedBooks([])
    setInspBookCounter(0)
    setInspCurrentBoxBooks(0)
    setInspConfirmComplete(false)
    toast.success('Session reset — scanned data was not saved.')
  }

  const handleOpenInspComplete = () => {
    if (!inspCurrentSession) return
    if (inspScannedBooks.length === 0) {
      toast.error('Scan at least one book before completing.')
      return
    }

    const expectedWarehouseBooks = warehouseBooks.filter((wb) => wb.rejection_reason !== 'missing')

    const missingBooks = expectedWarehouseBooks.filter((wb) => !inspScannedBooks.some((vb) => vb.isbn === wb.isbn))
    const extraBooks = inspScannedBooks.filter((vb) => !expectedWarehouseBooks.some((wb) => wb.isbn === vb.isbn))

    if (missingBooks.length > 0 || extraBooks.length > 0) {
      if (missingBooks.length > 0 && extraBooks.length > 0) {
        toast.error(`Mismatch: Missing ${missingBooks.length} expected book(s) and found ${extraBooks.length} extra book(s).`)
      } else if (missingBooks.length > 0) {
        toast.error(`Mismatch: You are missing ${missingBooks.length} expected book(s) from the Inventory guide.`)
      } else {
        toast.error(`Mismatch: You have ${extraBooks.length} extra book(s). Please remove them before completing.`)
      }
      return
    }

    setInspConfirmComplete(true)
  }

  const handleCompleteInspSession = async () => {
    if (!inspCurrentSession || !inspBox) return
    setLoadingInspSession(true)
    try {
      for (const book of inspScannedBooks) {
        await endorsementService.saveScanBook(inspCurrentSession.id, book)
      }
      await endorsementService.completeSession(inspCurrentSession.id, inspScannedBooks.length)
      setInspSessionActive(false)
      setInspBox(null)
      setInspCurrentSession(null)
      setInspScannedBooks([])
      setInspBookCounter(0)
      setInspCurrentBoxBooks(0)
      setInspConfirmComplete(false)
      onCompletedSuccess()
      toast.success('Inspection session completed.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to complete session')
    } finally {
      setLoadingInspSession(false)
    }
  }

  return {
    inspSessionActive,
    inspBox,
    inspUserName,
    inspUserId,
    inspCurrentSession,
    inspScannedBooks,
    inspCurrentBoxBooks,
    loadingInspSession,
    inspConfirmComplete,
    setInspConfirmComplete,
    inspFlagModalBook,
    inspFlagIssue,
    setInspFlagIssue,
    inspFlagRemarks,
    setInspFlagRemarks,
    inspFlagSaving,
    warehouseBooks,
    loadingWarehouseBooks,
    handleStartInspSession,
    handleInspScan,
    handleRemoveInspBook,
    openInspFlagModal,
    closeInspFlagModal,
    saveInspFlagFromLog,
    handleResetInspSession,
    handleOpenInspComplete,
    handleCompleteInspSession,
  }
}
