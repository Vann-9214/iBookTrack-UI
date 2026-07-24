import { useState, useEffect } from "react"
import { StorageLocation } from "../types/locator.types"
import { locatorService } from "../services/locator.service"
import { DEFAULT_SECTIONS, DEFAULT_RACKS, DEFAULT_LEVELS, RACK_LETTERS, getSectionRacks, getSectionLevels, getReservedCount } from "../utils/locator.helpers"

export function useStorageTopology(
  locations: StorageLocation[],
  setLocations: React.Dispatch<React.SetStateAction<StorageLocation[]>>,
  loadingLocations: boolean
) {
  const [totalSections, setTotalSections] = useState(DEFAULT_SECTIONS)
  const [activeSection, setActiveSection] = useState(1)
  const [provisioningSection, setProvisioningSection] = useState(false)
  const [removingSection, setRemovingSection] = useState(false)
  const [addingRack, setAddingRack] = useState(false)
  const [removingRack, setRemovingRack] = useState(false)
  const [addingLevel, setAddingLevel] = useState(false)
  const [removingLevel, setRemovingLevel] = useState(false)
  const [warningModal, setWarningModal] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<'rack' | 'level' | null>(null)
  const [pendingAddSection, setPendingAddSection] = useState(false)
  const [confirmRemoveSection, setConfirmRemoveSection] = useState<number | null>(null)
  const [editingCapacity, setEditingCapacity] = useState(false)
  const [capacityInput, setCapacityInput] = useState('')
  const [savingCapacity, setSavingCapacity] = useState(false)

  const provisionSection = async (section: number) => {
    setProvisioningSection(true)
    try {
      const newLocs = await locatorService.provisionSection(section, 38)
      setLocations(prev => {
        const incomingMap = new Map(newLocs.map(l => [`${l.shelf}-${l.rack}-${l.level}`, l]))
        const updated = prev.map(l => incomingMap.get(`${l.shelf}-${l.rack}-${l.level}`) ?? l)
        newLocs.forEach(l => {
          if (!prev.some(p => p.shelf === l.shelf && p.rack === l.rack && p.level === l.level)) {
            updated.push(l)
          }
        })
        return updated
      })
    } catch (e) {
      console.error('Failed to provision section', e)
    } finally {
      setProvisioningSection(false)
    }
  }

  // Auto-provision when switching to a section that has no slots yet
  useEffect(() => {
    if (loadingLocations || provisioningSection) return
    const expectedCount = DEFAULT_RACKS.length * DEFAULT_LEVELS.length
    const sectionRacks = DEFAULT_RACKS
    const existingCount = locations.filter(l => (l.shelf === activeSection && sectionRacks.includes(l.rack))).length
    if (existingCount < expectedCount) {
      provisionSection(activeSection)
    }
  }, [activeSection, locations, loadingLocations, provisioningSection])

  const handleAddRack = async () => {
    const racks = getSectionRacks(locations, activeSection)
    const levels = getSectionLevels(locations, activeSection)
    const nextLetter = RACK_LETTERS[racks.length]
    if (!nextLetter) return
    setAddingRack(true)
    try {
      const newSlots: StorageLocation[] = []
      for (const level of levels) {
        const locs = await locatorService.provisionSection(activeSection, 38, [nextLetter], [level])
        newSlots.push(...locs)
      }
      setLocations(prev => {
        const merged = [...prev]
        for (const loc of newSlots) {
          if (!merged.find(l => l.rack === loc.rack && l.level === loc.level)) merged.push(loc)
        }
        return merged
      })
    } catch (e) {
      console.error('Failed to add rack', e)
    } finally { setAddingRack(false) }
  }

  const handleRemoveRack = async (confirmed = false) => {
    const racks = getSectionRacks(locations, activeSection)
    if (racks.length <= 1) return
    const lastRack = racks[racks.length - 1]
    const lastRackId = lastRack
    const rackLocs = locations.filter(l => l.shelf === activeSection && l.rack === lastRackId)
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
        await locatorService.deleteLocation(loc.id)
      }
      setLocations(prev => prev.filter(l => !(l.shelf === activeSection && l.rack === lastRackId)))
    } catch (e) {
      console.error('Failed to remove rack', e)
    } finally { setRemovingRack(false) }
  }

  const handleAddLevel = async () => {
    const racks = getSectionRacks(locations, activeSection)
    const levels = getSectionLevels(locations, activeSection)
    const nextLevel = Math.max(...levels) + 1
    setAddingLevel(true)
    try {
      const newSlots: StorageLocation[] = []
      for (const rack of racks) {
        const locs = await locatorService.provisionSection(activeSection, 38, [rack], [nextLevel])
        newSlots.push(...locs)
      }
      setLocations(prev => {
        const merged = [...prev]
        for (const loc of newSlots) {
          if (!merged.find(l => l.rack === loc.rack && l.level === loc.level)) merged.push(loc)
        }
        return merged
      })
    } catch (e) {
      console.error('Failed to add level', e)
    } finally { setAddingLevel(false) }
  }

  const handleRemoveLevel = async (confirmed = false) => {
    const racks = getSectionRacks(locations, activeSection)
    const levels = getSectionLevels(locations, activeSection)
    if (levels.length <= 1) return
    const topLevel = Math.max(...levels)
    const rackIds = racks
    const topLocs = locations.filter(l => (l.shelf === activeSection && rackIds.includes(l.rack)) && l.level === topLevel)
    const occupiedLocs = topLocs.filter(l => getReservedCount(l) > 0)
    if (occupiedLocs.length > 0) {
      setWarningModal(
        `Level ${topLevel} has ${occupiedLocs.length} occupied slot${occupiedLocs.length > 1 ? 's' : ''}: ` +
        `${occupiedLocs.map(l => `Rack ${l.rack.includes('-') ? l.rack.split('-')[1] : l.rack} (${getReservedCount(l)} box${getReservedCount(l) !== 1 ? 'es' : ''})`).join(', ')}. ` +
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
        await locatorService.deleteLocation(loc.id)
      }
      setLocations(prev => prev.filter(l => !((l.shelf === activeSection && rackIds.includes(l.rack)) && l.level === topLevel)))
    } catch (e) {
      console.error('Failed to remove level', e)
    } finally { setRemovingLevel(false) }
  }

  const handleRemoveSection = async (section: number, confirmed = false) => {
    if (section <= 1) return
    const sectionRacks = getSectionRacks(locations, section)
    const sectionLocs = locations.filter(l => (l.shelf === activeSection && sectionRacks.includes(l.rack)))
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
        await locatorService.deleteLocation(loc.id)
      }
      setLocations(prev => prev.filter(l => !(l.shelf === activeSection && sectionRacks.includes(l.rack))))
      const newTotal = section - 1
      setTotalSections(newTotal)
      setActiveSection(Math.min(activeSection, newTotal))
    } catch (e) {
      alert('Failed to remove section')
    } finally {
      setRemovingSection(false)
    }
  }

  const handleEditCapacity = async (detailSlot: StorageLocation, setDetailSlot: React.Dispatch<React.SetStateAction<StorageLocation | null>>) => {
    const newCap = parseInt(capacityInput)
    if (isNaN(newCap) || newCap < 1) return
    setSavingCapacity(true)
    try {
      await locatorService.updateCapacity(detailSlot.id, newCap)
      setLocations(prev => prev.map(l => l.id === detailSlot.id ? { ...l, capacity: newCap } : l))
      setDetailSlot(prev => prev ? { ...prev, capacity: newCap } : prev)
      setEditingCapacity(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update capacity')
    } finally {
      setSavingCapacity(false)
    }
  }

  return {
    totalSections,
    setTotalSections,
    activeSection,
    setActiveSection,
    provisioningSection,
    removingSection,
    addingRack,
    removingRack,
    addingLevel,
    removingLevel,
    warningModal,
    setWarningModal,
    pendingRemove,
    setPendingRemove,
    pendingAddSection,
    setPendingAddSection,
    confirmRemoveSection,
    setConfirmRemoveSection,
    editingCapacity,
    setEditingCapacity,
    capacityInput,
    setCapacityInput,
    savingCapacity,
    provisionSection,
    handleAddRack,
    handleRemoveRack,
    handleAddLevel,
    handleRemoveLevel,
    handleRemoveSection,
    handleEditCapacity
  }
}
