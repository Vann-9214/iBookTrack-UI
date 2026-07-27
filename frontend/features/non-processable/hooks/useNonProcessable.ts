import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { getApiBaseUrl, authFetch } from '@/lib/auth-api'
import { QCFlag, LotGroup, SelectedCategory } from '../types'
import { ISSUE_LABELS } from '../utils/constants'

export function useNonProcessable(brand: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentWeek = Math.ceil((now.getDate() + startOfMonth.getDay()) / 7)

  const [totalCount, setTotalCount] = useState<number>(0)
  const [issueBreakdown, setIssueBreakdown] = useState({ damage: 0, mismatch: 0 })
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth())
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek)
  
  const computedFromDate = useMemo(() => {
    if (selectedMonth === -1) {
      return format(new Date(selectedYear, 0, 1), 'yyyy-MM-dd')
    }
    if (selectedWeek === 0) {
      return format(new Date(selectedYear, selectedMonth, 1), 'yyyy-MM-dd')
    }
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay()
    const sundayDate = 1 - firstDay + (selectedWeek - 1) * 7
    return format(new Date(selectedYear, selectedMonth, sundayDate), 'yyyy-MM-dd')
  }, [selectedYear, selectedMonth, selectedWeek])

  const computedToDate = useMemo(() => {
    if (selectedMonth === -1) {
      return format(new Date(selectedYear, 11, 31), 'yyyy-MM-dd')
    }
    if (selectedWeek === 0) {
      return format(new Date(selectedYear, selectedMonth + 1, 0), 'yyyy-MM-dd')
    }
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay()
    const saturdayDate = 1 - firstDay + (selectedWeek - 1) * 7 + 6
    return format(new Date(selectedYear, selectedMonth, saturdayDate), 'yyyy-MM-dd')
  }, [selectedYear, selectedMonth, selectedWeek])

  const [flags, setFlags] = useState<QCFlag[]>([])
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const [structuredLots, setStructuredLots] = useState<LotGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionResolvedFlags, setSessionResolvedFlags] = useState<QCFlag[]>([])
  const [flagToResolve, setFlagToResolve] = useState<QCFlag | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchCounts = async () => {
    setLoading(true)
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/dashboard/qc-flags?page=1&limit=1000&box_type=${brand}`)
      if (res.ok) {
        const data = await res.json()
        
        let flagsList: QCFlag[] = data.flags || []
        
        // Remove 'other' issues entirely as requested
        flagsList = flagsList.filter((f: any) => f.issue?.toLowerCase().trim() !== 'other')
        
        setTotalCount(flagsList.length)
        setFlags(flagsList)
        
        let damage = 0
        let mismatch = 0
        
        const dateCounts: Record<string, number> = {}
        const dayCounts: Record<string, number> = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 }
        
        flagsList.forEach((f: any) => {
          const dateStr = f.flagged_at ? format(new Date(f.flagged_at), 'yyyy-MM-dd') : ''
          const inRange = dateStr >= computedFromDate && dateStr <= computedToDate
          
          const issueStr = (f.issue || '').toLowerCase().trim()
          
          const mismatchValues = ['missing', 'extra', 'mismatched-book', 'extra-book', 'mismatch', 'inventory mismatch']
          const isMismatch = mismatchValues.includes(issueStr) || issueStr === 'missing book' || issueStr === 'extra book'
          
          const physicalKeywords = [
            'bleed-through', 'brittle', 'cannot-detach', 'sticky', 'cd-only', 'map-spanning', 'split-pages',
            'cutoff-text', 'illegible', 'inverted-contrast', 'missing-pages', 'no-content', 'obscured',
            'oversized', 'pen-marks', 'pop-up', 'postcard', 'stained', 'dirty', 'stamp-mark', 'thick-cardboard',
            'torn-pages', 'torn', 'dog-ear', 'damage', 'split', 'bleed', 'cut', 'physical', 'dog-ears', 'torn-cover'
          ]
          const isPhysical = physicalKeywords.some(kw => issueStr.includes(kw))

          if (inRange) {
            if (isMismatch) mismatch++
            else if (isPhysical) damage++
          }
          
          if (f.flagged_at) {
            dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            const dayName = days[new Date(f.flagged_at).getDay()]
            dayCounts[dayName]++
          }
        })
        
        setIssueBreakdown({ damage, mismatch })
        
        let dynamicTimeline: any[] = []
          
          if (selectedMonth === -1) {
            const monthCounts: Record<string, number> = {}
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            months.forEach(m => monthCounts[m] = 0)
            
            flagsList.forEach((f: any) => {
              if (!f.flagged_at) return
              const dateStr = format(new Date(f.flagged_at), 'yyyy-MM-dd')
              if (dateStr >= computedFromDate && dateStr <= computedToDate) {
                const mName = format(new Date(f.flagged_at), 'MMM')
                if (monthCounts[mName] !== undefined) monthCounts[mName]++
              }
            })
            
            months.forEach(m => {
              dynamicTimeline.push({ name: m, flags: monthCounts[m] })
            })
          } else {
            const minDate = new Date(computedFromDate)
            const maxDate = new Date(computedToDate)
    
            for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
              const k = format(d, 'yyyy-MM-dd')
              dynamicTimeline.push({ name: format(d, 'MMM dd'), flags: dateCounts[k] || 0 })
            }
          }
          
          setTimelineData(dynamicTimeline)

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
  }, [brand, computedFromDate, computedToDate])

  const resolveFlag = async () => {
    if (!flagToResolve) return;
    
    setResolvingId(flagToResolve.scan_id)
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/dashboard/qc-flags/${flagToResolve.scan_id}/resolve`, {
        method: 'POST'
      })
      if (res.ok) {
        setSessionResolvedFlags(prev => [flagToResolve, ...prev])
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
  }).filter(Boolean) as LotGroup[]

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
    link.setAttribute("download", `non-processable-${brand}-all-time-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const displayFlags = selectedCategory === 'Total' ? flags :
                       selectedCategory === 'Damage' ? flags.filter(f => {
                         const dateStr = f.flagged_at ? format(new Date(f.flagged_at), 'yyyy-MM-dd') : '';
                         const inRange = dateStr >= computedFromDate && dateStr <= computedToDate;
                         const s = (f.issue || '').toLowerCase().trim();
                         const physicalKeywords = [
                           'bleed-through', 'brittle', 'cannot-detach', 'sticky', 'cd-only', 'map-spanning', 'split-pages',
                           'cutoff-text', 'illegible', 'inverted-contrast', 'missing-pages', 'no-content', 'obscured',
                           'oversized', 'pen-marks', 'pop-up', 'postcard', 'stained', 'dirty', 'stamp-mark', 'thick-cardboard',
                           'torn-pages', 'torn', 'dog-ear', 'damage', 'split', 'bleed', 'cut', 'physical', 'dog-ears', 'torn-cover'
                         ];
                         const isPhysical = physicalKeywords.some(kw => s.includes(kw));
                         return inRange && isPhysical;
                       }) :
                       selectedCategory === 'Mismatch' ? flags.filter(f => {
                         const dateStr = f.flagged_at ? format(new Date(f.flagged_at), 'yyyy-MM-dd') : '';
                         const inRange = dateStr >= computedFromDate && dateStr <= computedToDate;
                         const s = (f.issue || '').toLowerCase().trim();
                         const mismatchValues = ['missing', 'extra', 'mismatched-book', 'extra-book', 'mismatch', 'inventory mismatch'];
                         const isMismatch = mismatchValues.includes(s) || s === 'missing book' || s === 'extra book';
                         return inRange && isMismatch;
                       }) :
                       selectedCategory === 'Resolved' ? sessionResolvedFlags :
                       []

  return {
    totalCount,
    issueBreakdown,
    timelineData,
    searchQuery, setSearchQuery,
    selectedYear, setSelectedYear,
    selectedMonth, setSelectedMonth,
    selectedWeek, setSelectedWeek,
    flags,
    resolvingId,
    structuredLots,
    loading,
    sessionResolvedFlags,
    flagToResolve, setFlagToResolve,
    selectedCategory, setSelectedCategory,
    lastUpdated,
    fetchCounts,
    resolveFlag,
    filteredLots,
    exportToCsv,
    displayFlags,
  }
}
