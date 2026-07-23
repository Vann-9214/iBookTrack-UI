'use client'

import { useToast } from '@/hooks/use-toast'
import { useBrand } from '@/hooks/use-brand'
import { bulkSaveSession, checkBoxExists, deleteSession } from '../services/warehouse.service'
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
    setIssueIsbn, setIssueType, setConfirmCompleteOpen, setConfirmResetOpen,
    setSessionError, setConflictModalState, setSimilarLotModal,
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
    if (!formattedLot.toLowerCase().startsWith('lot')) { setSessionError("The Lot Number must start with the word 'Lot' (e.g. Lot-109)."); setLoading(false); return }
    if (!selectedBox) { setSessionError('Please select a box first'); setLoading(false); return }
    if (!selectedBox.includes('/')) { setSessionError("The Box Number must contain a '/' (e.g. 181/264)."); setLoading(false); return }
    const [currentBox, totalBoxes] = selectedBox.split('/')
    const currentNum = parseInt(currentBox, 10)
    const totalNum = parseInt(totalBoxes, 10)
    if (isNaN(currentNum) || isNaN(totalNum) || currentNum > totalNum) { setSessionError('The total boxes (right side) must be greater than or equal to the current box (left side). Example: 12/400.'); setLoading(false); return }
    try {
      const exists = await checkBoxExists(formattedLot, selectedBox, brand)
      if (exists) { setSessionError(`Box ${selectedBox} already exists in ${formattedLot.toLowerCase().startsWith('lot') ? formattedLot : `Lot ${formattedLot}`}. Please use a different box number.`); setLoading(false); return }
    } catch (err: any) { setSessionError(err.message || 'Failed to verify box number.'); setLoading(false); return }
    setCurrentSession({ id: `pending-${Date.now()}`, status: 'completed', type: brand, total_scanned_books: 0, total_processable: 0, total_non_processable: 0 })
    setSessionActive(true)
    setScannedBooks([])
    setBookCounter(0)
    setCurrentBoxNumber(selectedBox)
    setCurrentBoxBooks(0)
    setLoading(false)
    toast({ title: 'Session Started', description: 'Local session created. Lot will be saved to database upon completion.' })
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
    } catch (error: any) {
      setSessionError(error.message || 'Failed to complete session')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSession = () => { if (currentSession) setConfirmResetOpen(true) }

  const confirmResetSession = async () => {
    if (!currentSession) return
    setConfirmResetOpen(false)
    try {
      if (!currentSession.id.startsWith('pending')) await deleteSession(currentSession.id)
    } catch (e) { console.error('Failed to delete session', e) }
    clearSession()
    toast({ title: 'Session Cancelled', description: 'Session has been cancelled and removed from the database.' })
  }

  return {
    handleNewSession, handleCloseSession, confirmCloseSession,
    handleResetSession, confirmResetSession,
  }
}
