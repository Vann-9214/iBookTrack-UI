'use client'

import { useState, useEffect } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { SessionControl } from '@/components/session-control'
import { ScannerInput } from '@/components/scanner-input'
import { BookInfoCard } from '@/components/book-info-card'
import { ActionButtons } from '@/components/action-buttons'
import { SessionLog } from '@/components/session-log'
import { useToast } from '@/hooks/use-toast'
import { getValidAccessToken } from '@/lib/auth-api'
import { Button } from '@/components/ui/button'

interface ScannedBook {
  id: string
  isbn: string
  title: string
  language: string
  expectedBox: number
  status: 'pass' | 'reject' | 'mismatch' | 'wrong-lot' | 'already-scanned'
  timestamp: Date
  scan_status?: string
  rejection_reason?: string
}

interface WarehouseSession {
  id: string
  box_id: string
  accepted_box_id: string | null
  rejected_box_id: string | null
  status: string
  total_scanned: number
  total_accepted: number
  total_rejected: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function WarehouseInventoryPage() {
  const [activeLot, setActiveLot] = useState('Lot 1')
  const [currentBox, setCurrentBox] = useState(1)
  const [sessionActive, setSessionActive] = useState(false)
  const [scannedBooks, setScannedBooks] = useState<ScannedBook[]>([])
  const [currentScan, setCurrentScan] = useState<any>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<ScannedBook['status'] | null>(null)
  const [currentSession, setCurrentSession] = useState<WarehouseSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [boxId, setBoxId] = useState('')
  const [currentAcceptedBoxId, setCurrentAcceptedBoxId] = useState<string | null>(null)
  const [currentRejectedBoxId, setCurrentRejectedBoxId] = useState<string | null>(null)
  const [currentAcceptedBoxNumber, setCurrentAcceptedBoxNumber] = useState('')
  const [currentRejectedBoxNumber, setCurrentRejectedBoxNumber] = useState('')
  const [currentBoxBooks, setCurrentBoxBooks] = useState(0) // Books in current active box
  const [activeBoxType, setActiveBoxType] = useState<'accepted' | 'rejected'>('accepted') // Which box we're scanning into
  const { toast } = useToast()

  // Generate static lots 1-50
  const lots = Array.from({ length: 50 }, (_, i) => `Lot ${i + 1}`)

  const handleNewSession = async () => {
    if (!activeLot) {
      alert('Please select a lot first')
      return
    }

    setLoading(true)
    try {
      const token = await getValidAccessToken()
      if (!token) {
        throw new Error('Authentication required. Please log in again.')
      }

      const response = await fetch(`${API_URL}/api/warehouse/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lot_number: activeLot
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to start session')

      setCurrentSession(data.session)
      setBoxId('') // No box yet - will be created on first scan
      setSessionActive(true)
      setScannedBooks([])
      setCurrentScan(null)
      setCurrentBox(1)

      toast({
        title: 'Session Started',
        description: data.message || `Session started for ${data.lot_number}. Boxes will be created as you scan.`,
      })
    } catch (error) {
      console.error('Failed to start session:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start session',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCloseSession = async () => {
    if (!currentSession) return

    const confirm = window.confirm('Are you sure you want to complete this session?')
    if (!confirm) return

    setLoading(true)
    try {
      const token = await getValidAccessToken()
      if (!token) {
        throw new Error('Authentication required. Please log in again.')
      }

      await fetch(`${API_URL}/api/warehouse/sessions/${currentSession.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      setSessionActive(false)
      setScannedBooks([])
      setCurrentScan(null)
      setCurrentSession(null)
      toast({
        title: 'Session Closed',
        description: 'Session closed successfully',
      })
    } catch (error) {
      console.error('Failed to complete session:', error)
      alert('Failed to complete session')
    } finally {
      setLoading(false)
    }
  }

  const handleIncrementBox = () => {
    setCurrentBox(prev => prev + 1)
  }

  const handleDecrementBox = () => {
    setCurrentBox(prev => Math.max(1, prev - 1))
  }

  const handleSealBox = async (boxType: 'accepted' | 'rejected') => {
    const boxId = boxType === 'accepted' ? currentAcceptedBoxId : currentRejectedBoxId
    if (!boxId) {
      toast({
        title: 'No Box to Seal',
        description: `No ${boxType} box is currently active`,
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const token = await getValidAccessToken()
      if (!token) {
        throw new Error('Authentication required. Please log in again.')
      }

      const response = await fetch(`${API_URL}/api/warehouse/boxes/${boxId}/seal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to seal box')

      toast({
        title: 'Box Sealed',
        description: data.message,
      })

      // Clear the box ID so next scan creates new box
      if (boxType === 'accepted') {
        setCurrentAcceptedBoxId(null)
        setCurrentAcceptedBoxNumber('')
      } else {
        setCurrentRejectedBoxId(null)
        setCurrentRejectedBoxNumber('')
      }
      setCurrentBoxBooks(0) // Reset counter
    } catch (error) {
      console.error('Failed to seal box:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to seal box',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditScan = (id: string, status: ScannedBook['status']) => {
    setEditingId(id)
    setEditStatus(status)
  }

  const handleConfirmEdit = (id: string) => {
    if (editStatus) {
      setScannedBooks(prev =>
        prev.map(book =>
          book.id === id ? { ...book, status: editStatus } : book
        )
      )
      setEditingId(null)
      setEditStatus(null)
    }
  }

  const handleScan = async (isbn: string) => {
    if (!currentSession) return

    // Since book API is not available yet, just use the ISBN
    // Book details will be filled in later when API is ready
    setCurrentScan({
      isbn,
      title: `ISBN: ${isbn}`,
      language: 'To be determined',
      expectedBox: currentBox,
      found: false
    })
  }

  const handleAction = async (status: ScannedBook['status']) => {
    if (!currentScan || !currentSession) return

    // Map UI status to backend scan_status
    const statusMap: Record<string, string> = {
      'pass': 'accepted',
      'reject': 'rejected',
      'mismatch': 'mismatch',
      'wrong-lot': 'damaged',
      'already-scanned': 'rejected'
    }

    const scanStatus = statusMap[status] || 'rejected'

    setLoading(true)
    try {
      const token = await getValidAccessToken()
      if (!token) {
        throw new Error('Authentication required. Please log in again.')
      }

      const response = await fetch(`${API_URL}/api/warehouse/sessions/${currentSession.id}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isbn: currentScan.isbn,
          scan_status: scanStatus,
          rejection_reason: status === 'reject' ? 'Rejected by warehouse staff' : null
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to process book')

      // Update box ID if we got a new box
      if (data.currentBox) {
        const isNewBox = (status === 'pass' && data.currentBox.box_number !== currentAcceptedBoxNumber) ||
                         (status !== 'pass' && data.currentBox.box_number !== currentRejectedBoxNumber)
        
        // Track current box IDs and numbers
        if (status === 'pass') {
          setCurrentAcceptedBoxId(data.scanLog.assigned_box_id)
          if (isNewBox) {
            setCurrentAcceptedBoxNumber(data.currentBox.box_number)
            setCurrentBoxBooks(1) // Reset counter for new box
          } else {
            setCurrentBoxBooks(prev => prev + 1) // Increment for same box
          }
          setActiveBoxType('accepted')
          setBoxId(data.currentBox.box_number)
        } else {
          setCurrentRejectedBoxId(data.scanLog.assigned_box_id)
          if (isNewBox) {
            setCurrentRejectedBoxNumber(data.currentBox.box_number)
            setCurrentBoxBooks(1) // Reset counter for new box
          } else {
            setCurrentBoxBooks(prev => prev + 1) // Increment for same box
          }
          setActiveBoxType('rejected')
          setBoxId(data.currentBox.box_number)
        }
      }

      const newBook: ScannedBook = {
        id: data.scanLog.id,
        isbn: currentScan.isbn,
        title: currentScan.title,
        language: currentScan.language,
        expectedBox: currentScan.expectedBox,
        status,
        timestamp: new Date(data.scanLog.scanned_at),
        scan_status: data.scanLog.scan_status,
        rejection_reason: data.scanLog.rejection_reason
      }

      setScannedBooks([newBook, ...scannedBooks])
      
      // Update session stats
      setCurrentSession(prev => prev ? {
        ...prev,
        total_scanned: prev.total_scanned + 1,
        total_accepted: status === 'pass' ? prev.total_accepted + 1 : prev.total_accepted,
        total_rejected: status !== 'pass' ? prev.total_rejected + 1 : prev.total_rejected
      } : null)
      
      setCurrentScan(null)
    } catch (error) {
      console.error('Failed to process book:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to scan book',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-6 p-6 lg:p-8">
          {/* Header */}
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Warehouse & Inventory
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time book scanning and verification
            </p>
          </header>

          {/* Session Control */}
          <SessionControl
            activeLot={activeLot}
            sessionActive={sessionActive}
            onNewSession={handleNewSession}
            onCloseSession={handleCloseSession}
            lots={lots}
            onLotChange={setActiveLot}
          />

          {sessionActive && (
            <>
              {/* Session Header */}
              <div className="bg-white border-2 border-gray-300 rounded-lg p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Current Box</p>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {boxId || 'No box yet'}
                    </h2>
                    <p className="text-sm text-blue-600 font-medium mt-1">
                      📦 {currentBoxBooks} books in this box
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Scanning Into</p>
                      <select
                        value={activeBoxType}
                        onChange={(e) => {
                          const newType = e.target.value as 'accepted' | 'rejected'
                          setActiveBoxType(newType)
                          const newBoxNumber = newType === 'accepted' ? currentAcceptedBoxNumber : currentRejectedBoxNumber
                          const newBoxId = newType === 'accepted' ? currentAcceptedBoxId : currentRejectedBoxId
                          if (newBoxNumber) {
                            setBoxId(newBoxNumber)
                            // Get book count for this box from backend
                            setCurrentBoxBooks(0) // Will be updated on next scan
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-gray-50 border-2 border-gray-300 text-gray-900 text-sm font-medium"
                        disabled={!currentAcceptedBoxId && !currentRejectedBoxId}
                      >
                        <option value="accepted">✓ Accepted Box {currentAcceptedBoxNumber && `(${currentAcceptedBoxNumber})`}</option>
                        <option value="rejected">✗ Rejected Box {currentRejectedBoxNumber && `(${currentRejectedBoxNumber})`}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scanner Input */}
              <ScannerInput onScan={handleScan} />

              {/* Book Info Card */}
              {currentScan && (
                <BookInfoCard book={currentScan} />
              )}

              {/* Action Buttons */}
              <ActionButtons onAction={handleAction} disabled={!currentScan} />

              {/* Box Management Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleSealBox('accepted')}
                  disabled={!currentAcceptedBoxId || loading}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✓ Accepted Box Full
                </button>
                <button
                  onClick={() => handleSealBox('rejected')}
                  disabled={!currentRejectedBoxId || loading}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✗ Rejected Box Full
                </button>
              </div>

              {/* Session Stats */}
              {currentSession && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-medium">Total Scanned</p>
                    <p className="text-2xl font-bold text-blue-900">{currentSession.total_scanned}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">Accepted</p>
                    <p className="text-2xl font-bold text-green-900">{currentSession.total_accepted}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600 font-medium">Rejected</p>
                    <p className="text-2xl font-bold text-red-900">{currentSession.total_rejected}</p>
                  </div>
                </div>
              )}

              {/* Session Log with Edit Feature */}
              <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Scans</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {scannedBooks.slice(0, 10).map((book) => (
                    <div
                      key={book.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{book.isbn}</p>
                        <p className="text-xs text-gray-600">{book.title}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          book.status === 'pass' ? 'bg-green-100 text-green-700' :
                          book.status === 'reject' ? 'bg-red-100 text-red-700' :
                          book.status === 'mismatch' ? 'bg-yellow-100 text-yellow-700' :
                          book.status === 'already-scanned' ? 'bg-gray-100 text-gray-600' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {book.status.replace('-', ' ').toUpperCase()}
                        </span>
                        {book.status === 'mismatch' && (
                          <div className="flex gap-2">
                            {editingId === book.id ? (
                              <>
                                <select
                                  value={editStatus || ''}
                                  onChange={(e) => setEditStatus(e.target.value as ScannedBook['status'])}
                                  className="px-2 py-1 rounded text-xs bg-input border border-border"
                                >
                                  <option value="reject">Reject</option>
                                  <option value="pass">Pass</option>
                                  <option value="already-scanned">Already Done</option>
                                  <option value="wrong-lot">Wrong Lot</option>
                                </select>
                                <button
                                  onClick={() => handleConfirmEdit(book.id)}
                                  className="px-2 py-1 bg-success/20 text-success rounded text-xs font-medium hover:bg-success/30"
                                >
                                  ✓
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleEditScan(book.id, book.status)}
                                className="px-2 py-1 text-primary hover:bg-primary/10 rounded transition-colors"
                                title="Edit"
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!sessionActive && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No active session. Click "New Excel Entry" to start scanning.
              </p>
            </div>
          )}
        </div>
      </main>

    </div>
  )
}
