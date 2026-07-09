"use client"

import { useState, useEffect, useCallback } from "react"
import { authFetch } from "@/lib/auth-api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useBrand } from "@/hooks/use-brand"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from '@/components/top-bar'
import {
  Inbox, ScanBarcode, Loader2, Package, Clock, BookOpen
} from "lucide-react"
import { RefreshControl } from "@/components/refresh-control"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface BoxEntry {
  id: string
  box_number: string
  total_books_expected: number
  lot: { lot_number: string } | null
  box_sessions?: {
    status: string
    endorsement_time_send?: string
    scan_time_received?: string
  }[]
}

function formatDateTime(iso?: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  }
}

export default function ScanPage() {
  const { brand } = useBrand()

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [incomingBoxes, setIncomingBoxes] = useState<BoxEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [receivingBox, setReceivingBox] = useState<string | null>(null)

  const fetchBoxes = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch incoming: current stage is 'endorsement' but session is 'sent'
      const resIncoming = await authFetch(`${API_URL}/api/boxes?current_stage=endorsement`)
      const incomingData = await resIncoming.json()
      const filteredIncoming = (incomingData.boxes || []).filter((b: BoxEntry) => {
         return b.box_sessions?.some(s => s.status === 'sent')
      })
      setIncomingBoxes(filteredIncoming)
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Failed to fetch boxes:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBoxes()
  }, [fetchBoxes])

  const handleReceiveBox = async (box: BoxEntry) => {
    setReceivingBox(box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/advance`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Received at Scan' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to receive box')
      toast.success(`${box.box_number} received`)
      fetchBoxes()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to receive box')
    } finally {
      setReceivingBox(null)
    }
  }

  return (
    <div className="flex h-screen bg-[#FDFDFD] font-sans">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <DashboardNavbar />
        
        <main className="flex-1 overflow-auto flex flex-col p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
            <div className="flex flex-col gap-2 mb-6">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                Scan
              </h1>
              <p className="text-sm text-muted-foreground">
                Receive endorsed boxes for scanning.
              </p>
            </div>

            <div className="flex items-center gap-1 mb-6 border-b border-border/50 pb-px">
              <button
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-all border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                )}
              >
                <Inbox className="h-4 w-4" /> Incoming
                <span className={cn(
                  'ml-1.5 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800'
                )}>{incomingBoxes.length}</span>
              </button>
              
              <div className="ml-auto">
                <RefreshControl onRefresh={fetchBoxes} refreshing={loading} lastUpdated={lastUpdated} />
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <p className="text-sm font-medium">Loading boxes...</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {incomingBoxes.length === 0 ? (
                    <div className="col-span-full py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
                      <ScanBarcode className="h-10 w-10 mb-3 text-muted-foreground/30" />
                      <p className="font-semibold text-foreground">No incoming boxes</p>
                      <p className="text-sm">Boxes sent from Endorsement will appear here.</p>
                    </div>
                  ) : (
                    incomingBoxes.map(box => {
                      const sentSession = box.box_sessions?.find(s => s.status === 'sent')
                      const sentTime = formatDateTime(sentSession?.endorsement_time_send)
                      const bookCount = box.total_books_expected ?? 0

                      return (
                        <div key={box.id} className="bg-white border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col">
                          {/* Header */}
                          <div className="p-4 flex items-start gap-3">
                            <div className="bg-amber-50 rounded-lg p-2 shrink-0 mt-0.5">
                              <Package className="h-5 w-5 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-foreground">BOX: {box.box_number}</p>
                                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-medium">Sent from Endorsement</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                LOT: {box.lot?.lot_number || '—'} · <BookOpen className="inline h-3 w-3 mr-0.5" />{bookCount} books
                              </p>
                            </div>
                          </div>

                          {/* Sent time */}
                          {sentTime && (
                            <div className="mx-4 mb-3 flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <div>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Sent by Endorsement</p>
                                <p className="text-xs font-semibold text-foreground">{sentTime.date} · {sentTime.time}</p>
                              </div>
                            </div>
                          )}

                          {/* Receive button */}
                          <div className="p-4 pt-0 mt-auto">
                            <button
                              onClick={() => handleReceiveBox(box)}
                              disabled={receivingBox === box.id}
                              className="w-full flex justify-center items-center gap-2 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {receivingBox === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
                              {receivingBox === box.id ? 'Receiving...' : 'Receive Box'}
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
