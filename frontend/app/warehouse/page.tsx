'use client'

import { useState, useEffect } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Barcode, CheckCircle, XCircle, AlertTriangle, Package, Search } from 'lucide-react'
import { getValidAccessToken } from '@/lib/auth-api'

interface Book {
  id?: string
  isbn: string
  title?: string
  book_type?: string
  condition?: string
  found: boolean
}

interface ScanLog {
  id: string
  isbn: string
  title?: string
  scan_status: 'accepted' | 'rejected' | 'mismatch' | 'damaged' | 'missing_info'
  rejection_reason?: string
  scanned_at: string
  assigned_box_id?: string
}

interface Session {
  id: string
  box_id: string
  box?: { box_number: string; lot?: { lot_number: string } }
  accepted_box_id?: string
  rejected_box_id?: string
  status: 'in_progress' | 'completed' | 'cancelled'
  total_scanned: number
  total_accepted: number
  total_rejected: number
  started_at: string
}

export default function WarehousePage() {
  const [sessionActive, setSessionActive] = useState(false)
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [scanInput, setScanInput] = useState('')
  const [currentBook, setCurrentBook] = useState<Book | null>(null)
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([])
  const [loading, setLoading] = useState(false)

  // Session setup
  const [boxId, setBoxId] = useState('')
  const [acceptedBoxNumber, setAcceptedBoxNumber] = useState('')
  const [rejectedBoxNumber, setRejectedBoxNumber] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  const startSession = async () => {
    if (!boxId || !acceptedBoxNumber || !rejectedBoxNumber) {
      alert('Please fill in all box information')
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
          box_id: boxId,
          accepted_box_number: acceptedBoxNumber,
          rejected_box_number: rejectedBoxNumber
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to start session')

      setCurrentSession(data.session)
      setSessionActive(true)
      setScanLogs([])
    } catch (error) {
      console.error('Start session error:', error)
      alert(error instanceof Error ? error.message : 'Failed to start session')
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scanInput.trim() && currentSession) {
      const isbn = scanInput.trim()
      setLoading(true)

      try {
        const token = await getValidAccessToken()
        if (!token) {
          throw new Error('Authentication required. Please log in again.')
        }
        
        // First, scan to get book details
        const bookResponse = await fetch(`${API_URL}/api/books/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ isbn })
        })

        const bookData = await bookResponse.json()
        
        setCurrentBook({
          ...bookData.book,
          isbn,
          found: bookData.found
        })

        setScanInput('')
      } catch (error) {
        console.error('Scan error:', error)
        alert('Failed to scan book')
      } finally {
        setLoading(false)
      }
    }
  }

  const processBook = async (status: 'accepted' | 'rejected' | 'mismatch' | 'damaged' | 'missing_info', reason?: string) => {
    if (!currentBook || !currentSession) return

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
          isbn: currentBook.isbn,
          scan_status: status,
          rejection_reason: reason
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to process book')

      // Add to scan logs
      setScanLogs(prev => [data.scanLog, ...prev])

      // Update session counts
      setCurrentSession(prev => prev ? {
        ...prev,
        total_scanned: prev.total_scanned + 1,
        total_accepted: status === 'accepted' ? prev.total_accepted + 1 : prev.total_accepted,
        total_rejected: status !== 'accepted' ? prev.total_rejected + 1 : prev.total_rejected
      } : null)

      // Clear current book
      setCurrentBook(null)
    } catch (error) {
      console.error('Process book error:', error)
      alert(error instanceof Error ? error.message : 'Failed to process book')
    } finally {
      setLoading(false)
    }
  }

  const completeSession = async () => {
    if (!currentSession) return

    setLoading(true)
    try {
      const token = await getValidAccessToken()
      if (!token) {
        throw new Error('Authentication required. Please log in again.')
      }

      const response = await fetch(`${API_URL}/api/warehouse/sessions/${currentSession.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to complete session')

      alert('Session completed successfully!')
      setSessionActive(false)
      setCurrentSession(null)
      setScanLogs([])
      setBoxId('')
      setAcceptedBoxNumber('')
      setRejectedBoxNumber('')
    } catch (error) {
      console.error('Complete session error:', error)
      alert(error instanceof Error ? error.message : 'Failed to complete session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-6 p-6 lg:p-8">
          {/* Header */}
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Warehouse Station</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Receive boxes, scan books, and segregate into accepted/rejected boxes
            </p>
          </header>

          {!sessionActive ? (
            /* Session Setup */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Start Receiving Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Received Box ID</label>
                  <Input
                    value={boxId}
                    onChange={(e) => setBoxId(e.target.value)}
                    placeholder="Enter box ID from database"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The box you're receiving and will scan books from
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Accepted Books Box Number</label>
                  <Input
                    value={acceptedBoxNumber}
                    onChange={(e) => setAcceptedBoxNumber(e.target.value)}
                    placeholder="e.g., BOX-ACCEPT-001"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    New box for books that pass inspection
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Rejected Books Box Number</label>
                  <Input
                    value={rejectedBoxNumber}
                    onChange={(e) => setRejectedBoxNumber(e.target.value)}
                    placeholder="e.g., BOX-REJECT-001"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    New box for rejected/damaged/mismatch books
                  </p>
                </div>

                <Button onClick={startSession} disabled={loading} className="w-full">
                  {loading ? 'Starting...' : 'Start Session'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Active Session Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{currentSession?.total_scanned || 0}</div>
                    <p className="text-xs text-muted-foreground">Total Scanned</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{currentSession?.total_accepted || 0}</div>
                    <p className="text-xs text-muted-foreground">Accepted</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">{currentSession?.total_rejected || 0}</div>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <Button onClick={completeSession} variant="outline" className="w-full" disabled={loading}>
                      Complete Session
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Scanner Input */}
              <Card className="border-2 border-blue-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Barcode className="h-5 w-5 text-blue-600" />
                    Scan ISBN / Barcode
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={handleScan}
                    placeholder="Scan or enter ISBN and press Enter..."
                    className="text-lg py-6"
                    autoFocus
                    disabled={loading || !!currentBook}
                  />
                </CardContent>
              </Card>

              {/* Current Book Details & Actions */}
              {currentBook && (
                <Card className="border-2 border-orange-500">
                  <CardHeader>
                    <CardTitle>Book Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentBook.found ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase">ISBN</p>
                            <p className="text-lg font-mono">{currentBook.isbn}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase">Book Type</p>
                            <Badge variant={currentBook.book_type === 'Mustang' ? 'default' : 'secondary'}>
                              {currentBook.book_type}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase">Title</p>
                          <p className="text-lg font-semibold">{currentBook.title}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase">Condition</p>
                          <p className="text-sm">{currentBook.condition}</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                        <p className="font-semibold">Book Not Found in Database</p>
                        <p className="text-sm text-muted-foreground">ISBN: {currentBook.isbn}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                      <Button
                        onClick={() => processBook('accepted')}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={loading}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => {
                          const reason = prompt('Rejection reason:')
                          if (reason) processBook('rejected', reason)
                        }}
                        variant="destructive"
                        disabled={loading}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => {
                          const reason = prompt('Mismatch details:')
                          if (reason) processBook('mismatch', reason)
                        }}
                        variant="outline"
                        disabled={loading}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Mismatch
                      </Button>
                      <Button
                        onClick={() => {
                          const reason = prompt('Damage description:')
                          if (reason) processBook('damaged', reason)
                        }}
                        variant="outline"
                        disabled={loading}
                      >
                        Damaged
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Scan History */}
              <Card>
                <CardHeader>
                  <CardTitle>Scan History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {scanLogs.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No books scanned yet</p>
                    ) : (
                      scanLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-mono text-sm">{log.isbn}</p>
                            <p className="text-xs text-muted-foreground">{log.title || 'Unknown Title'}</p>
                          </div>
                          <Badge
                            variant={log.scan_status === 'accepted' ? 'default' : 'destructive'}
                            className={log.scan_status === 'accepted' ? 'bg-green-600' : ''}
                          >
                            {log.scan_status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
