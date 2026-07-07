'use client'

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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

interface UnaccountedBooksProps {
  refreshKey?: number
  books?: FlaggedBook[]
  loading?: boolean
}

export function UnaccountedBooks({ refreshKey, books: propBooks, loading: propLoading = false }: UnaccountedBooksProps) {
  const [fetchedBooks, setFetchedBooks] = useState<FlaggedBook[]>([])
  const [loading, setLoading] = useState(!propBooks)

  const books = propBooks || fetchedBooks

  const fetchFlagged = async () => {
    setLoading(true)
    try {
      const res = await authFetch(`${API_URL}/api/warehouse/rejected-books?today=true&limit=10`)
      const data = await res.json()
      if (data.success) setFetchedBooks(data.rejectedBooks || [])
    } catch {
      // silently fail — widget shouldn't break dashboard
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (propBooks) return
    fetchFlagged()
  }, [propBooks, refreshKey])

  const issueLabel = (val?: string) => {
    if (!val) return 'Unknown issue'
    return FLAG_LABELS[val] || val
  }

  return (
    <Card className="border-border bg-card flex flex-col overflow-hidden p-0 h-full">
      {/* Red header — sticky */}
      <div className="flex items-center justify-between px-5 py-4 bg-red-50 border-b border-red-100 shrink-0">
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
        {propLoading || loading ? (
          <Skeleton className="h-6 w-16 rounded-full bg-muted-foreground/20" />
        ) : (
          <Badge variant="outline" className="border-red-300 bg-white text-red-600 text-[11px] font-semibold px-2.5">
            {`${books.length} books`}
          </Badge>
        )}
      </div>

      <CardContent className="flex-1 p-0 min-h-0">
        {propLoading || loading ? (
          <div className="h-full overflow-hidden px-4 py-3">
            <div className="flex gap-3 mb-3">
              <Skeleton className="h-8 w-28 rounded bg-muted-foreground/20" />
              <Skeleton className="h-8 w-24 rounded bg-muted-foreground/20" />
              <Skeleton className="h-8 w-32 rounded bg-muted-foreground/20" />
              <Skeleton className="h-8 w-20 rounded bg-muted-foreground/20" />
              <Skeleton className="h-8 w-24 rounded bg-muted-foreground/20" />
            </div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
                <Skeleton className="h-4 w-28 rounded bg-muted-foreground/20" />
                <Skeleton className="h-4 w-24 rounded bg-muted-foreground/20" />
                <Skeleton className="h-4 w-20 rounded bg-muted-foreground/20" />
                <Skeleton className="h-4 w-24 rounded bg-muted-foreground/20" />
                <Skeleton className="h-4 w-20 ml-auto rounded bg-muted-foreground/20" />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm text-muted-foreground">No flagged books today.</p>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-white sticky top-0 z-10">
                <tr className="border-b border-gray-100">
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">ISBN</th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Lot &amp; Box</th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Issue</th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left hidden sm:table-cell">Reported By</th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {books.map((item) => (
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
                        ? new Date(item.scanned_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
