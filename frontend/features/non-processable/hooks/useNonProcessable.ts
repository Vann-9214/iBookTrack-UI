import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { getApiBaseUrl, authFetch } from '@/lib/auth-api'
import { QCFlag, LotGroup, SelectedCategory } from '../types'
import { ISSUE_LABELS } from '../utils/constants'

export function useNonProcessable(brand: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentWeek = Math.ceil((now.getDate() + startOfMonth.getDay()) / 7)


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

  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const [sessionResolvedFlags, setSessionResolvedFlags] = useState<QCFlag[]>([])
  const [flagToResolve, setFlagToResolve] = useState<QCFlag | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory>(null)

  const { data, isLoading, isValidating, mutate } = useSWR(
    brand ? ['non_processable_counts', brand, computedFromDate, computedToDate] : null,
    async () => {
      const res = await authFetch(`${getApiBaseUrl()}/api/dashboard/qc-flags?page=1&limit=1000&box_type=${brand}`)
      if (!res.ok) throw new Error('Failed to fetch counts')
      const json = await res.json()
      
      let flagsList: QCFlag[] = json.flags || []
      flagsList = flagsList.filter((f: any) => f.issue?.toLowerCase().trim() !== 'other')
      
      let damage = 0
      let mismatch = 0
      const dateCounts: Record<string, number> = {}
      
      flagsList.forEach((f: any) => {
        const dateStr = f.flagged_at ? format(new Date(f.flagged_at), 'yyyy-MM-dd') : ''
        const inRange = dateStr >= computedFromDate && dateStr <= computedToDate
        
        const issueStr = (f.issue || '').toLowerCase().trim()
        const mismatchValues = ['mismatch', 'mismatched-book', 'inventory mismatch']
        const isMismatch = mismatchValues.includes(issueStr)
        
        const physicalKeywords = [
          'bleed-through', 'brittle', 'cannot-detach', 'sticky', 'cd-only', 'map-spanning', 'split-pages',
          'cutoff-text', 'illegible', 'inverted-contrast', 'missing-pages', 'no-content', 'obscured',
          'oversized', 'pen-marks', 'pop-up', 'postcard', 'stained', 'dirty', 'stamp-mark', 'thick-cardboard',
          'torn-pages', 'torn', 'dog-ear', 'damage', 'split', 'bleed', 'cut', 'physical', 'dog-ears', 'torn-cover',
          'missing', 'extra'
        ]
        const isPhysical = physicalKeywords.some(kw => issueStr.includes(kw))

        if (inRange) {
          if (isMismatch) mismatch++
          else if (isPhysical) damage++
        }
        
        if (f.flagged_at) {
          dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1
        }
      })
      
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
      
      return {
        totalCount: flagsList.length,
        flags: flagsList,
        issueBreakdown: { damage, mismatch },
        timelineData: dynamicTimeline,
        structuredLots: sortedLots
      }
    },
    { revalidateOnFocus: true, dedupingInterval: 2000 }
  )

  const loading = isLoading || !data
  const isRefreshing = isValidating
  const totalCount = data?.totalCount || 0
  const flags = data?.flags || []
  const issueBreakdown = data?.issueBreakdown || { damage: 0, mismatch: 0 }
  const timelineData = data?.timelineData || []
  const structuredLots = data?.structuredLots || []
  const lastUpdated = data ? new Date() : null

  const fetchCounts = useCallback(async () => {
    await mutate()
  }, [mutate])

  useEffect(() => {
    import('@/lib/auth-api').then(({ getApiBaseUrl }) => {
      const es = new EventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })
      const handleUpdate = () => mutate()
      es.addEventListener('FLAG_UPDATED', handleUpdate)
      es.addEventListener('DASHBOARD_REFRESH', handleUpdate)
      es.onerror = () => console.warn('NonProcessable SSE error - reconnecting')
      return () => es.close()
    })
  }, [mutate])

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



  const displayFlags = selectedCategory === 'Total' ? flags :
                       selectedCategory === 'Damage' ? flags.filter(f => {
                         const dateStr = f.flagged_at ? format(new Date(f.flagged_at), 'yyyy-MM-dd') : '';
                         const inRange = dateStr >= computedFromDate && dateStr <= computedToDate;
                         const s = (f.issue || '').toLowerCase().trim();
                         const physicalKeywords = [
                           'bleed-through', 'brittle', 'cannot-detach', 'sticky', 'cd-only', 'map-spanning', 'split-pages',
                           'cutoff-text', 'illegible', 'inverted-contrast', 'missing-pages', 'no-content', 'obscured',
                           'oversized', 'pen-marks', 'pop-up', 'postcard', 'stained', 'dirty', 'stamp-mark', 'thick-cardboard',
                           'torn-pages', 'torn', 'dog-ear', 'damage', 'split', 'bleed', 'cut', 'physical', 'dog-ears', 'torn-cover',
                           'missing', 'extra'
                         ];
                         const isPhysical = physicalKeywords.some(kw => s.includes(kw));
                         return inRange && isPhysical;
                       }) :
                       selectedCategory === 'Mismatch' ? flags.filter(f => {
                         const dateStr = f.flagged_at ? format(new Date(f.flagged_at), 'yyyy-MM-dd') : '';
                         const inRange = dateStr >= computedFromDate && dateStr <= computedToDate;
                         const s = (f.issue || '').toLowerCase().trim();
                         const mismatchValues = ['mismatch', 'mismatched-book', 'inventory mismatch'];
                         const isMismatch = mismatchValues.includes(s);
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
    isRefreshing,
    sessionResolvedFlags,
    flagToResolve, setFlagToResolve,
    selectedCategory, setSelectedCategory,
    lastUpdated,
    fetchCounts,
    resolveFlag,
    filteredLots,

    displayFlags,
  }
}
