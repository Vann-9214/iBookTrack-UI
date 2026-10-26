'use client'

import { useEffect, useRef, useState } from 'react'
import type {
  ConflictModalState,
  IlmsMismatchModalState,
  Lot,
  MissingIssue,
  ScannedBook,
  SimilarLotModalState,
  WarehouseSession,
} from '../types/warehouse.types'

export function useWarehouseState() {
  const [activeLot, setActiveLot] = useState('')
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [selectedBox, setSelectedBox] = useState('')
  const [sessionActive, setSessionActive] = useState(false)
  const [scannedBooks, setScannedBooks] = useState<ScannedBook[]>([])
  const [currentSession, setCurrentSession] = useState<WarehouseSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [isbnLoading, setIsbnLoading] = useState(false)
  const [currentBoxNumber, setCurrentBoxNumber] = useState('')
  const [currentBoxBooks, setCurrentBoxBooks] = useState(0)
  const [bookCounter, setBookCounter] = useState(0)
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')
  const [flagModalBook, setFlagModalBook] = useState<ScannedBook | null>(null)
  const [flagIssue, setFlagIssue] = useState('')
  const [flagRemarks, setFlagRemarks] = useState('')
  const [flagSaving, setFlagSaving] = useState(false)
  const [flagOpen, setFlagOpen] = useState(false)
  const [mismatchModalBook, setMismatchModalBook] = useState<ScannedBook | null>(null)
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [totalBooksExpected, setTotalBooksExpected] = useState('')
  const [issueIsbn, setIssueIsbn] = useState('')
  const [issueType, setIssueType] = useState<'missing'>('missing')
  const [issues, setIssues] = useState<MissingIssue[]>([])
  const [fetchingIssueBook, setFetchingIssueBook] = useState(false)
  const [conflictModalState, setConflictModalState] = useState<ConflictModalState>({ open: false, type: null, message: '' })
  const [similarLotModal, setSimilarLotModal] = useState<SimilarLotModalState>({ open: false, typedLot: '', matchedLot: '', onContinue: () => {} })
  const [ilmsMismatchModal, setIlmsMismatchModal] = useState<IlmsMismatchModalState>({ open: false, isbn: '', title: '', expectedLot: '', expectedBox: '', ilmsLot: '', ilmsBox: '', onConfirm: () => {} })
  const [lotOpen, setLotOpen] = useState(false)
  const [refreshingStats, setRefreshingStats] = useState(false)
  const [lastStatsUpdate, setLastStatsUpdate] = useState<Date | null>(null)

  const currentSessionRef = useRef<WarehouseSession | null>(null)
  const sessionActiveRef = useRef(false)
  const boxInputRef = useRef<HTMLInputElement | null>(null)

  const [draftLoaded, setDraftLoaded] = useState(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ibooktrack_demo_warehouse_draft')
      if (raw) {
        const draft = JSON.parse(raw)
        if (draft.currentSession && Array.isArray(draft.scannedBooks)) {
          setActiveLot(draft.activeLot || '')
          setSelectedBox(draft.selectedBox || '')
          setCurrentBoxNumber(draft.currentBoxNumber || '')
          setCurrentSession(draft.currentSession)
          setSessionActive(true)
          setScannedBooks(draft.scannedBooks.map((book: ScannedBook) => ({ ...book, timestamp: new Date(book.timestamp) })))
          setCurrentBoxBooks(draft.scannedBooks.length)
          setBookCounter(draft.scannedBooks.length)
          setIssues(draft.issues || [])
          setTotalBooksExpected(draft.totalBooksExpected || '')
        }
      }
    } catch { /* A malformed draft must not prevent opening the demo. */ }
    setDraftLoaded(true)
  }, [])

  useEffect(() => {
    if (!draftLoaded) return
    try {
      if (!sessionActive || !currentSession) localStorage.removeItem('ibooktrack_demo_warehouse_draft')
      else localStorage.setItem('ibooktrack_demo_warehouse_draft', JSON.stringify({
        activeLot, selectedBox, currentBoxNumber, currentSession, scannedBooks, issues, totalBooksExpected,
      }))
    } catch { setSessionError('Browser storage is unavailable. This draft cannot be saved until storage is enabled.') }
  }, [draftLoaded, sessionActive, currentSession, activeLot, selectedBox, currentBoxNumber, scannedBooks, issues, totalBooksExpected])

  useEffect(() => {
    currentSessionRef.current = currentSession
    sessionActiveRef.current = sessionActive
  }, [currentSession, sessionActive])

  return {
    activeLot, setActiveLot,
    sessionError, setSessionError, selectedBox, setSelectedBox, sessionActive, setSessionActive,
    scannedBooks, setScannedBooks, currentSession, setCurrentSession, loading, setLoading,
    isbnLoading, setIsbnLoading, currentBoxNumber, setCurrentBoxNumber, currentBoxBooks, setCurrentBoxBooks,
    bookCounter, setBookCounter, userName, setUserName, userId, setUserId, flagModalBook, setFlagModalBook, flagIssue, setFlagIssue,
    flagRemarks, setFlagRemarks, flagSaving, setFlagSaving, flagOpen, setFlagOpen, mismatchModalBook, setMismatchModalBook, confirmCompleteOpen, setConfirmCompleteOpen,
    confirmResetOpen, setConfirmResetOpen, totalBooksExpected, setTotalBooksExpected, issueIsbn, setIssueIsbn,
    issueType, setIssueType, issues, setIssues, fetchingIssueBook, setFetchingIssueBook,
    conflictModalState, setConflictModalState, similarLotModal, setSimilarLotModal,
    ilmsMismatchModal, setIlmsMismatchModal, lotOpen, setLotOpen,
    refreshingStats, setRefreshingStats, lastStatsUpdate, setLastStatsUpdate,
    currentSessionRef, sessionActiveRef, boxInputRef,
  }
}
