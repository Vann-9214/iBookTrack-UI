'use client'

import { useState, useEffect } from "react"
import { usePagination } from "@/hooks/usePagination"
import { Pagination } from "@/components/pagination"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import { authFetch } from "@/lib/auth-api"

const FLAG_LABELS: Record<string, string> = {
  "bleed-through":        "Bleed-through on page",
  "brittle":              "Brittle on page",
  "cannot-detach-sticky": "Cannot be detached or sticky pages",
  "cd-only":              "CD only, no text content",
  "map-spanning":         "Contains a map spanning the entire book",
  "split-pages":          "Contains split pages",
  "cutoff-text":          "Cutoff text on page",
  "illegible-text":       "Illegible text",
  "inverted-contrast":    "Inverted contrast: White on black background",
  "missing-pages":        "Missing page/s",
  "no-content":           "No content or body text",
  "obscured-highlight":   "Obscured text due to highlight marker",
  "obscured-watermark":   "Obscured text due to watermarks",
  "oversized":            "Oversized and cannot fit in the scanner",
  "pen-marks":            "Pen marks on page",
  "pop-up-book":          "Pop-up book",
  "postcard-only":        "Postcard only",
  "stained-dirty":        "Stained or dirty page",
  "stamp-mark":           "Stamp mark on page",
  "thick-cardboard":      "Thick or cardboard pages",
  "torn-pages":           "Torn pages",
  "missing-content":      "Missing content",
  "blurred-text":         "Blurred text",
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface FlaggedBook {
  id: string
  isbn: string
  title?: string
  rejection_reason?: string
  scanned_at: string
  scanned_by_name?: string
  assigned_box?: {
    box_number: string
    lot?: { lot_number: string }
  }
}

export function UnaccountedBooks() {
  const [books, setBooks] = useState<FlaggedBook[]>([])
  const [loading, setLoading] = useState(true)
  const pagination = usePagination({ totalItems: books.length, defaultPageSize: 8 })
  const paginatedBooks = books.slice(pagination.offset, pagination.offset + pagination.limit)

  useEffect(() => {
    const fetchFlagged = async () => {
      try {
        const res = await authFetch(`${API_URL}/api/warehouse/rejected-books?limit=50`)
        const data = await res.json()
        if (data.success) setBooks(data.rejectedBooks || [])
      } catch {
        // silently fail — widget shouldn't break dashboard
      } finally {
        setLoading(false)
      }
    }
    fetchFlagged()
  }, [])

  const issueLabel = (val?: string) => {
    if (!val) return 'Unknown issue'
    return FLAG_LABELS[val] || val
  }

  return (
    <Card className="border-border bg-card flex flex-col overflow-hidden p-0">
      {/* Red header — sticky */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-4 bg-red-50 border-b border-red-100">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500 text-white">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Flagged / Non-Processable Books</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span className="text-xs text-gray-500">Needs review</span>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="border-red-300 bg-white text-red-600 text-[11px] font-semibold px-2.5">
          {loading ? '…' : `${books.length} books`}
        </Badge>
      </div>

      <CardContent className="flex-1 p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-lg">✅</div>
            <p className="text-sm text-muted-foreground">No flagged books yet.</p>
          </div>
        ) : (
          <>
          <div>
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr className="border-b border-gray-100">
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">ISBN</th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Lot &amp; Box</th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Issue</th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left hidden sm:table-cell">Reported By</th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBooks.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="text-xs font-semibold text-gray-800 px-4 py-3">{item.isbn}</td>
                    <td className="text-xs px-4 py-3">
                      <span className="font-semibold text-blue-600">{item.assigned_box?.lot?.lot_number || '—'}</span>
                      {item.assigned_box?.box_number && (
                        <span className="block text-[11px] text-gray-400 mt-0.5">{item.assigned_box.box_number}</span>
                      )}
                    </td>
                    <td className="text-xs px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 whitespace-nowrap">
                        {issueLabel(item.rejection_reason)}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500 px-4 py-3 hidden sm:table-cell">
                      {item.scanned_by_name || '—'}
                    </td>
                    <td className="text-xs text-gray-400 px-4 py-3 text-right whitespace-nowrap">
                      {item.scanned_at
                        ? new Date(item.scanned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="border-t border-gray-100 px-4 py-3">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                onPageChange={pagination.goToPage}
                onPageSizeChange={pagination.setPageSize}
                canPrevPage={pagination.canPrevPage}
                canNextPage={pagination.canNextPage}
              />
            </div>
          )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
