'use client'

import { useState, useEffect } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { useBrand } from '@/hooks/use-brand'
import { cn } from '@/lib/utils'
import { getApiBaseUrl } from '@/lib/auth-api'
import { authFetch } from '@/lib/auth-api'
import { AlertTriangle, AlertOctagon, ScanBarcode, Scissors, X, Loader2, CheckCircle2, TrendingUp, RefreshCw, Download, Calendar as CalendarIcon, PackageX, FileWarning, WifiOff, Check } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Package, Inbox, FileText, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { RefreshControl } from '@/components/refresh-control'

const ISSUE_LABELS: Record<string, string> = {
  'scanning': 'Scanning/Barcode Error',
  'cut': 'Cut Error',
  'transmission': 'Transmission Error',
  'split-pages': 'Split Pages',
  'bleed-through': 'Bleed Through',
  'misaligned-cut': 'Misaligned Cut',
  'dog-ears': 'Dog Ears',
  'torn-cover': 'Torn Cover',
  'sync_error': 'Sync Error',
  'barcode_error': 'Barcode Error'
}

export default function NonProcessablePage() {
  const { brand } = useBrand()
  
  const [totalCount, setTotalCount] = useState<number>(0)
  const [issueBreakdown, setIssueBreakdown] = useState({
    damage: 0,
    mismatch: 0,
    system: 0
  })
  
  const [timelineData, setTimelineData] = useState([
    { name: 'Mon', flags: 0 },
    { name: 'Tue', flags: 0 },
    { name: 'Wed', flags: 0 },
    { name: 'Thu', flags: 0 },
    { name: 'Fri', flags: 0 },
    { name: 'Sat', flags: 0 },
    { name: 'Sun', flags: 0 },
  ])
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  
  const [fromDateOpen, setFromDateOpen] = useState(false)
  const [toDateOpen, setToDateOpen] = useState(false)
  
  const [flags, setFlags] = useState<any[]>([])
  
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const [modalPage, setModalPage] = useState(1)
  const [structuredLots, setStructuredLots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [flagToResolve, setFlagToResolve] = useState<any | null>(null)
  
  // Modal state
  const [selectedCategory, setSelectedCategory] = useState<'Total' | 'Scanning' | 'Cut' | 'Other' | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    setModalPage(1)
  }, [selectedCategory])

  const handleResolveClick = (flag: any) => {
    setFlagToResolve(flag)
  }

  const resolveFlag = async () => {
    if (!flagToResolve) return;
    
    setResolvingId(flagToResolve.scan_id)
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/dashboard/qc-flags/${flagToResolve.scan_id}/resolve`, {
        method: 'POST'
      })
      if (res.ok) {
        fetchCounts()
        setFlagToResolve(null)
      } else {
        alert('Failed to resolve flag.')
      }
    } catch (e) {
      alert('An error occurred.')
    } finally {
      setResolvingId(null)
    }
  }

  const fetchCounts = async () => {
    setLoading(true)
    try {
      const dateQuery = (fromDate && toDate) ? `&from_date=${fromDate}&to_date=${toDate}` : ''
      const res = await authFetch(`${getApiBaseUrl()}/api/dashboard/qc-flags?page=1&limit=1000&box_type=${brand}${dateQuery}`)
      if (res.ok) {
        const data = await res.json()
        setTotalCount(data.total || 0)
        
        const flagsList = data.flags || []
        setFlags(flagsList)
        
        let damage = 0
        let mismatch = 0
        let system = 0
        
        const dateCounts: Record<string, number> = {}
        const dayCounts: Record<string, number> = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 }
        
        flagsList.forEach((f: any) => {
          const issueStr = (f.issue || '').toLowerCase()
          if (issueStr.includes('torn') || issueStr.includes('dog-ear') || issueStr.includes('damage') || issueStr.includes('split') || issueStr.includes('bleed') || issueStr.includes('cut')) damage++
          else if (issueStr.includes('missing') || issueStr.includes('extra') || issueStr.includes('mismatch')) mismatch++
          else if (issueStr.includes('sync') || issueStr.includes('transmission') || issueStr.includes('system') || issueStr.includes('scanning') || issueStr.includes('barcode')) system++
          
          if (f.flagged_at) {
            const date = new Date(f.flagged_at)
            const dateKey = format(date, 'yyyy-MM-dd')
            dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1
            
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            const dayName = days[date.getDay()]
            dayCounts[dayName]++
          }
        })
        
        setIssueBreakdown({ damage, mismatch, system })
        
        let dynamicTimeline: any[] = []
        
        if (!fromDate && !toDate) {
          dynamicTimeline = [
            { name: 'Sun', flags: dayCounts['Sun'] },
            { name: 'Mon', flags: dayCounts['Mon'] },
            { name: 'Tue', flags: dayCounts['Tue'] },
            { name: 'Wed', flags: dayCounts['Wed'] },
            { name: 'Thu', flags: dayCounts['Thu'] },
            { name: 'Fri', flags: dayCounts['Fri'] },
            { name: 'Sat', flags: dayCounts['Sat'] },
          ]
        } else {
          const sortedDateKeys = Object.keys(dateCounts).sort((a, b) => a.localeCompare(b))
          let minDate: Date;
          let maxDate: Date;

          if (fromDate && toDate) {
            minDate = new Date(fromDate)
            maxDate = new Date(toDate)
          } else if (sortedDateKeys.length > 0) {
            minDate = new Date(sortedDateKeys[0])
            maxDate = new Date(sortedDateKeys[sortedDateKeys.length - 1])
          } else {
            maxDate = new Date()
            minDate = new Date()
            minDate.setDate(minDate.getDate() - 6)
          }

          const diffTime = Math.abs(maxDate.getTime() - minDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          if (diffDays < 6) {
              minDate = new Date(maxDate)
              minDate.setDate(minDate.getDate() - 6)
          }

          for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
            const k = format(d, 'yyyy-MM-dd')
            dynamicTimeline.push({ name: format(d, 'MMM dd'), flags: dateCounts[k] || 0 })
          }
        }
        
        setTimelineData(dynamicTimeline)

        // Structure data for accordion
        const lotData: Record<string, any> = {}
        flagsList.forEach((f: any) => {
          const lotNum = f.assigned_box?.lot?.lot_number || 'Unknown'
          const boxNum = f.assigned_box?.box_number || 'Unknown'
          
          if (!lotData[lotNum]) {
            lotData[lotNum] = { lot_number: lotNum, boxes: {}, totalFlags: 0 }
          }
          if (!lotData[lotNum].boxes[boxNum]) {
            lotData[lotNum].boxes[boxNum] = { box_number: boxNum, flags: [] }
          }
          
          lotData[lotNum].boxes[boxNum].flags.push(f)
          lotData[lotNum].totalFlags++
        })
        
        const sortedLots = Object.values(lotData).sort((a: any, b: any) => b.totalFlags - a.totalFlags)
        setStructuredLots(sortedLots)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('Failed to fetch counts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCounts()
  }, [brand, fromDate, toDate])

  const isJaguar = brand === 'jaguar'
  
  const TONE = {
    theme: isJaguar
      ? {
          card: "bg-gradient-to-br from-emerald-50 to-emerald-100/40 border-emerald-200/70 ring-emerald-100/60",
          icon: "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/25",
          value: "text-emerald-700",
          title: "text-emerald-950/70",
          sub: "text-emerald-600/80",
          hover: "hover:shadow-emerald-200/60 cursor-pointer",
          modalBg: "bg-gradient-to-r from-emerald-50 to-green-50",
          modalIcon: "bg-gradient-to-br from-emerald-500 to-green-600",
          modalDot: "bg-emerald-500",
        }
      : {
          card: "bg-gradient-to-br from-blue-50 to-indigo-100/40 border-blue-200/70 ring-blue-100/60",
          icon: "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25",
          value: "text-blue-700",
          title: "text-blue-950/70",
          sub: "text-blue-600/80",
          hover: "hover:shadow-blue-200/60 cursor-pointer",
          modalBg: "bg-gradient-to-r from-blue-50 to-indigo-50",
          modalIcon: "bg-gradient-to-br from-blue-500 to-indigo-600",
          modalDot: "bg-blue-500",
        },
    redSolid: {
      card: "bg-gradient-to-br from-red-500 to-rose-600 border-red-600/40 ring-red-300/30 text-white",
      icon: "bg-white/20 shadow-black/10",
      value: "text-white",
      title: "text-white/90",
      sub: "text-white/70",
      hover: "hover:shadow-red-500/40 cursor-pointer",
      modalBg: "bg-gradient-to-r from-red-50 to-rose-50",
      modalIcon: "bg-gradient-to-br from-red-500 to-rose-600",
      modalDot: "bg-red-500",
    }
  }

  const dynamicTone = TONE.theme
  const redTone = TONE.redSolid

  const displayFlags = selectedCategory === 'Total' ? flags :
                       selectedCategory === 'Damage' ? flags.filter(f => {
                         const s = (f.issue || '').toLowerCase();
                         return s.includes('torn') || s.includes('dog-ear') || s.includes('damage') || s.includes('split') || s.includes('bleed') || s.includes('cut');
                       }) :
                       selectedCategory === 'Mismatch' ? flags.filter(f => {
                         const s = (f.issue || '').toLowerCase();
                         return s.includes('missing') || s.includes('extra') || s.includes('mismatch');
                       }) :
                       selectedCategory === 'System' ? flags.filter(f => {
                         const s = (f.issue || '').toLowerCase();
                         return s.includes('sync') || s.includes('transmission') || s.includes('system') || s.includes('scanning') || s.includes('barcode');
                       }) :
                       []

  const query = searchQuery.toLowerCase().trim()
  const filteredLots = structuredLots.map(lot => {
    if (!query) return lot;
    
    let lotMatches = lot.lot_number.toLowerCase().includes(query)
    
    const filteredBoxes: Record<string, any> = {}
    let hasMatchingBoxes = false
    let totalFilteredFlags = 0
    
    Object.values(lot.boxes).forEach((box: any) => {
      let boxMatches = lotMatches || box.box_number.toLowerCase().includes(query)
      
      const matchingFlags = box.flags.filter((f: any) => {
        return boxMatches || (f.isbn && f.isbn.toLowerCase().includes(query)) || (f.title && f.title.toLowerCase().includes(query))
      })
      
      if (matchingFlags.length > 0) {
        filteredBoxes[box.box_number] = { ...box, flags: matchingFlags }
        hasMatchingBoxes = true
        totalFilteredFlags += matchingFlags.length
      }
    })
    
    if (hasMatchingBoxes) {
      return { ...lot, boxes: filteredBoxes, totalFlags: totalFilteredFlags }
    }
    
    return null
  }).filter(Boolean)

  const activeTone = selectedCategory === 'Total' ? TONE.redSolid : TONE.theme

  const exportToCsv = () => {
    const csvRows = [
      ['ISBN', 'Title', 'Lot Number', 'Box Number', 'Issue', 'Remarks', 'Flagged By', 'Flagged At']
    ];
    
    filteredLots.forEach((lot: any) => {
      Object.values(lot.boxes).forEach((box: any) => {
        box.flags.forEach((f: any) => {
          csvRows.push([
            f.isbn || 'Unknown',
            `"${(f.title || '').replace(/"/g, '""')}"`,
            lot.lot_number,
            box.box_number,
            ISSUE_LABELS[f.issue] || f.issue,
            `"${(f.remarks || '').replace(/"/g, '""')}"`,
            `"${(f.flagged_by_name || '').replace(/"/g, '""')}"`,
            f.flagged_at ? new Date(f.flagged_at).toLocaleString() : ''
          ]);
        });
      });
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateRangeStr = (fromDate && toDate) ? `${fromDate}-to-${toDate}` : 'all-time';
    link.setAttribute("download", `non-processable-${brand}-${dateRangeStr}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className={cn('flex h-screen bg-background font-sans', `theme-${brand}`)}>
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <DashboardNavbar />
        <main className="ambient-bg flex-1 flex flex-col p-4 md:p-6 lg:p-8 overflow-y-auto">
          <div className="flex flex-col min-h-0 gap-6 pb-8">
            
            {/* Page Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5',
                    brand === 'jaguar'
                      ? 'bg-gradient-to-br from-emerald-400 to-green-600'
                      : 'bg-gradient-to-br from-indigo-400 to-blue-600'
                  )}
                >
                  <AlertOctagon className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none flex items-center gap-2">
                    Non-Processable
                  </h1>
                  <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
                    Overview of issues for{' '}
                    <span
                      className={cn(
                        'inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none',
                        brand === 'jaguar'
                          ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                      )}
                    >
                      {brand}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-3 sm:mt-0 w-full sm:w-auto justify-end">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">From</span>
                  <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-8 w-36 justify-start text-left font-normal text-xs">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        {fromDate ? format(new Date(fromDate), 'MMM dd, yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fromDate ? new Date(fromDate) : undefined}
                        onSelect={(date) => {
                          setFromDate(date ? format(date, 'yyyy-MM-dd') : '')
                          setFromDateOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">To</span>
                  <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-8 w-36 justify-start text-left font-normal text-xs">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        {toDate ? format(new Date(toDate), 'MMM dd, yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={toDate ? new Date(toDate) : undefined}
                        onSelect={(date) => {
                          setToDate(date ? format(date, 'yyyy-MM-dd') : '')
                          setToDateOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportToCsv} 
                  disabled={filteredLots.length === 0} 
                  className="gap-1.5 h-8"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>

                <RefreshControl
                  onRefresh={fetchCounts}
                  refreshing={loading}
                  lastUpdated={lastUpdated}
                  storageKey={`non-processable-${brand}`}
                  className="hidden sm:flex"
                />
              </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
              
              {/* Total Non-Processable (Always Red) */}
              <div onClick={() => setSelectedCategory('Total')} className={cn("group relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl", redTone.card, redTone.hover)}>
                <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/25 blur-2xl" />
                <div className="relative flex items-start justify-between mb-3">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110", redTone.icon)}>
                    <AlertOctagon className="h-6 w-6" />
                  </div>
                  <div className={cn("text-4xl font-black mb-0.5 tracking-tight tabular-nums", redTone.value)}>
                    {loading ? <Loader2 className="h-6 w-6 animate-spin mt-2" /> : totalCount.toLocaleString()}
                  </div>
                </div>
                <div className={cn("relative text-sm font-semibold mb-0.5", redTone.title)}>Total Non-Processable</div>
                <div className={cn("relative text-xs font-medium", redTone.sub)}>Needs review</div>
              </div>

              {/* Physical Damage */}
              <div onClick={() => setSelectedCategory('Damage')} className={cn("group relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl", dynamicTone.card, dynamicTone.hover)}>
                <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/25 blur-2xl" />
                <div className="relative flex items-start justify-between mb-3">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110", dynamicTone.icon)}>
                    <FileWarning className="h-6 w-6" />
                  </div>
                  <div className={cn("text-4xl font-black mb-0.5 tracking-tight tabular-nums", dynamicTone.value)}>
                    {loading ? <Loader2 className="h-6 w-6 animate-spin mt-2 opacity-50" /> : issueBreakdown.damage.toLocaleString()}
                  </div>
                </div>
                <div className={cn("relative text-sm font-semibold mb-0.5", dynamicTone.title)}>Physical Damage</div>
                <div className={cn("relative text-xs font-medium", dynamicTone.sub)}>Torn / Cut / Split</div>
              </div>

              {/* Inventory Mismatch */}
              <div onClick={() => setSelectedCategory('Mismatch')} className={cn("group relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl", dynamicTone.card, dynamicTone.hover)}>
                <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/25 blur-2xl" />
                <div className="relative flex items-start justify-between mb-3">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110", dynamicTone.icon)}>
                    <PackageX className="h-6 w-6" />
                  </div>
                  <div className={cn("text-4xl font-black mb-0.5 tracking-tight tabular-nums", dynamicTone.value)}>
                    {loading ? <Loader2 className="h-6 w-6 animate-spin mt-2 opacity-50" /> : issueBreakdown.mismatch.toLocaleString()}
                  </div>
                </div>
                <div className={cn("relative text-sm font-semibold mb-0.5", dynamicTone.title)}>Inventory Mismatch</div>
                <div className={cn("relative text-xs font-medium", dynamicTone.sub)}>Missing or Extra</div>
              </div>

              {/* System & Sync */}
              <div onClick={() => setSelectedCategory('System')} className={cn("group relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl", dynamicTone.card, dynamicTone.hover)}>
                <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/25 blur-2xl" />
                <div className="relative flex items-start justify-between mb-3">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110", dynamicTone.icon)}>
                    <WifiOff className="h-6 w-6" />
                  </div>
                  <div className={cn("text-4xl font-black mb-0.5 tracking-tight tabular-nums", dynamicTone.value)}>
                    {loading ? <Loader2 className="h-6 w-6 animate-spin mt-2 opacity-50" /> : issueBreakdown.system.toLocaleString()}
                  </div>
                </div>
                <div className={cn("relative text-sm font-semibold mb-0.5", dynamicTone.title)}>System & Sync</div>
                <div className={cn("relative text-xs font-medium", dynamicTone.sub)}>Transmission / Scanner</div>
              </div>

            </div>

            {/* Charts Row Container */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0 mt-2">
              
              {/* Timeline Graph */}
              <div className={cn("rounded-2xl border p-5 shadow-sm ring-1 flex flex-col h-96 transition-colors duration-300 lg:col-span-2 bg-white", dynamicTone.card)}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold tracking-tight text-gray-800 flex items-center gap-2 mb-1">
                      Timeline
                    </h3>
                    <p className="text-xs text-gray-500">Non-processable items flagged over time</p>
                  </div>
                  <div className={cn("flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-white shadow-sm", isJaguar ? "text-emerald-700 ring-1 ring-emerald-200/50" : "text-blue-700 ring-1 ring-blue-200/50")}>
                    <TrendingUp className="h-3.5 w-3.5" />
                    Selected Period
                  </div>
                </div>
                
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorFlags" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isJaguar ? '#10b981' : '#3b82f6'} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={isJaguar ? '#10b981' : '#3b82f6'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }}
                        allowDecimals={false}
                      />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#1f2937', fontWeight: 600 }}
                        labelStyle={{ color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}
                        cursor={{ stroke: isJaguar ? '#10b981' : '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="flags" 
                        stroke={isJaguar ? '#10b981' : '#3b82f6'} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorFlags)" 
                        activeDot={{ r: 6, strokeWidth: 0, fill: isJaguar ? '#10b981' : '#3b82f6' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top 5 Worst Lots Graph */}
              <div className={cn("rounded-2xl border p-5 shadow-sm ring-1 flex flex-col h-96 transition-colors duration-300 lg:col-span-1 bg-white", dynamicTone.card)}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold tracking-tight text-gray-800 flex items-center gap-2 mb-1">
                      Worst Lots
                    </h3>
                    <p className="text-xs text-gray-500">Top 5 by flag count</p>
                  </div>
                  <div className={cn("flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-white shadow-sm", "text-red-700 ring-1 ring-red-200/50")}>
                    Top 5
                  </div>
                </div>
                
                <div className="flex-1 w-full min-h-0 relative">
                  {structuredLots.length === 0 && !loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 mb-3 opacity-80">
                        <Check className="h-6 w-6 text-white stroke-[3]" />
                      </div>
                      <span className="font-medium text-gray-600 text-sm">No worst lots found</span>
                    </div>
                  ) : (
                    <div className="w-full h-full -ml-5">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={structuredLots.slice(0, 5).map(l => ({ name: l.lot_number, flags: l.totalFlags }))} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} width={90} />
                          <RechartsTooltip 
                            contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#1f2937', fontWeight: 600 }}
                            labelStyle={{ color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}
                            cursor={{ fill: '#f3f4f6', opacity: 0.4 }}
                          />
                          <Bar dataKey="flags" radius={[0, 4, 4, 0]} barSize={24}>
                            {
                              structuredLots.slice(0, 5).map((entry, index) => {
                                const heatGradient = ['#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444'];
                                return <Cell key={`cell-${index}`} fill={heatGradient[index] || '#f87171'} />
                              })
                            }
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Hierarchical Lots & Boxes Accordion Container */}
            <div className={cn("rounded-xl border border-gray-200 border-t-2 bg-white mt-5 flex flex-col overflow-hidden shadow-sm shrink-0", brand === 'jaguar' ? 'border-t-green-500' : 'border-t-blue-600')}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-slate-50/80 border-b border-gray-100 gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm", dynamicTone.icon)}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-0.5 text-[15px]">
                      Non-Processable by Lot & Box — All Time
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                      <span className={cn("h-1.5 w-1.5 rounded-full", dynamicTone.modalDot)}></span>
                      {totalCount} flags total
                    </div>
                  </div>
                </div>
                
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input 
                    placeholder="Search ISBN, box, lot or title..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-9 h-9 bg-white border-gray-200 text-sm rounded-lg shadow-sm focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              <div className={cn("p-5", filteredLots.length > 4 && "max-h-[28rem] overflow-y-auto")}>
                <Accordion type="multiple" className="w-full space-y-3">
                {filteredLots.map((lot: any) => (
                  <AccordionItem key={lot.lot_number} value={lot.lot_number} className={cn("border rounded-2xl bg-white overflow-hidden shadow-sm transition-all data-[state=open]:shadow-md", dynamicTone.card)}>
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-black/5 transition-colors">
                       <div className="flex justify-between items-center w-full pr-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm", dynamicTone.icon)}>
                              <Package className="h-5 w-5" />
                            </div>
                            <span className="font-black text-lg text-gray-800">{lot.lot_number}</span>
                          </div>
                          <span className="text-red-700 font-bold bg-red-100 ring-1 ring-red-200 px-3 py-1 rounded-full text-sm">
                            {lot.totalFlags} items
                          </span>
                       </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-white/50 px-5 pb-5 pt-2 border-t border-black/5">
                       <Accordion type="multiple" className="w-full space-y-2 mt-2">
                          {Object.values(lot.boxes).map((box: any) => (
                            <AccordionItem key={box.box_number} value={box.box_number} className="border rounded-xl bg-white overflow-hidden shadow-sm">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-center w-full pr-4">
                                  <div className="flex items-center gap-2">
                                    <Inbox className="h-4 w-4 text-gray-400" />
                                    <span>Box {box.box_number}</span>
                                  </div>
                                  <span className="text-gray-600 font-medium text-xs bg-gray-100 px-2 py-0.5 rounded-full ring-1 ring-gray-200">
                                    {box.flags.length} flags
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 py-3 bg-gray-50 border-t">
                                <div className="space-y-2">
                                   {box.flags.map((f: any, i: number) => (
                                     <div key={`${f.scan_id}-${i}`} className="bg-white p-3 rounded-lg border text-sm flex justify-between items-center shadow-sm hover:border-red-200 transition-colors">
                                       <div>
                                         <div className="font-mono font-semibold text-gray-800">{f.isbn}</div>
                                         <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{f.title || 'Unknown Title'}</div>
                                       </div>
                                       <div className="flex flex-col items-end gap-1.5 shrink-0">
                                         <span className="bg-red-50 text-red-700 ring-1 ring-red-200/60 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                           {ISSUE_LABELS[f.issue] || f.issue}
                                         </span>
                                         <div className="flex items-center gap-2">
                                           <span className="text-[10px] font-medium text-gray-400">by {f.flagged_by_name || 'System'}</span>
                                           <button 
                                             onClick={(e) => { e.stopPropagation(); handleResolveClick(f); }} 
                                             disabled={resolvingId === f.scan_id}
                                             className="text-[10px] text-emerald-600 font-bold hover:underline disabled:opacity-50"
                                           >
                                             {resolvingId === f.scan_id ? 'Resolving...' : 'Resolve'}
                                           </button>
                                         </div>
                                       </div>
                                     </div>
                                   ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                       </Accordion>
                    </AccordionContent>
                  </AccordionItem>
                ))}
                {filteredLots.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    {searchQuery ? (
                      <>
                        <Search className="h-10 w-10 text-gray-300 mb-3" />
                        <span className="font-medium text-gray-600">No results found for "{searchQuery}"</span>
                      </>
                    ) : (
                      <>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 mb-3 opacity-80">
                          <Check className="h-6 w-6 text-white stroke-[3]" />
                        </div>
                        <span className="font-medium text-gray-600">No problem lots found</span>
                      </>
                    )}
                  </div>
                )}
              </Accordion>
            </div>
            </div>
            <div className="h-12 shrink-0"></div>
          </div>
        </main>
      </div>

      {/* QC Flagged Books Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-overlay-in" onClick={() => setSelectedCategory(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden animate-modal-in ring-1 ring-black/5" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className={cn("px-6 py-5 flex items-center justify-between", activeTone.modalBg)}>
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg", activeTone.modalIcon)}>
                  {selectedCategory === 'Damage' ? <FileWarning className="h-5 w-5" /> :
                   selectedCategory === 'Mismatch' ? <PackageX className="h-5 w-5" /> :
                   selectedCategory === 'System' ? <WifiOff className="h-5 w-5" /> :
                   <AlertOctagon className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-gray-800">
                    {selectedCategory === 'Total' ? 'Non-Processable Books' : `${selectedCategory} Issues`}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn("h-2 w-2 rounded-full", activeTone.modalDot)} />
                    <span className="text-xs text-gray-500">Needs review</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 hover:bg-white text-gray-500 hover:text-gray-800 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Loading flagged books...</span>
              </div>
            ) : displayFlags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl shadow-md", activeTone.modalIcon)}>
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-600">No flagged books</span>
                <span className="text-xs text-gray-400">Everything looks clean for this category</span>
              </div>
            ) : (
              <div className={cn("overflow-y-auto px-3 pb-2", displayFlags.length > 11 ? "max-h-[34rem]" : "")}>
                <table className="w-full text-sm table-fixed border-separate border-spacing-y-1">
                  <colgroup>
                    <col className="w-10" />
                    <col className="w-32" />
                    <col className="hidden sm:table-column" />
                    <col className="w-24" />
                    <col className="w-48" />
                    <col className="w-32" />
                    <col className="w-24" />
                  </colgroup>
                  <thead className="sticky top-0 bg-white z-10 shadow-[0_-12px_0_0_white]">
                    <tr>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">#</th>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">ISBN</th>
                      <th className="hidden sm:table-cell text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Lot &amp; Box</th>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Issue</th>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Flagged By</th>
                      <th className="text-right py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayFlags.slice((modalPage - 1) * 20, modalPage * 20).map((f, i) => (
                      <tr key={`${f.scan_id}-${i}`} className={cn("bg-gray-50/60 transition-colors align-middle [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl", selectedCategory === 'Total' ? 'hover:bg-red-50/50' : isJaguar ? 'hover:bg-emerald-50/50' : 'hover:bg-blue-50/50')}>
                        <td className="py-2 px-3 text-xs font-medium text-gray-400 align-middle">{(modalPage - 1) * 20 + i + 1}</td>
                        <td className="py-2 px-3 font-mono text-xs font-semibold text-gray-800 truncate align-middle">{f.isbn}</td>
                        <td className="hidden sm:table-cell py-2 px-3 text-gray-600 truncate align-middle">{f.title || '—'}</td>
                        <td className="text-xs px-3 py-2 align-middle whitespace-nowrap">
                          <span className="font-bold text-gray-800">{f.assigned_box?.lot?.lot_number || '—'}</span>
                          {f.assigned_box?.box_number && (
                            <span className="ml-1.5 font-mono text-gray-400">{f.assigned_box.box_number}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ring-1", selectedCategory === 'Total' ? 'bg-red-100 text-red-700 ring-red-200/60' : isJaguar ? 'bg-emerald-100 text-emerald-700 ring-emerald-200/60' : 'bg-blue-100 text-blue-700 ring-blue-200/60')}>
                              {ISSUE_LABELS[f.issue] || f.issue}
                            </span>
                            {f.remarks && <span className="text-[11px] text-gray-400 italic truncate" title={f.remarks}>“{f.remarks}”</span>}
                          </div>
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase ring-1", selectedCategory === 'Total' ? 'bg-red-100 text-red-600 ring-red-200/60' : isJaguar ? 'bg-emerald-100 text-emerald-600 ring-emerald-200/60' : 'bg-blue-100 text-blue-600 ring-blue-200/60')}>
                              {(f.flagged_by_name || '—').split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('') || '?'}
                            </span>
                            <span className="truncate text-gray-700 font-medium">{f.flagged_by_name || '—'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 align-middle text-right">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleResolveClick(f); }}
                            disabled={resolvingId === f.scan_id}
                            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded transition-colors disabled:opacity-50"
                          >
                            {resolvingId === f.scan_id ? '...' : 'Resolve'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="border-t border-gray-100 px-6 py-3 text-xs text-gray-500 font-medium shrink-0 flex items-center justify-between bg-gray-50/50">
              <span>Showing {Math.min(displayFlags.length, (modalPage - 1) * 20 + (displayFlags.length > 0 ? 1 : 0))} - {Math.min(displayFlags.length, modalPage * 20)} of {displayFlags.length} items</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setModalPage(p => Math.max(1, p - 1))}
                  disabled={modalPage === 1}
                  className="px-2.5 py-1 bg-white border rounded shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                >
                  Prev
                </button>
                <span className="font-semibold px-2">{modalPage}</span>
                <button 
                  onClick={() => setModalPage(p => Math.min(Math.ceil(displayFlags.length / 20), p + 1))}
                  disabled={modalPage >= Math.ceil(displayFlags.length / 20) || displayFlags.length === 0}
                  className="px-2.5 py-1 bg-white border rounded shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* Resolve Confirmation Modal */}
      {flagToResolve && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-overlay-in" onClick={() => setFlagToResolve(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-modal-in" onClick={e => e.stopPropagation()}>
            <div className={cn("px-6 py-5 flex items-center gap-3", activeTone.modalBg)}>
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg", activeTone.modalIcon)}>
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-gray-800">Resolve Issue</h3>
                <p className="text-xs text-gray-500 font-medium">ISBN: {flagToResolve.isbn || 'Unknown'}</p>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                Are you sure you want to mark this item as resolved? It will be removed from the Non-Processable queue.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-gray-500">Box Number:</div>
                  <div className="font-medium text-gray-800 text-right">{flagToResolve.assigned_box?.box_number || '-'}</div>
                  <div className="text-gray-500">Issue Type:</div>
                  <div className="font-medium text-gray-800 text-right">{ISSUE_LABELS[flagToResolve.issue] || flagToResolve.issue}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setFlagToResolve(null)} className="h-10 px-5 rounded-xl text-gray-600 hover:text-gray-800 font-semibold" disabled={resolvingId === flagToResolve.scan_id}>
                  Cancel
                </Button>
                <Button 
                  onClick={resolveFlag} 
                  disabled={resolvingId === flagToResolve.scan_id}
                  className={cn("h-10 px-6 rounded-xl text-white font-semibold shadow-sm transition-all", isJaguar ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700")}
                >
                  {resolvingId === flagToResolve.scan_id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  {resolvingId === flagToResolve.scan_id ? 'Resolving...' : 'Confirm Resolve'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
