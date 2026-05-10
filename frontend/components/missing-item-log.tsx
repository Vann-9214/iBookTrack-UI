'use client'

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
    <Card className="border-border bg-card flex flex-col">
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <CardTitle className="text-base font-semibold text-card-foreground">
          Flagged / Non-Processable Books
        </CardTitle>
        <Badge variant="outline" className="ml-auto border-destructive/30 bg-destructive/10 text-destructive text-[10px]">
          {loading ? '…' : `${books.length} books`}
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-8">Loading…</p>
        ) : books.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No flagged books yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground font-medium">ISBN</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Lot# &amp; Box</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Issue</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium hidden sm:table-cell">Reported By</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.slice(0, 10).map((item) => (
                <TableRow key={item.id} className="border-border">
                  <TableCell className="font-mono text-xs text-card-foreground">{item.isbn}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="font-mono">{item.assigned_box?.lot?.lot_number || '—'}</span>
                    {item.assigned_box?.box_number && (
                      <span className="block text-[10px] text-muted-foreground/70">{item.assigned_box.box_number}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px]">
                    <Badge variant="secondary" className="text-[10px] font-normal bg-red-50 text-red-700 border-red-200 max-w-full truncate block">
                      {issueLabel(item.rejection_reason)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                    {item.scanned_by_name || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap">
                    {item.scanned_at
                      ? new Date(item.scanned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
