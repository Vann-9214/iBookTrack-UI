'use client'

import { useToast } from '@/hooks/use-toast'
import { useBrand } from '@/hooks/use-brand'
import { bulkSaveSession, deleteSession, startWarehouseSession, type StartSessionError, fetchLots } from '../services/warehouse.service'
import { findSimilarLot } from '../utils/warehouse.helpers'
import type { useWarehouseState } from './useWarehouseState'

export function useWarehouseSession(core: ReturnType<typeof useWarehouseState>) {
  const { toast } = useToast()
  const { brand } = useBrand()
  const {
    activeLot, setActiveLot, lots, selectedBox, setSelectedBox, sessionActive, setSessionActive,
    setCurrentSession, loading, setLoading, currentBoxNumber, setCurrentBoxNumber,
    setCurrentBoxBooks, setBookCounter, setScannedBooks, scannedBooks,
    currentSession, issues, setIssues, totalBooksExpected, setTotalBooksExpected,
    setIssueIsbn, setIssueType, setConfirmCompleteOpen, setConfirmResetOpen, setSessionError, setConflictModalState,
    setSimilarLotModal, setLots
  } = core

  const clearSession = () => {
    setSessionActive(false)
    setScannedBooks([])
    setBookCounter(0)
    setCurrentSession(null)
    setSelectedBox('')
    setCurrentBoxNumber('')
    setCurrentBoxBooks(0)
    setActiveLot('')
  }

  const handleNewSession = async (force = false, skipSimilarLotCheck = false) => {
    setSessionError(null)
    setLoading(true)
    const formattedLot = activeLot.trim()
    if (!formattedLot) { setSessionError('Please select a lot first'); setLoading(false); return }
    if (!skipSimilarLotCheck) {
      const matchedLot = findSimilarLot(formattedLot, lots)
      if (matchedLot && matchedLot !== formattedLot) {
        setLoading(false)
        setSimilarLotModal({ open: true, typedLot: formattedLot, matchedLot, onContinue: () => handleNewSession(force, true) })
        return
      }
    }
    if (!selectedBox) { setSessionError('Please select a box first'); setLoading(false); return }
    try {
      // Creates a real 'in_progress' session in the database, which locks this
      // lot/box combination for every other user until completed or cancelled.
      const result = await startWarehouseSession(formattedLot, selectedBox, brand, force)
      setCurrentSession({
        id: result.session.id,
        status: result.session.status,
        type: brand,
        total_scanned_books: 0,
        total_processable: 0,
        total_non_processable: 0,
        box_id: result.session.box_id ?? null,
      })
    } catch (err: any) {
      const e = err as StartSessionError
      if (e.status === 403) {
        setSessionError(e.message || '🔒 This box is currently being processed by another user.')
      } else if (e.status === 409 && e.code === 'BoxExistsWithZeroBooks') {
        setConflictModalState({ open: true, type: 'zero_books', message: e.message })
      } else if (e.status === 409) {
        setSessionError(e.message || `Box ${selectedBox} already exists. Please use a different box number.`)
      } else {
        setSessionError(e.message || 'Failed to start session.')
      }
      setLoading(false)
      return
    }
    setSessionActive(true)
    setScannedBooks([])
    setBookCounter(0)
    setCurrentBoxNumber(selectedBox)
    setCurrentBoxBooks(0)
    setLoading(false)
    toast({ title: 'Session Started', description: 'Session locked to you. Books will be saved to the database upon completion.' })
  }

  const handleCloseSession = async () => {
    if (!currentSession) return
    if (scannedBooks.length === 0) { setSessionError('Please scan at least one book before completing the session.'); return }
    setTotalBooksExpected('')
    setIssueIsbn('')
    setIssueType('missing')
    setIssues([])
    setConfirmCompleteOpen(true)
  }

  const confirmCloseSession = async (skipSimilarLotCheck = false) => {
    if (!currentSession || loading) return
    if (!skipSimilarLotCheck) {
      const matchedLot = findSimilarLot(activeLot, lots)
      if (matchedLot && matchedLot !== activeLot) {
        setSimilarLotModal({ open: true, typedLot: activeLot, matchedLot, onContinue: () => confirmCloseSession(true) })
        return
      }
    }
    if (!totalBooksExpected.trim()) { setSessionError('Please enter the total books expected.'); return }
    const expected = parseInt(totalBooksExpected)
    if (isNaN(expected)) { setSessionError('Total books expected must be a valid number.'); return }
    const missingCount = issues.filter((i) => i.type === 'missing').length
    const extraCount = scannedBooks.filter((b) => b.flag_issue === 'extra-book').length
    const validScannedCount = scannedBooks.length - extraCount
    const calculatedExpected = validScannedCount + missingCount
    if (expected !== calculatedExpected) {
      const deductionNotes = extraCount > 0 ? [`${extraCount} extra`] : []
      const deductionStr = deductionNotes.length > 0 ? ` (Note: ${deductionNotes.join(' and ')} books were ignored from your physical scans)` : ''
      setSessionError(`Total expected books (${expected}) does not match valid scanned (${validScannedCount}) + missing (${missingCount}) books.${deductionStr}`)
      return
    }
    setConfirmCompleteOpen(false)
    setLoading(true)
    try {
      await bulkSaveSession({
        lot_number: activeLot,
        box_number: currentBoxNumber,
        session_id: currentSession.id.startsWith('pending') ? undefined : currentSession.id,
        type: currentSession.type,
        force: true,
        total_expected_books: expected,
        issues,
        scanned_books: scannedBooks,
        book_type: brand,
      })
      clearSession()
      setTotalBooksExpected('')
      setIssueIsbn('')
      setIssues([])
      toast({ title: 'Session Closed', description: 'Session closed successfully.' })
      try {
        const updatedLots = await fetchLots()
        setLots(updatedLots)
      } catch (err) {
        console.error('Failed to refresh lots:', err)
      }
    } catch (error: any) {
      setSessionError(error.message || 'Failed to complete session')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSession = () => { if (currentSession) setConfirmResetOpen(true) }

  const confirmResetSession = async () => {
    if (!currentSession) return
    try {
      if (!currentSession.id.startsWith('pending')) await deleteSession(currentSession.id)
      clearSession()
      setConfirmResetOpen(false)
      toast({ title: 'Session Cancelled', description: 'Session has been cancelled and removed from the database.' })
    } catch (e) {
      console.error('Failed to delete session', e)
      setSessionError('Failed to reset session.')
    }
  }

  return {
    clearSession,
    handleNewSession, handleCloseSession, confirmCloseSession,
    handleResetSession, confirmResetSession,
  }
}
