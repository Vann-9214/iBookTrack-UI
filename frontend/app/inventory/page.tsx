'use client'

import { useState, useEffect, useRef } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { X, Printer, Barcode } from 'lucide-react'
import bwipjs from 'bwip-js'

interface BookDetail {
  isbn: string
  title: string
  description: string
  datePurchased: string
  dateCatalogued: string
  lot: string
  boxNum: string
  type: 'Mustang' | 'Jaguar'
  publisher: string
  language: string
  pageCount: number
  condition: string
  shipment: string
  projectName: string
}

interface LogEntry {
  id: string
  isbn: string
  title: string
  scannedAt: string
  printed: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function InventoryPage() {
  const [scanInput, setScanInput] = useState('')
  const [selectedBook, setSelectedBook] = useState<BookDetail | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch scan history on component mount
  useEffect(() => {
    fetchScanHistory()
  }, [])

  const fetchScanHistory = async () => {
    try {
      // Fetch recent scans from warehouse sessions
      const response = await fetch(`${API_URL}/api/warehouse/scans/recent?limit=50`)
      const data = await response.json()
      
      if (data.success && data.scans) {
        const formattedLogs: LogEntry[] = data.scans.map((scan: any) => ({
          id: scan.id,
          isbn: scan.isbn,
          title: scan.title || `ISBN: ${scan.isbn}`,
          scannedAt: new Date(scan.scanned_at).toLocaleString(),
          printed: false // Track if printed in this session
        }))
        setLogs(formattedLogs)
      }
    } catch (error) {
      console.error('Failed to fetch scan history:', error)
    }
  }

  const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const isbn = scanInput.trim()
      if (!isbn) return

      setLoading(true)
      try {
        // Fetch book details from iLMS API
        const response = await fetch(`${API_URL}/api/books/ilms/search/${isbn}`)
        const data = await response.json()

        if (data.success && data.data && !data.data.Message) {
          // Book found in iLMS system
          const bookDetail: BookDetail = {
            isbn: data.data.ISBN || isbn,
            title: data.data.Title || `ISBN: ${isbn}`,
            description: data.data.Description || 'N/A',
            datePurchased: data.data.PurchaseApproval || 'N/A',
            dateCatalogued: data.data.uploadFileDate || 'N/A',
            lot: data.data.LotNo || 'N/A',
            boxNum: data.data.BoxNo || 'N/A',
            type: 'Mustang', // Default type
            publisher: data.data.PublisherName || 'N/A',
            language: data.data.LanguageofBook || 'Unknown',
            pageCount: parseInt(data.data.EstimatedNumberofpages) || 0,
            condition: data.data.Condition || 'N/A',
            shipment: 'N/A',
            projectName: 'iLMS Import'
          }
          setSelectedBook(bookDetail)
          setShowModal(true)
        } else {
          alert('Book not found in iLMS system')
        }
      } catch (error) {
        console.error('Error fetching book:', error)
        alert('Failed to fetch book details')
      } finally {
        setLoading(false)
      }
      setScanInput('')
    }
  }

  const handlePrint = () => {
    if (!selectedBook) return
    
    window.print()
    
    // Mark as printed in current session
    const newLog: LogEntry = {
      id: Date.now().toString(),
      isbn: selectedBook.isbn,
      title: selectedBook.title,
      scannedAt: new Date().toLocaleString(),
      printed: true,
    }
    setLogs([newLog, ...logs])
    setShowModal(false)
    
    // Refresh scan history to get latest from database
    fetchScanHistory()
  }

  const handleClose = () => {
    setShowModal(false)
    setScanInput('')
  }

  // Barcode canvas ref
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null)

  // Generate barcode when book is selected
  useEffect(() => {
    // Only run in browser (not during SSR)
    if (typeof window === 'undefined') return
    
    if (selectedBook && barcodeCanvasRef.current) {
      try {
        // Clean ISBN - remove dashes
        const cleanISBN = selectedBook.isbn.replace(/-/g, '')
        
        bwipjs.toCanvas(barcodeCanvasRef.current, {
          bcid: 'code128',       // More flexible than EAN-13
          text: cleanISBN,
          scale: 2,
          height: 10,
          includetext: true,
          textxalign: 'center',
        })
      } catch (e) {
        console.error('Barcode generation error:', e)
        // If barcode fails, clear canvas
        const ctx = barcodeCanvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, barcodeCanvasRef.current.width, barcodeCanvasRef.current.height)
        }
      }
    }
  }, [selectedBook])

  return (
    <>
      {/* Print Slip Template - Hidden on screen, visible when printing */}
      {selectedBook && (
        <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* EAN-13 Barcode at Top Center */}
            <div className="flex justify-center mb-8">
              <canvas ref={barcodeCanvasRef} className="mx-auto"></canvas>
            </div>

            {/* Print Slip Content */}
            <div className="border-2 border-black p-6 space-y-4">
              <h1 className="text-3xl font-bold text-center mb-6 border-b-2 border-black pb-4">BOOK SLIP</h1>
              
              <div className="grid grid-cols-2 gap-6 text-lg">
                <div>
                  <p className="font-semibold text-gray-600">ISBN:</p>
                  <p className="font-mono text-xl font-bold">{selectedBook.isbn}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-600">Date:</p>
                  <p className="font-bold">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 text-lg">
                <div>
                  <p className="font-semibold text-gray-600">Project Name:</p>
                  <p className="font-bold">{selectedBook.projectName}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-600">Book Type:</p>
                  <p className={`font-bold ${selectedBook.type === 'Mustang' ? 'text-blue-600' : 'text-purple-600'}`}>
                    {selectedBook.type}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 text-lg">
                <div>
                  <p className="font-semibold text-gray-600">Shipment:</p>
                  <p className="font-bold">{selectedBook.shipment}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-600">Box #:</p>
                  <p className="font-bold">{selectedBook.boxNum}</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-300">
                <p className="font-semibold text-gray-600">Title:</p>
                <p className="font-bold text-xl">{selectedBook.title}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-300">
                <p className="font-semibold text-gray-600">Barcode:</p>
                <p className="font-mono text-lg font-bold">{selectedBook.isbn}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Application UI */}
      <div className="flex min-h-screen bg-white print:hidden">
        <DashboardSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-6 p-6 lg:p-8">
          {/* Header */}
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory Gate</h1>
            <p className="text-sm text-muted-foreground mt-1">Scan books to view details and print slips</p>
          </header>

          {/* Scanner Input - Simple and Prominent */}
          <div className="bg-white border-2 border-blue-600 rounded-lg p-8 shadow-sm">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Barcode className="h-5 w-5 text-blue-600" />
                Scan ISBN / Barcode
              </label>
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleScan}
                placeholder="Scan or enter ISBN and press Enter..."
                className="w-full px-6 py-4 text-lg bg-white border-2 border-blue-600 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-600"
                autoFocus
              />
              <p className="text-xs text-gray-600 mt-2">Press Enter after scanning to retrieve book details</p>
            </div>
          </div>

          {/* Modal Popup */}
          {showModal && selectedBook && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white border border-gray-300 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto shadow-xl">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-300 sticky top-0 bg-white">
                  <h2 className="text-2xl font-bold text-gray-900">Book Details</h2>
                  <button
                    onClick={handleClose}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Close"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Book Details Content */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">ISBN</p>
                      <p className="text-lg font-mono text-gray-900 mt-1">{selectedBook.isbn}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Book Type</p>
                      <p className={`text-lg font-semibold mt-1 ${selectedBook.type === 'Mustang' ? 'text-blue-600' : 'text-purple-600'}`}>
                        {selectedBook.type}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Title</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{selectedBook.title}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</p>
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed">{selectedBook.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date Purchased</p>
                      <p className="text-sm text-gray-900 mt-1">{selectedBook.datePurchased}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date Catalogued</p>
                      <p className="text-sm text-gray-900 mt-1">{selectedBook.dateCatalogued}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Lot Number</p>
                      <p className="text-sm text-gray-900 mt-1 font-semibold">{selectedBook.lot}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Box Number</p>
                      <p className="text-sm text-gray-900 mt-1 font-semibold">{selectedBook.boxNum}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Publisher</p>
                      <p className="text-gray-900 mt-1">{selectedBook.publisher}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Language</p>
                      <p className="text-gray-900 mt-1">{selectedBook.language}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pages</p>
                      <p className="text-gray-900 mt-1">{selectedBook.pageCount}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Condition</p>
                    <p className="text-sm text-gray-900 mt-1">{selectedBook.condition}</p>
                  </div>
                </div>

                {/* Modal Footer with Action Buttons */}
                <div className="flex gap-3 p-6 border-t border-gray-300 bg-gray-50 sticky bottom-0">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900 font-medium transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 print:hidden"
                  >
                    <Printer className="h-5 w-5" />
                    Print Slip
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Live Log Table */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Scan History</h2>

            <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">ISBN</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Title</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Scanned At</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Printed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length > 0 ? (
                      logs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-gray-900">{log.isbn}</td>
                          <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{log.title}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{log.scannedAt}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              log.printed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {log.printed ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          No scans yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
      </div>
    </>
  )
}
