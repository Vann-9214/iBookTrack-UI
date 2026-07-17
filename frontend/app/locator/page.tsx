"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Search, MapPin, Package, X, Plus, Minus, Loader2, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Trash2, BookOpen, AlertTriangle, LayoutGrid, Pencil, Check, CheckCircle2, Inbox, Clock, Warehouse } from "lucide-react"
import { RefreshControl } from "@/components/refresh-control"
import { cn } from "@/lib/utils"
import { authFetch } from "@/lib/auth-api"
import { DashboardNavbar } from "@/components/top-bar"
import { useBrand } from "@/hooks/use-brand"

const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is missing in environment variables.')

const RACK_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('')
const DEFAULT_RACKS = ["A", "B", "C", "D"]
const DEFAULT_LEVELS = [4, 3, 2, 1]
const DEFAULT_SECTIONS = 26

// rack_id naming: Section 1 uses bare "A"/"B" for backward compat with existing data;
// sections 2+ use "S{n}-A" etc.
function rackId(section: number, rack: string) {
  return section === 1 ? rack : `S${section}-${rack}`
}

type BookEntry = { isbn: string; title: string }

type Assignment = {
  assignment_id: string
  status?: 'pending' | 'confirmed'
  assigned_at: string
  assigned_by_name: string | null
  box_id: string
  box_number: string
  lot_number: string | null
  total_books: number
  books: BookEntry[]
}

type PendingAssignment = {
  assignment_id: string
  status: 'pending' | 'confirmed'
  assigned_at: string
  assigned_by_name: string | null
  box_id: string
  box_number: string
  lot_number: string | null
  total_books: number
  location_id: string
  rack_id: string
  level: number
  location_label: string
}

type StorageLocation = {
  id: string
  rack_id: string
  level: number
  capacity: number
  used: number
  assignments: Assignment[]
}

type ReadyBox = {
  id: string
  box_number: string
  lot_number: string | null
  total_books: number
  books: BookEntry[]
}

type SearchResult = {
  assignment_id: string
  box_id: string
  box_number: string
  lot_number: string | null
  rack_id: string
  level: number
  location_id: string
  location_label: string
}

