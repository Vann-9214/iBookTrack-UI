'use client'

import { CheckCircle, XCircle, AlertCircle, Copy, Repeat2 } from 'lucide-react'

interface ScannedBook {
  id: string
  isbn: string
  title: string
  language: string
  expectedBox: number
  status: 'pass' | 'reject' | 'mismatch' | 'wrong-lot' | 'already-scanned'
  timestamp: Date
}

interface SessionLogProps {
  books: ScannedBook[]
}

export function SessionLog({ books }: SessionLogProps) {
  const getStatusIcon = (status: ScannedBook['status']) => {
    const icons = {
      pass: <CheckCircle className="w-4 h-4 text-success" />,
      reject: <XCircle className="w-4 h-4 text-destructive" />,
      mismatch: <AlertCircle className="w-4 h-4 text-warning" />,
      'wrong-lot': <Copy className="w-4 h-4 text-orange-500" />,
      'already-scanned': <Repeat2 className="w-4 h-4 text-muted-foreground" />,
    }
    return icons[status]
  }

  const getStatusLabel = (status: ScannedBook['status']) => {
    const labels = {
      pass: 'Pass',
      reject: 'Reject',
      mismatch: 'Mismatch',
      'wrong-lot': 'Wrong Lot',
      'already-scanned': 'Already Scanned',
    }
    return labels[status]
  }

  const getStatusColor = (status: ScannedBook['status']) => {
    const colors = {
      pass: 'bg-success/10 text-success',
      reject: 'bg-destructive/10 text-destructive',
      mismatch: 'bg-warning/10 text-warning',
      'wrong-lot': 'bg-orange-600/10 text-orange-500',
      'already-scanned': 'bg-muted text-muted-foreground',
    }
    return colors[status]
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Live Session Log (Last 10 Scans)
      </h2>

      {books.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No scans yet. Start scanning to see results.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">ISBN</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Title</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr
                  key={book.id}
                  className={`border-b border-border hover:bg-muted/50 transition-colors ${
                    ['wrong-lot', 'reject'].includes(book.status) ? 'bg-muted/20' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-mono text-xs text-foreground">{book.isbn}</td>
                  <td className="py-3 px-4 text-foreground truncate">{book.title}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(book.status)}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(book.status)}`}>
                        {getStatusLabel(book.status)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    {book.timestamp.toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
