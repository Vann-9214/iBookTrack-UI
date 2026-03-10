'use client'

import { useState } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { SessionControl } from '@/components/session-control'
import { ScannerInput } from '@/components/scanner-input'
import { BookInfoCard } from '@/components/book-info-card'
import { ActionButtons } from '@/components/action-buttons'
import { SessionLog } from '@/components/session-log'

interface ScannedBook {
  id: string
  isbn: string
  title: string
  language: string
  expectedBox: number
  status: 'pass' | 'reject' | 'mismatch' | 'wrong-lot' | 'already-scanned'
  timestamp: Date
}

export default function WarehouseInventoryPage() {
  const [activeLot, setActiveLot] = useState('Lot-33')
  const [currentBox, setCurrentBox] = useState(1)
  const [sessionActive, setSessionActive] = useState(false)
  const [scannedBooks, setScannedBooks] = useState<ScannedBook[]>([])
  const [currentScan, setCurrentScan] = useState<any>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<ScannedBook['status'] | null>(null)

  const handleNewSession = () => {
    setSessionActive(true)
    setScannedBooks([])
    setCurrentScan(null)
    setCurrentBox(1)
  }

  const handleCloseSession = () => {
    setSessionActive(false)
    setScannedBooks([])
    setCurrentScan(null)
  }

  const handleIncrementBox = () => {
    setCurrentBox(prev => prev + 1)
  }

  const handleDecrementBox = () => {
    setCurrentBox(prev => Math.max(1, prev - 1))
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

  const handleScan = (isbn: string) => {
    // Simulate book info lookup
    const bookData = {
      isbn,
      title: `Book Title for ${isbn}`,
      language: Math.random() > 0.5 ? 'Mustang' : 'Jaguar',
      expectedBox: Math.floor(Math.random() * 10) + 1,
    }
    setCurrentScan(bookData)
  }

  const handleAction = (status: ScannedBook['status']) => {
    if (!currentScan) return

    const newBook: ScannedBook = {
      id: Math.random().toString(),
      isbn: currentScan.isbn,
      title: currentScan.title,
      language: currentScan.language,
      expectedBox: currentScan.expectedBox,
      status,
      timestamp: new Date(),
    }

    setScannedBooks([newBook, ...scannedBooks])
    setCurrentScan(null)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Warehouse & Inventory Checking
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time book scanning and verification
            </p>
          </div>

          {/* Session Control */}
          <SessionControl
            activeLot={activeLot}
            sessionActive={sessionActive}
            onNewSession={handleNewSession}
            onCloseSession={handleCloseSession}
          />

          {sessionActive && (
            <>
              {/* Session Header */}
              <div className="bg-white border-2 border-gray-300 rounded-lg p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Current Session</p>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {activeLot} B{String(currentBox).padStart(3, '0')}
                    </h2>
                  </div>
                  <div className="flex gap-3">
                    <select
                      value={activeLot}
                      onChange={(e) => setActiveLot(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-gray-50 border-2 border-gray-300 text-gray-900 text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                      <option>Lot-33</option>
                      <option>Lot-34</option>
                      <option>Lot-35</option>
                      <option>Lot-36</option>
                    </select>
                    <button
                      onClick={handleDecrementBox}
                      disabled={currentBox <= 1}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous Box
                    </button>
                    <button
                      onClick={handleIncrementBox}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Increment Box
                    </button>
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
