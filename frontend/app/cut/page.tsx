"use client"

import { useState, useEffect, useCallback } from "react"
import { authFetch } from "@/lib/auth-api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useBrand } from "@/hooks/use-brand"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from '@/components/top-bar'
import {
  Inbox, Send, Package, CheckCircle2,
  Loader2, RefreshCw
} from "lucide-react"
import { RefreshControl } from "@/components/refresh-control"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface BoxEntry {
  id: string
  box_number: string
  total_books_expected: number
  lot: { lot_number: string } | null
  box_sessions?: { status: string, inventory_time_send?: string }[]
}

export default function CutPage() {
  const { brand } = useBrand()

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [incomingBoxes, setIncomingBoxes] = useState<BoxEntry[]>([])
  const [outgoingBoxes, setOutgoingBoxes] = useState<BoxEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [receivingBox, setReceivingBox] = useState<string | null>(null)
  const [sendingBox, setSendingBox] = useState<string | null>(null)

  const fetchBoxes = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch incoming: still in 'inventory' stage but their session status is 'sent'
      const resIncoming = await authFetch(`${API_URL}/api/boxes?current_stage=inventory`)
      const incomingData = await resIncoming.json()
      
      const filteredIncoming = (incomingData.boxes || []).filter((b: BoxEntry) => {
         return b.box_sessions?.some(s => s.status === 'sent')
      })
      
      setIncomingBoxes(filteredIncoming)

      // Fetch outgoing: current stage is 'cut'
      const resOutgoing = await authFetch(`${API_URL}/api/boxes?current_stage=cut`)
      const outgoingData = await resOutgoing.json()
      setOutgoingBoxes(outgoingData.boxes || [])

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
        body: JSON.stringify({ notes: 'Received at Cut' }),
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

  const handleSendBox = async (box: BoxEntry) => {
    setSendingBox(box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/advance`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Sent to Endorsement from Cut' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send box')
      toast.success(`${box.box_number} sent to Endorsement`)
      fetchBoxes()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send box')
    } finally {
      setSendingBox(null)
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
                Cut
              </h1>
              <p className="text-sm text-muted-foreground">
                Receive boxes from Inventory and send them forward to Endorsement.
              </p>
            </div>

            <div className="flex items-center gap-1 mb-6 border-b border-border/50 pb-px">
              <button
                onClick={() => setActiveTab('incoming')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-all',
                  activeTab === 'incoming' 
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-t-lg'
                )}
              >
                <Inbox className="h-4 w-4" /> Incoming
                <span className={cn(
                  'ml-1.5 px-2 py-0.5 rounded-full text-xs',
                  activeTab === 'incoming' ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'
                )}>{incomingBoxes.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('outgoing')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-all',
                  activeTab === 'outgoing' 
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-t-lg'
                )}
              >
                <Send className="h-4 w-4" /> Outgoing
                <span className={cn(
                  'ml-1.5 px-2 py-0.5 rounded-full text-xs',
                  activeTab === 'outgoing' ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'
                )}>{outgoingBoxes.length}</span>
              </button>
              
              <div className="ml-auto">
                <RefreshControl onRefresh={fetchBoxes} isRefreshing={loading} lastUpdated={lastUpdated} />
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <p className="text-sm font-medium">Loading boxes...</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {activeTab === 'incoming' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {incomingBoxes.length === 0 ? (
                      <div className="col-span-full py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
                        <Inbox className="h-10 w-10 mb-3 text-muted-foreground/30" />
                        <p className="font-semibold text-foreground">No incoming boxes</p>
                        <p className="text-sm">Boxes sent from Inventory will appear here.</p>
                      </div>
                    ) : (
                      incomingBoxes.map(box => (
                        <div key={box.id} className="bg-white border border-border p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-bold text-foreground">BOX: {box.box_number}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">LOT: {box.lot?.lot_number}</p>
                            </div>
                            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-medium">Sent from Inventory</span>
                          </div>
                          
                          <button
                            onClick={() => handleReceiveBox(box)}
                            disabled={receivingBox === box.id}
                            className="mt-4 w-full flex justify-center items-center gap-2 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            {receivingBox === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
                            {receivingBox === box.id ? 'Receiving...' : 'Receive Box'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
                
                {activeTab === 'outgoing' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {outgoingBoxes.length === 0 ? (
                      <div className="col-span-full py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
                        <Send className="h-10 w-10 mb-3 text-muted-foreground/30" />
                        <p className="font-semibold text-foreground">No outgoing boxes</p>
                        <p className="text-sm">Received boxes will appear here.</p>
                      </div>
                    ) : (
                      outgoingBoxes.map(box => (
                        <div key={box.id} className="bg-white border border-border p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-bold text-foreground">BOX: {box.box_number}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">LOT: {box.lot?.lot_number}</p>
                            </div>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-medium">Ready to Send</span>
                          </div>
                          
                          <button
                            onClick={() => handleSendBox(box)}
                            disabled={sendingBox === box.id}
                            className="mt-4 w-full flex justify-center items-center gap-2 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            {sendingBox === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {sendingBox === box.id ? 'Sending...' : 'Send to Endorsement'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