export default function WarehouseLocatorPage() {
  const { brand } = useBrand()
  const [totalSections, setTotalSections] = useState(DEFAULT_SECTIONS)
  const [locations, setLocations] = useState<StorageLocation[]>([])
  const [readyBoxes, setReadyBoxes] = useState<ReadyBox[]>([])
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [loadingReady, setLoadingReady] = useState(false)
  const [loadingPending, setLoadingPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  // Search
  const [searchValue, setSearchValue] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchUnlocated, setSearchUnlocated] = useState<{ box_number: string }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set())

  // Section navigation
  const [activeSection, setActiveSection] = useState(1)
  // Capacity editing
  const [editingCapacity, setEditingCapacity] = useState(false)
  const [capacityInput, setCapacityInput] = useState('')
  const [savingCapacity, setSavingCapacity] = useState(false)
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false)
  const sectionDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(e.target as Node)) {
        setSectionDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sectionDropdownOpen])

  // Slot detail modal
  const [detailSlot, setDetailSlot] = useState<StorageLocation | null>(null)
  const [expandedBox, setExpandedBox] = useState<string | null>(null)

  // Assign modal
  const [assignSlot, setAssignSlot] = useState<StorageLocation | null>(null)
  const [assigningBoxIds, setAssigningBoxIds] = useState<Set<string>>(new Set())
  const [selectedReadyBoxIds, setSelectedReadyBoxIds] = useState<Set<string>>(new Set())
  const [assignLoading, setAssignLoading] = useState(false)

  // Remove
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [selectedRemoveAssignments, setSelectedRemoveAssignments] = useState<Set<string>>(new Set())

  // Provisioning all 16 slots for a new section
  const [provisioningSection, setProvisioningSection] = useState(false)
  const [removingSection, setRemovingSection] = useState(false)
  // Dynamic rack/level operations
  const [addingRack, setAddingRack] = useState(false)
  const [removingRack, setRemovingRack] = useState(false)
  const [addingLevel, setAddingLevel] = useState(false)
  const [removingLevel, setRemovingLevel] = useState(false)
  const [warningModal, setWarningModal] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<'rack' | 'level' | null>(null)
  const [pendingAddSection, setPendingAddSection] = useState(false)
  const [confirmRemoveSection, setConfirmRemoveSection] = useState<number | null>(null)

  const fetchLocations = useCallback(async () => {
    setLoadingLocations(true)
    setError(null)
    try {
      const res = await authFetch(`${API_URL}/api/storage/locations`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load storage locations')
      setLocations(data.locations || [])
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoadingLocations(false)
    }
  }, [])

  const fetchReadyBoxes = useCallback(async () => {
    setLoadingReady(true)
    try {
      const res = await authFetch(`${API_URL}/api/storage/ready-boxes?box_type=${brand}`)
      const data = await res.json()
      if (res.ok) setReadyBoxes(data.boxes || [])
    } finally {
      setLoadingReady(false)
    }
  }, [brand])

  const fetchPendingAssignments = useCallback(async () => {
    setLoadingPending(true)
    try {
      const res = await authFetch(`${API_URL}/api/storage/pending-assignments?box_type=${brand}`)
      const data = await res.json()
      if (res.ok) setPendingAssignments(data.assignments || [])
    } finally {
      setLoadingPending(false)
    }
  }, [brand])

  const refreshLocator = useCallback(async () => {
    await Promise.all([fetchLocations(), fetchReadyBoxes(), fetchPendingAssignments()])
  }, [fetchLocations, fetchReadyBoxes, fetchPendingAssignments])

  useEffect(() => { fetchLocations() }, [fetchLocations])

  useEffect(() => {
    if (assignSlot) {
      fetchReadyBoxes()
    }
  }, [brand, assignSlot, fetchReadyBoxes])

  useEffect(() => {
    fetchReadyBoxes()
    fetchPendingAssignments()
  }, [brand, fetchReadyBoxes, fetchPendingAssignments])

  const getLocation = (rack: string, level: number) =>
    locations.find(l => l.rack_id === rack && l.level === level)

  const getPendingCount = (location: StorageLocation) =>
    location.assignments.filter(assignment => assignment.status === 'pending').length

  const getReservedCount = (location: StorageLocation) => location.used + getPendingCount(location)

  const getSectionFromRackId = (rack: string) => {
    const match = rack.match(/^S(\d+)-/)
    return match ? Number(match[1]) : 1
  }

  const getSuggestedLocation = (requiredCapacity = 1) =>
    locations
      .filter(location => location.capacity - getReservedCount(location) >= requiredCapacity)
      .sort((a, b) => {
        const aReserved = getReservedCount(a)
        const bReserved = getReservedCount(b)
        const occupancyDifference = Number(bReserved > 0) - Number(aReserved > 0)
        if (occupancyDifference !== 0) return occupancyDifference
        const capacityDifference = bReserved / b.capacity - aReserved / a.capacity
        if (capacityDifference !== 0) return capacityDifference
        if (aReserved !== bReserved) return bReserved - aReserved
        return a.rack_id.localeCompare(b.rack_id) || a.level - b.level
      })[0]

  // Derive the unique rack letters for a section from actual DB locations
  const getSectionRacks = (section: number): string[] => {
    const prefix = section === 1 ? '' : `S${section}-`
    const raw = locations
      .filter(l => section === 1 ? !l.rack_id.includes('-') : l.rack_id.startsWith(prefix))
      .map(l => section === 1 ? l.rack_id : l.rack_id.replace(prefix, ''))
    const letters = [...new Set(raw)].sort()
    return letters.length > 0 ? letters : DEFAULT_RACKS
  }

  // Derive the unique levels for a section from actual DB locations (descending)
  const getSectionLevels = (section: number): number[] => {
    const prefix = section === 1 ? '' : `S${section}-`
    const raw = locations
      .filter(l => section === 1 ? !l.rack_id.includes('-') : l.rack_id.startsWith(prefix))
      .map(l => l.level)
    const uniq = [...new Set(raw)].sort((a, b) => b - a)
    return uniq.length > 0 ? uniq : DEFAULT_LEVELS
  }

  // Summary stats for a section
  const getSectionStats = (section: number) => {
    const prefix = section === 1 ? '' : `S${section}-`
    const locs = locations.filter(l => section === 1 ? !l.rack_id.includes('-') : l.rack_id.startsWith(prefix))
    const totalUsed = locs.reduce((s, l) => s + l.used, 0)
    const totalCap = locs.reduce((s, l) => s + l.capacity, 0)
    return { totalUsed, totalCap, locCount: locs.length }
  }

  const getCapacityColor = (used: number, capacity: number) => {
    const pct = capacity > 0 ? (used / capacity) * 100 : 0
    if (pct >= 90) return "bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-600"
    if (pct >= 70) return "bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-600"
    if (pct > 0)   return "bg-emerald-100 border-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-600"
    return "bg-gray-200 border-border"
  }

  const getCapacityColorName = (used: number, capacity: number) => {
    const pct = capacity > 0 ? (used / capacity) * 100 : 0
    if (pct >= 70) return pct >= 90 ? "red" : "amber"
    return pct > 0 ? "emerald" : "neutral"
  }

  const getCapacityPercentage = (used: number, capacity: number) => {
    return capacity > 0 ? ((used / capacity) * 100).toFixed(0) : "0"
  }

  const handleSearch = async () => {
    const q = searchValue.trim()
    if (!q) { setHighlightedCells(new Set()); setSearchDone(false); setSearchResults([]); return }
    setSearchLoading(true)
    setSearchDone(false)
    try {
      const res = await authFetch(`${API_URL}/api/storage/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (res.ok) {
        setSearchResults(data.results || [])
        setSearchUnlocated(data.unlocated || [])
        const cells = new Set<string>((data.results || []).map((r: SearchResult) => `${r.rack_id}-${r.level}`))
        setHighlightedCells(cells)
        // Auto-navigate to section of first result
        if ((data.results || []).length > 0) {
          const firstRack: string = data.results[0].rack_id
          // Detect section: bare letters = section 1, "S{n}-X" = section n
          const match = firstRack.match(/^S(\d+)-/)
          setActiveSection(match ? parseInt(match[1]) : 1)
        }
      }
    } finally {
      setSearchLoading(false)
      setSearchDone(true)
    }
  }

  const clearSearch = () => {
    setSearchValue("")
    setHighlightedCells(new Set())
    setSearchResults([])
    setSearchUnlocated([])
    setSearchDone(false)
  }

  const openAssign = async (loc: StorageLocation, boxId?: string) => {
    setAssignSlot(loc)
    setAssigningBoxIds(selectedReadyBoxIds.size > 0 ? new Set(selectedReadyBoxIds) : boxId ? new Set([boxId]) : new Set())
    await fetchReadyBoxes()
  }

  const selectReadyBox = (box: ReadyBox) => {
    const next = new Set(selectedReadyBoxIds)
    if (next.has(box.id)) next.delete(box.id)
    else next.add(box.id)
    setSelectedReadyBoxIds(next)
    const suggestedLocation = getSuggestedLocation(next.size)
    if (suggestedLocation) setActiveSection(getSectionFromRackId(suggestedLocation.rack_id))
  }

  // Add a new rack column (next letter) with slots for every existing level
  const handleAddRack = async () => {
    const racks = getSectionRacks(activeSection)
    const levels = getSectionLevels(activeSection)
    const nextLetter = RACK_LETTERS[racks.length] // next after last existing rack
    if (!nextLetter) return
    setAddingRack(true)
    try {
      const newSlots: StorageLocation[] = []
      for (const level of levels) {
        const res = await authFetch(`${API_URL}/api/storage/locations/provision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: activeSection, racks: [nextLetter], levels: [level], capacity: 38 }),
        })
        const data = await res.json()
        if (res.ok) newSlots.push(...(data.locations || []))
      }
      setLocations(prev => {
        const merged = [...prev]
        for (const loc of newSlots) {
          if (!merged.find(l => l.rack_id === loc.rack_id && l.level === loc.level)) merged.push(loc)
        }
        return merged
      })
    } finally { setAddingRack(false) }
  }

  // Remove the last rack column (only if all its slots are empty)
  const handleRemoveRack = async (confirmed = false) => {
    const racks = getSectionRacks(activeSection)
    if (racks.length <= 1) return
    const lastRack = racks[racks.length - 1]
    const lastRackId = rackId(activeSection, lastRack)
    const rackLocs = locations.filter(l => l.rack_id === lastRackId)
    const occupiedLocs = rackLocs.filter(l => getReservedCount(l) > 0)
    if (occupiedLocs.length > 0) {
      setWarningModal(
        `Rack ${lastRack} has ${occupiedLocs.length} occupied slot${occupiedLocs.length > 1 ? 's' : ''}: ` +
        `${occupiedLocs.map(l => `Level ${l.level} (${getReservedCount(l)} box${getReservedCount(l) !== 1 ? 'es' : ''})`).join(', ')}. ` +
        `Clear all boxes from this rack before removing it.`
      )
      setPendingRemove(null)
      return
    }
    if (!confirmed) { setPendingRemove('rack'); return }
    setRemovingRack(true)
    setPendingRemove(null)
    try {
      for (const loc of rackLocs) {
        await authFetch(`${API_URL}/api/storage/locations/${loc.id}`, { method: 'DELETE' })
      }
      setLocations(prev => prev.filter(l => l.rack_id !== lastRackId))
    } finally { setRemovingRack(false) }
  }

  // Add a new level row with slots for every existing rack
  const handleAddLevel = async () => {
    const racks = getSectionRacks(activeSection)
    const levels = getSectionLevels(activeSection)
    const nextLevel = Math.max(...levels) + 1
    setAddingLevel(true)
    try {
      const newSlots: StorageLocation[] = []
      for (const rack of racks) {
        const res = await authFetch(`${API_URL}/api/storage/locations/provision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: activeSection, racks: [rack], levels: [nextLevel], capacity: 38 }),
        })
        const data = await res.json()
        if (res.ok) newSlots.push(...(data.locations || []))
      }
      setLocations(prev => {
        const merged = [...prev]
        for (const loc of newSlots) {
          if (!merged.find(l => l.rack_id === loc.rack_id && l.level === loc.level)) merged.push(loc)
        }
        return merged
      })
    } finally { setAddingLevel(false) }
  }

  // Remove the highest level row (only if all its slots are empty)
  const handleRemoveLevel = async (confirmed = false) => {
    const racks = getSectionRacks(activeSection)
    const levels = getSectionLevels(activeSection)
    if (levels.length <= 1) return
    const topLevel = Math.max(...levels)
    const rackIds = racks.map(r => rackId(activeSection, r))
    const topLocs = locations.filter(l => rackIds.includes(l.rack_id) && l.level === topLevel)
    const occupiedLocs = topLocs.filter(l => getReservedCount(l) > 0)
    if (occupiedLocs.length > 0) {
      setWarningModal(
        `Level ${topLevel} has ${occupiedLocs.length} occupied slot${occupiedLocs.length > 1 ? 's' : ''}: ` +
        `${occupiedLocs.map(l => `Rack ${l.rack_id.includes('-') ? l.rack_id.split('-')[1] : l.rack_id} (${getReservedCount(l)} box${getReservedCount(l) !== 1 ? 'es' : ''})`).join(', ')}. ` +
        `Clear all boxes from this level before removing it.`
      )
      setPendingRemove(null)
      return
    }
    if (!confirmed) { setPendingRemove('level'); return }
    setRemovingLevel(true)
    setPendingRemove(null)
    try {
      for (const loc of topLocs) {
        await authFetch(`${API_URL}/api/storage/locations/${loc.id}`, { method: 'DELETE' })
      }
      setLocations(prev => prev.filter(l => !(rackIds.includes(l.rack_id) && l.level === topLevel)))
    } finally { setRemovingLevel(false) }
  }

  const handleRemoveSection = async (section: number, confirmed = false) => {
    if (section <= 1) return
    const sectionRacks = getSectionRacks(section).map((r: string) => rackId(section, r))
    const sectionLocs = locations.filter(l => sectionRacks.includes(l.rack_id))
    const hasBoxes = sectionLocs.some(l => getReservedCount(l) > 0)
    if (hasBoxes) {
      const occupied = sectionLocs.filter(l => getReservedCount(l) > 0)
      setWarningModal(
        `Section ${section} still has boxes in ${occupied.length} slot${occupied.length > 1 ? 's' : ''}. ` +
        `Clear all boxes before removing this section.`
      )
      return
    }
    if (!confirmed) { setConfirmRemoveSection(section); return }
    setConfirmRemoveSection(null)
    setRemovingSection(true)
    try {
      for (const loc of sectionLocs) {
        await authFetch(`${API_URL}/api/storage/locations/${loc.id}`, { method: 'DELETE' })
      }
      setLocations(prev => prev.filter(l => !sectionRacks.includes(l.rack_id)))
      const newTotal = section - 1
      setTotalSections(newTotal)
      setActiveSection(Math.min(activeSection, newTotal))
    } catch (e) {
      alert('Failed to remove section')
    } finally {
      setRemovingSection(false)
    }
  }

  const handleEditCapacity = async () => {
    if (!detailSlot) return
    const newCap = parseInt(capacityInput)
    if (isNaN(newCap) || newCap < 1) return
    setSavingCapacity(true)
    try {
      const res = await authFetch(`${API_URL}/api/storage/locations/${detailSlot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capacity: newCap }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed to update capacity'); return }
      setLocations(prev => prev.map(l => l.id === detailSlot.id ? { ...l, capacity: newCap } : l))
      setDetailSlot(prev => prev ? { ...prev, capacity: newCap } : prev)
      setEditingCapacity(false)
    } finally {
      setSavingCapacity(false)
    }
  }

  // Bulk-provision all 16 slots for a section if they don't exist yet
  const provisionSection = async (section: number) => {
    setProvisioningSection(true)
    try {
      const res = await authFetch(`${API_URL}/api/storage/locations/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, capacity: 38 }),
      })
      const data = await res.json()
      if (!res.ok) { console.error(data.error || 'Failed to provision section'); return }
      // Replace/add all 16 slots for this section; preserve assignment data for existing ones
      setLocations(prev => {
        const incoming: StorageLocation[] = data.locations || []
        const incomingKeys = new Set(incoming.map(l => `${l.rack_id}-${l.level}`))
        // Keep all locations NOT belonging to this section, then add the full section set
        const others = prev.filter(l => !incomingKeys.has(`${l.rack_id}-${l.level}`))
        // For each incoming slot, preserve existing assignments/used if already loaded
        const merged = incoming.map(loc => {
          const existing = prev.find(l => l.rack_id === loc.rack_id && l.level === loc.level)
          return existing ?? loc
        })
        return [...others, ...merged]
      })
    } catch (e) {
      console.error('Failed to provision section', e)
    } finally {
      setProvisioningSection(false)
    }
  }

  const handleAssign = async () => {
    if (!assignSlot || assigningBoxIds.size === 0) return
    setAssignLoading(true)
    try {
      const res = await authFetch(`${API_URL}/api/storage/assign/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ box_ids: Array.from(assigningBoxIds), storage_location_id: assignSlot.id }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed to assign boxes'); return }
      setAssignSlot(null)
      setAssigningBoxIds(new Set())
      setSelectedReadyBoxIds(new Set())
      await Promise.all([fetchLocations(), fetchReadyBoxes(), fetchPendingAssignments()])
    } finally {
      setAssignLoading(false)
    }
  }

  const handleConfirmAssignment = async (assignmentId: string) => {
    setConfirmingId(assignmentId)
    try {
      const res = await authFetch(`${API_URL}/api/storage/assignments/${assignmentId}/confirm`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed to confirm placement'); return }
      await Promise.all([fetchLocations(), fetchPendingAssignments()])
    } finally {
      setConfirmingId(null)
    }
  }

  const handleRemovePendingAssignment = async (assignmentId: string) => {
    setRemovingIds(prev => new Set(prev).add(assignmentId))
    try {
      const res = await authFetch(`${API_URL}/api/storage/assignments/batch`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_ids: [assignmentId] }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed to remove pending assignment'); return }
      await Promise.all([fetchLocations(), fetchReadyBoxes(), fetchPendingAssignments()])
    } finally {
      setRemovingIds(prev => {
        const next = new Set(prev)
        next.delete(assignmentId)
        return next
      })
    }
  }

  const handleRemoveBatch = async () => {
    if (selectedRemoveAssignments.size === 0) return
    setRemovingIds(new Set(selectedRemoveAssignments))
    try {
      const res = await authFetch(`${API_URL}/api/storage/assignments/batch`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_ids: Array.from(selectedRemoveAssignments) }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed to remove boxes'); return }
      setSelectedRemoveAssignments(new Set())
      await Promise.all([fetchLocations(), fetchReadyBoxes(), fetchPendingAssignments()])
    } finally {
      setRemovingIds(new Set())
    }
  }

  // Keep detailSlot in sync after location refresh
  useEffect(() => {
    if (detailSlot) {
      const updated = locations.find(l => l.id === detailSlot.id)
      if (updated) setDetailSlot(updated)
    }
  }, [locations])

  // Reset capacity edit state when modal closes
  useEffect(() => {
    if (!detailSlot) { setEditingCapacity(false); setCapacityInput('') }
  }, [detailSlot])

  // Auto-provision when switching to a section that has no slots yet
  useEffect(() => {
    if (loadingLocations || provisioningSection) return
    const expectedCount = DEFAULT_RACKS.length * DEFAULT_LEVELS.length // 16
    const sectionRacks = DEFAULT_RACKS.map(r => rackId(activeSection, r))
    const existingCount = locations.filter(l => sectionRacks.includes(l.rack_id)).length
    if (existingCount < expectedCount) {
      provisionSection(activeSection)
    }
  }, [activeSection, locations, loadingLocations, provisioningSection])

  const sectionRacks = getSectionRacks(activeSection)
  const sectionLevels = getSectionLevels(activeSection)
  const selectedReadyBoxes = readyBoxes.filter(box => selectedReadyBoxIds.has(box.id))
  const suggestedLocation = selectedReadyBoxIds.size > 0 ? getSuggestedLocation(selectedReadyBoxIds.size) : null

  const lastUpdateLabel = lastUpdated
    ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
    : 'Not updated yet'

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6 lg:p-8 pb-safe-6 max-w-7xl mx-auto">

            {/* Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5", brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-indigo-400 to-blue-600')}>
                  <Warehouse className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                    Storage Locator
                  </h1>
                  <p className="mt-1 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    Find the physical location of any box for <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider text-white", brand === 'jaguar' ? 'bg-green-500' : 'bg-blue-500')}>{brand}</span>
                  </p>
                </div>
              </div>
              <RefreshControl onRefresh={refreshLocator} refreshing={loadingLocations || loadingReady || loadingPending} lastUpdated={lastUpdated} storageKey="locator" className="hidden sm:flex" />
            </header>

            {/* Search */}
            <div className="flex items-center gap-2 justify-end">
              <div className="relative flex-1 max-w-lg bg-white">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by ISBN, Box #, or Lot #…"
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="pl-9 h-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={searchLoading} className="h-10 px-5">
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
              {(highlightedCells.size > 0 || searchDone) && (
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={clearSearch}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Search results */}
            {searchDone && (
              <div className="flex flex-col gap-2">
                {searchResults.length > 0 ? (
                  searchResults.map(r => (
                    <div key={r.assignment_id} className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 text-sm">
                        <span className="font-semibold text-foreground">{r.box_number}</span>
                        {r.lot_number && <span className="text-muted-foreground ml-2">· {r.lot_number.toLowerCase().startsWith('lot') ? r.lot_number : `Lot ${r.lot_number}`}</span>}
                      </div>
                      <span className="text-sm font-semibold text-primary">{r.location_label}</span>
                      <button onClick={() => {
                        const loc = locations.find(l => l.id === r.location_id)
                        if (loc) {
                          const match = loc.rack_id.match(/^S(\d+)-/)
                          setActiveSection(match ? parseInt(match[1]) : 1)
                          setDetailSlot(loc)
                        }
                      }} className="text-xs underline text-muted-foreground hover:text-foreground">View slot</button>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      No located box found for &ldquo;{searchValue}&rdquo;.
                      {searchUnlocated.length > 0 && ` Found box(es) not yet assigned to a storage location: ${searchUnlocated.map(u => u.box_number).join(', ')}`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-5 text-xs text-muted-foreground flex-wrap justify-center">
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-emerald-400 bg-emerald-100" /><span>&lt; 70% full</span></div>
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-amber-400 bg-amber-100" /><span>70–90% full</span></div>
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-red-400 bg-red-100" /><span>&gt; 90% full</span></div>
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-border bg-muted" /><span>Empty</span></div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Warehouse Grid */}  
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(260px,1fr)_3fr_minmax(260px,1fr)] gap-4 items-start">
              {/* Unassigned storage boxes (left) */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col h-fit max-h-[640px]">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                  <Inbox className="h-4 w-4 text-primary shrink-0" />
                  <h3 className="text-sm font-semibold text-card-foreground">Unassigned Boxes</h3>
                  <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                    {readyBoxes.length}
                  </span>
                </div>
                {loadingReady ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Loading unassigned boxes…</span>
                  </div>
                ) : readyBoxes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground">
                    <Package className="h-7 w-7 opacity-30" />
                    <p className="text-xs">No unassigned boxes</p>
                    <p className="text-[10px] max-w-[200px]">Scan-stage boxes with completed transmission will appear here.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto -mr-1 pr-1 space-y-2 min-h-0">
                    {readyBoxes.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => selectReadyBox(b)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                          selectedReadyBoxIds.has(b.id)
                            ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                            : "border-border bg-muted/40 hover:border-primary/50 hover:bg-primary/5"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">{b.box_number}</span>
                        </div>
                        {b.lot_number && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {b.lot_number.toLowerCase().startsWith('lot') ? b.lot_number : `Lot ${b.lot_number}`}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {b.books.length} book{b.books.length !== 1 ? 's' : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Center warehouse layout */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-primary shrink-0" />
                    <h2 className="text-sm font-semibold text-card-foreground">Storage Layout</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const { totalUsed, totalCap } = getSectionStats(activeSection)
                      const pct = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0
                      return totalCap > 0 ? (
                        <span className="text-xs text-muted-foreground">{totalUsed}/{totalCap} boxes ({pct}% used)</span>
                      ) : null
                    })()}
                    <div className="relative" ref={sectionDropdownRef}>
                      <Button
                        variant="secondary"
                        className="h-9 gap-2 px-3 bg-white text-foreground hover:bg-primary hover:text-white transition border border-border"
                        onClick={() => setSectionDropdownOpen(o => !o)}
                      >
                        <LayoutGrid className="h-4 w-4" />
                        <span className="text-sm">Section {activeSection}</span>
                        {sectionDropdownOpen
                          ? <ChevronUp className="h-3.5 w-3.5" />
                          : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                      {sectionDropdownOpen && (
                        <div className="absolute right-0 top-full mt-1.5 z-30 w-64 rounded-xl border border-border bg-card shadow-lg p-3">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Select Section</p>
                          <div className="grid grid-cols-5 gap-1.5">
                            {Array.from({ length: totalSections }, (_, i) => i + 1).map(s => {
                              const { totalUsed, totalCap, locCount } = getSectionStats(s)
                              const pct = totalCap > 0 ? (totalUsed / totalCap) * 100 : 0
                              const dotColor = locCount === 0 ? 'bg-muted-foreground/25' : pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : pct > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/25'
                              return (
                                <button
                                  key={s}
                                  onClick={() => { setActiveSection(s); setSectionDropdownOpen(false) }}
                                  className={cn(
                                    "flex flex-col items-center justify-center gap-1 h-10 rounded-lg border text-xs font-semibold transition-all",
                                    activeSection === s
                                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                      : "bg-background text-foreground border-border hover:border-primary/60 hover:bg-muted/60"
                                  )}
                                >
                                  <span>{s}</span>
                                  <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
                                </button>
                              )
                            })}
                          </div>
                          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-end py-4">
                            <div className="flex items-center gap-4.5 flex-wrap">
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-emerald-500" />Active</span>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-amber-500" />70–90%</span>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-red-500" />&gt;90%</span>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-muted-foreground/25" />Empty</span>
                            </div>
                          </div>
                            <div className="flex items-center gap-1.5 justify-end">
                              {totalSections > 1 && (
                                <button
                                  onClick={() => handleRemoveSection(totalSections)}
                                  disabled={removingSection}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-destructive/50 text-[11px] font-medium text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
                                  title={`Remove Section ${totalSections}`}
                                >
                                  {removingSection ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                  Remove
                                </button>
                              )}
                              <button
                                onClick={() => { setPendingAddSection(true); setSectionDropdownOpen(false) }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-primary/50 text-[11px] font-medium text-primary hover:bg-primary/5 transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                                Add
                              </button>
                            </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedReadyBoxes.length > 0 && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {suggestedLocation
                      ? <>Suggested for <strong>{selectedReadyBoxes.length} selected box{selectedReadyBoxes.length !== 1 ? 'es' : ''}</strong>: Rack {suggestedLocation.rack_id} — Level {suggestedLocation.level}. Click any available slot to assign.</>
                      : <>No storage slot currently has available capacity for the selected boxes.</>}
                  </div>
                )}

                {loadingLocations ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm">Loading storage map…</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-[2rem_1px_minmax(0,1fr)_1px_2rem] items-start gap-3">
                      {/* Level controls */}
                      <div className="flex flex-col items-start gap-1">
                        <span className="mb-1 text-left text-xs font-medium text-muted-foreground">Level</span>
                        <button
                          onClick={handleAddLevel}
                          disabled={addingLevel}
                          title="Add level"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                        >
                          {addingLevel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => handleRemoveLevel()}
                          disabled={removingLevel || sectionLevels.length <= 1}
                          title={`Remove level ${Math.max(...sectionLevels)}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                        >
                          {removingLevel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      <div className="h-[5.5rem] bg-border" />

                      {/* Rack headers and storage slots */}
                      <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: `1em repeat(${sectionRacks.length}, minmax(0, 1fr))` }}>
                        <div />
                        {sectionRacks.map(r => (
                          <div key={r} className="pb-1 text-center text-sm font-semibold text-foreground">Rack {r}</div>
                        ))}

                        {sectionLevels.map(level => (
                          <div key={level} className="contents">
                            <div className="flex aspect-square items-center justify-start pl-0 text-sm font-semibold text-foreground">{level}</div>
                            {sectionRacks.map(rack => {
                              const loc = getLocation(rackId(activeSection, rack), level)
                              const isHighlighted = highlightedCells.has(`${rackId(activeSection, rack)}-${level}`)
                              const isSuggested = suggestedLocation?.id === loc?.id
                              const pendingCount = loc ? getPendingCount(loc) : 0
                              const used = loc?.used ?? 0
                              const capacity = loc?.capacity ?? 20
                              const canFitSelected = capacity - used - pendingCount >= selectedReadyBoxIds.size
                              return (
                                <button
                                  key={`${rack}-${level}`}
                                  onClick={() => {
                                    if (!loc) return
                                    if (selectedReadyBoxIds.size > 0 && canFitSelected) {
                                      openAssign(loc)
                                      return
                                    }
                                    setDetailSlot(loc)
                                  }}
                                  disabled={!loc}
                                  title={loc ? `${selectedReadyBoxIds.size > 0 && canFitSelected ? `Assign ${selectedReadyBoxIds.size} selected box${selectedReadyBoxIds.size !== 1 ? 'es' : ''} to ` : ''}Rack ${rackId(activeSection, rack)} — Level ${level} (${used}/${capacity})` : undefined}
                                  className={cn(
                                    "aspect-square rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
                                    loc ? pendingCount > 0 && used === 0 ? "bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-600" : getCapacityColor(used, capacity) : "bg-muted border-border opacity-40",
                                    isHighlighted && "ring-4 ring-primary ring-offset-2 ring-offset-background scale-105 z-10",
                                    isSuggested && "ring-4 ring-primary ring-offset-2 ring-offset-background scale-105 z-10 animate-pulse",
                                    loc && "hover:scale-105 hover:shadow-md cursor-pointer"
                                  )}
                                >
                                  {provisioningSection && !loc ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
                                  ) : loc && pendingCount > 0 ? (
                                    <>
                                      <Package className="h-4 w-4 text-foreground/60" />
                                      <span className="text-[10px] font-semibold text-foreground/70 leading-tight">{used}/{capacity}</span>
                                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"><Clock className="h-2.5 w-2.5" />{pendingCount} pending</span>
                                    </>
                                  ) : loc && used > 0 ? (
                                    <>
                                      <Package className="h-4 w-4 text-foreground/60" />
                                      <span className="text-[10px] font-semibold text-foreground/70 leading-tight">{used}/{capacity}</span>
                                    </>
                                  ) : loc ? (
                                    <Plus className="h-4 w-4 text-muted-foreground/40" />
                                  ) : null}
                                </button>
                              )
                            })}
                          </div>
                        ))}
                      </div>

                      <div className="h-[5.5rem] bg-border" />

                      {/* Rack controls */}
                      <div className="flex flex-col items-end gap-1">
                        <span className="mb-1 text-right text-xs font-medium text-muted-foreground">Racks</span>
                        <button
                          onClick={handleAddRack}
                          disabled={addingRack || sectionRacks.length >= RACK_LETTERS.length}
                          title="Add a new rack"
                          aria-label="Add a new rack"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                        >
                          {addingRack ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => handleRemoveRack()}
                          disabled={removingRack || sectionRacks.length <= 1}
                          title={`Remove last rack (${sectionRacks.at(-1)})`}
                          aria-label={`Remove last rack ${sectionRacks.at(-1)}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                        >
                          {removingRack ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Pending assignment (right) */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col h-fit max-h-[640px]">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <h3 className="text-sm font-semibold text-card-foreground">Pending Assignment</h3>
                  <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500/10 px-1.5 text-[10px] font-semibold text-amber-600">
                    {pendingAssignments.length}
                  </span>
                </div>
                {loadingPending ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Loading pending assignments…</span>
                  </div>
                ) : pendingAssignments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground">
                    <CheckCircle2 className="h-7 w-7 opacity-30" />
                    <p className="text-xs">No pending assignments</p>
                    <p className="text-[10px] max-w-[200px]">Assigned boxes awaiting physical placement confirmation will appear here.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto -mr-1 pr-1 space-y-2 min-h-0">
                    {pendingAssignments.map(a => (
                      <div key={a.assignment_id} className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">{a.box_number}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {a.location_label}
                        </div>
                        <div className="mt-2 flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            disabled={removingIds.has(a.assignment_id)}
                            onClick={() => handleRemovePendingAssignment(a.assignment_id)}
                          >
                            {removingIds.has(a.assignment_id) ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Trash2 className="h-3 w-3 mr-1" />
                            )}
                            Remove
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={confirmingId === a.assignment_id || removingIds.has(a.assignment_id)}
                            onClick={() => handleConfirmAssignment(a.assignment_id)}
                          >
                            {confirmingId === a.assignment_id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            Confirm
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Slot Detail Modal ─────────────────────────────────────────── */}
      {detailSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setDetailSlot(null); setExpandedBox(null) }}>
          <div className={cn(
            "rounded-xl shadow-xl p-5 w-full max-w-xl mx-4 max-h-[85vh] flex flex-col",
            {
              "bg-white dark:bg-white border-2 border-red-400 dark:border-red-600": getCapacityColorName(detailSlot.used, detailSlot.capacity) === "red",
              "bg-white dark:bg-white border-2 border-amber-400 dark:border-amber-600": getCapacityColorName(detailSlot.used, detailSlot.capacity) === "amber",
              "bg-white dark:bg-white border-2 border-emerald-400 dark:border-emerald-600": getCapacityColorName(detailSlot.used, detailSlot.capacity) === "emerald",
              "bg-card border border-border": getCapacityColorName(detailSlot.used, detailSlot.capacity) === "neutral"
            }
          )} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  Rack {detailSlot.rack_id} — Level {detailSlot.level}
                </h3>
                {editingCapacity ? (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-xs text-muted-foreground">{detailSlot.used} used /</span>
                    <input
                      type="number"
                      min={getReservedCount(detailSlot)}
                      value={capacityInput}
                      onChange={e => setCapacityInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEditCapacity(); if (e.key === 'Escape') setEditingCapacity(false) }}
                      className="w-16 h-6 text-xs border border-primary rounded px-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                    <span className="text-xs text-muted-foreground">max</span>
                    <button onClick={handleEditCapacity} disabled={savingCapacity} className="p-0.5 text-primary hover:bg-primary/10 rounded">
                      {savingCapacity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => setEditingCapacity(false)} className="p-0.5 text-muted-foreground hover:bg-muted rounded">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-muted-foreground">
                      {detailSlot.used} of {detailSlot.capacity} boxes used ({getCapacityPercentage(detailSlot.used, detailSlot.capacity)}%)
                      {getPendingCount(detailSlot) > 0 ? ` · ${getPendingCount(detailSlot)} pending` : ''}
                    </p>
                    <button
                      onClick={() => { setCapacityInput(String(detailSlot.capacity)); setEditingCapacity(true) }}
                      className="p-0.5 text-primary bg-primary/10 border-primary/40 border hover:text-foreground hover:bg-foreground/20 hover:border-foreground/40 rounded transition-colors"
                      title="Edit capacity"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => { setDetailSlot(null); setExpandedBox(null) }} className="text-muted-foreground hover:text-foreground text-lg leading-none ml-3">✕</button>
            </div>

            {/* Progress */}
            <div className="mb-3">
              <Progress value={(detailSlot.used / detailSlot.capacity) * 100} className="h-2" />
            </div>

            {/* Assign button */}
            {getReservedCount(detailSlot) < detailSlot.capacity && (
              <button
                onClick={() => { setDetailSlot(null); openAssign(detailSlot) }}
                className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 py-2.5 text-sm text-primary font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Assign a box to this slot
              </button>
            )}

            {/* Box list */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
              {detailSlot.assignments.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  This slot is empty
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="select-all"
                        checked={detailSlot.assignments.every(a => selectedRemoveAssignments.has(a.assignment_id))}
                        onChange={() => {
                          const all = new Set(detailSlot.assignments.map(a => a.assignment_id))
                          setSelectedRemoveAssignments(prev => {
                            const current = new Set(prev)
                            const allSelected = detailSlot.assignments.every(a => current.has(a.assignment_id))
                            if (allSelected) {
                              detailSlot.assignments.forEach(a => current.delete(a.assignment_id))
                            } else {
                              detailSlot.assignments.forEach(a => current.add(a.assignment_id))
                            }
                            return current
                          })
                        }}
                        className="h-4 w-4"
                      />
                      <label htmlFor="select-all" className="text-xs text-muted-foreground">
                        Select all
                      </label>
                    </div>
                    {selectedRemoveAssignments.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveBatch}
                        disabled={removingIds.size > 0}
                        className="h-8 gap-1.5"
                      >
                        {removingIds.size > 0 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Remove {selectedRemoveAssignments.size} box{selectedRemoveAssignments.size !== 1 ? 'es' : ''}
                      </Button>
                    )}
                  </div>
                  {detailSlot.assignments.map(a => (
                    <div key={a.assignment_id} className={cn(
                      "rounded-lg border bg-muted/40 transition-colors",
                      selectedRemoveAssignments.has(a.assignment_id) ? "border-primary bg-primary/5" : "border-border"
                    )}>
                      {/* Box row */}
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedRemoveAssignments.has(a.assignment_id)}
                          onChange={() => {
                            setSelectedRemoveAssignments(prev => {
                              const next = new Set(prev)
                              if (next.has(a.assignment_id)) next.delete(a.assignment_id)
                              else next.add(a.assignment_id)
                              return next
                            })
                          }}
                          className="h-4 w-4 shrink-0"
                        />
                        <button
                          className="flex items-center gap-2 flex-1 min-w-0 text-left"
                          onClick={() => setExpandedBox(expandedBox === a.assignment_id ? null : a.assignment_id)}
                        >
                          {expandedBox === a.assignment_id
                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          <Package className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm font-semibold text-foreground truncate">{a.box_number}</span>
                          {a.lot_number && <span className="text-xs text-muted-foreground shrink-0">{a.lot_number.toLowerCase().startsWith('lot') ? a.lot_number : `Lot ${a.lot_number}`}</span>}
                          <span className="text-xs text-muted-foreground ml-auto shrink-0">
                            <BookOpen className="inline h-3 w-3 mr-0.5" />{a.books.length} books
                          </span>
                        </button>
                      </div>

                      {/* Expanded ISBN/title list */}
                      {expandedBox === a.assignment_id && (
                        <div className="border-t border-border px-3 pb-2 pt-1 max-h-48 overflow-y-auto">
                          {a.books.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2 italic">No scanned books recorded for this box</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground border-b border-border/40">
                                  <th className="text-left py-1 font-medium">ISBN</th>
                                  <th className="text-left py-1 font-medium">Title</th>
                                </tr>
                              </thead>
                              <tbody>
                                {a.books.map((b, i) => (
                                  <tr key={i} className="border-b border-border/20 last:border-0">
                                    <td className="py-1 pr-3 text-foreground whitespace-nowrap">{b.isbn}</td>
                                    <td className="py-1 text-muted-foreground truncate max-w-[200px]" title={b.title}>{b.title}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Box Modal ──────────────────────────────────────────── */}
      {assignSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !assignLoading && setAssignSlot(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-lg mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Assign Box to Slot</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Rack {assignSlot.rack_id} — Level {assignSlot.level} &nbsp;·&nbsp; {assignSlot.used}/{assignSlot.capacity} used{getPendingCount(assignSlot) > 0 ? ` · ${getPendingCount(assignSlot)} pending` : ''}
                </p>
              </div>
              {!assignLoading && (
                <button onClick={() => setAssignSlot(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
              )}
            </div>

            {loadingReady ? (
              <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading boxes ready for storage…</span>
              </div>
            ) : readyBoxes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <Package className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No boxes are waiting to be placed.</p>
                <p className="text-xs text-muted-foreground">Scan-stage boxes appear here after their transmission is completed.</p>
              </div>
            ) : (
              <>
                {(() => {
                  const remainingCapacity = assignSlot ? Math.max(0, assignSlot.capacity - getReservedCount(assignSlot)) : 0
                  const selectableIds = readyBoxes.slice(0, remainingCapacity).map(b => b.id)
                  const maxSelectable = Math.min(remainingCapacity, readyBoxes.length)
                  const allSelectableSelected = maxSelectable > 0 && assigningBoxIds.size >= maxSelectable
                  const atCapacity = assigningBoxIds.size >= remainingCapacity
                  return (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="assign-select-all"
                            checked={allSelectableSelected}
                            onChange={() => {
                              if (allSelectableSelected) {
                                setAssigningBoxIds(new Set())
                              } else {
                                setAssigningBoxIds(new Set(selectableIds))
                              }
                            }}
                            className="h-4 w-4"
                          />
                          <label htmlFor="assign-select-all" className="text-xs text-muted-foreground">Select up to {remainingCapacity} box{remainingCapacity !== 1 ? 'es' : ''}</label>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {assigningBoxIds.size} of {readyBoxes.length} selected · {remainingCapacity} spot{remainingCapacity !== 1 ? 's' : ''} left
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-4">
                        {readyBoxes.map((b) => {
                          const disabled = !assigningBoxIds.has(b.id) && atCapacity
                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                if (disabled) return
                                setAssigningBoxIds(prev => {
                                  const next = new Set(prev)
                                  if (next.has(b.id)) next.delete(b.id)
                                  else if (next.size < remainingCapacity) next.add(b.id)
                                  return next
                                })
                              }}
                              className={cn(
                                "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                                assigningBoxIds.has(b.id)
                                  ? "border-primary bg-primary/10 cursor-pointer"
                                  : disabled
                                    ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                                    : "border-border hover:bg-muted/60 cursor-pointer"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={assigningBoxIds.has(b.id)}
                                disabled={disabled}
                                onChange={() => {
                                  if (disabled) return
                                  setAssigningBoxIds(prev => {
                                    const next = new Set(prev)
                                    if (next.has(b.id)) next.delete(b.id)
                                    else if (next.size < remainingCapacity) next.add(b.id)
                                    return next
                                  })
                                }}
                                onClick={e => e.stopPropagation()}
                                className="h-4 w-4 shrink-0"
                              />
                              <Package className="h-4 w-4 text-primary shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">{b.box_number}</p>
                                {b.lot_number && <p className="text-xs text-muted-foreground">{b.lot_number.toLowerCase().startsWith('lot') ? b.lot_number : `Lot ${b.lot_number}`}</p>}
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0">
                                <BookOpen className="inline h-3 w-3 mr-0.5" />{b.books.length} books
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )
                })()}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setAssignSlot(null)} disabled={assignLoading}>Cancel</Button>
                  <Button onClick={handleAssign} disabled={assigningBoxIds.size === 0 || assignLoading}>
                    {assignLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Assign {assigningBoxIds.size} Box{assigningBoxIds.size !== 1 ? 'es' : ''}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Confirm Remove Section Modal ─────────────────────────────── */}
      {confirmRemoveSection !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmRemoveSection(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Remove Section {confirmRemoveSection}?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This will permanently delete all {getSectionRacks(confirmRemoveSection).length * getSectionLevels(confirmRemoveSection).length} slot records for Section {confirmRemoveSection}. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmRemoveSection(null)} disabled={removingSection}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={removingSection}
                onClick={() => handleRemoveSection(confirmRemoveSection, true)}
              >
                {removingSection ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Yes, Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Remove Rack / Level Modal ───────────────────────── */}
      {pendingRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPendingRemove(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Remove {pendingRemove === 'rack' ? `Rack ${sectionRacks.at(-1)}` : `Level ${Math.max(...sectionLevels)}`}?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This will permanently delete the {pendingRemove} and all its slot records from Section {activeSection}. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPendingRemove(null)} disabled={removingRack || removingLevel}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={removingRack || removingLevel}
                onClick={() => pendingRemove === 'rack' ? handleRemoveRack(true) : handleRemoveLevel(true)}
              >
                {removingRack || removingLevel ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Yes, Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Add Section Modal ─────────────────────────────────── */}
      {pendingAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPendingAddSection(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Add Section {totalSections + 1}?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This will create a new section with the default rack and level layout.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPendingAddSection(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  const next = totalSections + 1
                  setTotalSections(next)
                  setActiveSection(next)
                  setPendingAddSection(false)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Yes, Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Warning Modal ──────────────────────────────────────────────── */}
      {warningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setWarningModal(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Cannot Remove</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{warningModal}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setWarningModal(null)}>Got it</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
