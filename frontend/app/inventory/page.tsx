'use client'

import { useState } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { X, Printer, Barcode } from 'lucide-react'

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
}

interface LogEntry {
  id: string
  isbn: string
  title: string
  scannedAt: string
  printed: boolean
}

const mockBooks: { [key: string]: BookDetail } = {
  '978-0-123456-78-9': {
    isbn: '978-0-123456-78-9',
    title: 'The History of Science',
    description: 'A comprehensive exploration of scientific discovery and advancement through the ages.',
    datePurchased: '2025-01-15',
    dateCatalogued: '2025-02-01',
    lot: 'Lot-33',
    boxNum: 'B001',
    type: 'Mustang',
    publisher: 'Oxford Press',
    language: 'English',
    pageCount: 482,
    condition: 'Good',
  },
  '978-0-987654-32-1': {
    isbn: '978-0-987654-32-1',
    title: 'Advanced Mathematics',
    description: 'An in-depth guide to advanced mathematical concepts and applications.',
    datePurchased: '2025-01-20',
    dateCatalogued: '2025-02-05',
    lot: 'Lot-33',
    boxNum: 'B002',
    type: 'Jaguar',
    publisher: 'Cambridge University Press',
    language: 'English',
    pageCount: 756,
    condition: 'Excellent',
  },
}

const mockLogs: LogEntry[] = [
  {
    id: '1',
    isbn: '978-0-123456-78-9',
    title: 'The History of Science',
    scannedAt: '2025-02-27 10:30:45',
    printed: true,
  },
  {
    id: '2',
    isbn: '978-0-987654-32-1',
    title: 'Advanced Mathematics',
    scannedAt: '2025-02-27 10:25:30',
    printed: true,
  },
]

export default function InventoryPage() {
  const [scanInput, setScanInput] = useState('')
  const [selectedBook, setSelectedBook] = useState<BookDetail | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs)

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const isbn = scanInput.trim()
      const book = mockBooks[isbn]
      
      if (book) {
        setSelectedBook(book)
        setShowModal(true)
      } else {
        alert('Book not found in database')
      }
      setScanInput('')
    }
  }

  const handlePrint = () => {
    if (!selectedBook) return
    
    window.print()
    
    const newLog: LogEntry = {
      id: (logs.length + 1).toString(),
      isbn: selectedBook.isbn,
      title: selectedBook.title,
      scannedAt: new Date().toLocaleString(),
      printed: true,
    }
    setLogs([newLog, ...logs])
    setShowModal(false)
  }

  const handleClose = () => {
    setShowModal(false)
    setScanInput('')
  }

  return (
    <div className="flex min-h-screen bg-white">
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
  )
}
