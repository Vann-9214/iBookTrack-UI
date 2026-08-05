import { StorageLocation, PendingAssignment, ReadyBox, SearchResult } from "../types/locator.types"

export const RACK_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('')
export const DEFAULT_RACKS = ["A", "B", "C", "D"]
export const DEFAULT_LEVELS = [4, 3, 2, 1]
export const DEFAULT_SECTIONS = 26

export function getPendingCount(location: StorageLocation): number {
  return location.assignments.filter(assignment => assignment.status === 'pending').length
}

export function getReservedCount(location: StorageLocation): number {
  return location.used + getPendingCount(location)
}

export function getSuggestedLocation(locations: StorageLocation[], requiredCapacity = 1): StorageLocation | undefined {
  return locations
    .filter(location => location.capacity - getReservedCount(location) >= requiredCapacity)
    .sort((a, b) => {
      // Prioritize lower section numbers (e.g. Section 1 before Section 2)
      const shelfDiff = (a.shelf || 1) - (b.shelf || 1)
      if (shelfDiff !== 0) return shelfDiff

      // Within the same section, prioritize partially occupied slots to fill them up first
      const aReserved = getReservedCount(a)
      const bReserved = getReservedCount(b)
      const occupancyDifference = Number(bReserved > 0) - Number(aReserved > 0)
      if (occupancyDifference !== 0) return occupancyDifference

      // If both are partially occupied, pick the one with higher occupancy percentage
      const capacityDifference = (bReserved / b.capacity) - (aReserved / a.capacity)
      if (capacityDifference !== 0) return capacityDifference

      // Fallback to Rack order (A, B, C...) then Level order (1, 2, 3...)
      return a.rack.localeCompare(b.rack) || a.level - b.level
    })[0]
}

export function getSectionRacks(locations: StorageLocation[], section: number): string[] {
  const raw = locations
    .filter(l => l.shelf === section)
    .map(l => l.rack)
  const letters = [...new Set(raw)].sort()
  return letters.length > 0 ? letters : DEFAULT_RACKS
}

export function getSectionLevels(locations: StorageLocation[], section: number): number[] {
  const raw = locations
    .filter(l => l.shelf === section)
    .map(l => l.level)
  const uniq = [...new Set(raw)].sort((a, b) => b - a)
  return uniq.length > 0 ? uniq : DEFAULT_LEVELS
}

export function getSectionStats(locations: StorageLocation[], section: number) {
  const locs = locations.filter(l => l.shelf === section)
  const totalUsed = locs.reduce((s, l) => s + l.used, 0)
  const totalCap = locs.reduce((s, l) => s + l.capacity, 0)
  return { totalUsed, totalCap, locCount: locs.length }
}

export function getCapacityColor(used: number, capacity: number): string {
  const pct = capacity > 0 ? (used / capacity) * 100 : 0
  if (pct >= 90) return "bg-red-100 border-red-300 dark:bg-red-950/40 dark:border-red-800 text-red-700 dark:text-red-400"
  if (pct >= 70) return "bg-amber-100 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 text-amber-700 dark:text-amber-400"
  if (pct > 0)   return "bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-700 dark:text-primary"
  return "bg-muted/40 border-border text-muted-foreground"
}

export function getCapacityColorName(used: number, capacity: number): 'red' | 'amber' | 'emerald' | 'neutral' {
  const pct = capacity > 0 ? (used / capacity) * 100 : 0
  if (pct >= 70) return pct >= 90 ? "red" : "amber"
  return pct > 0 ? "emerald" : "neutral"
}

export function getCapacityPercentage(used: number, capacity: number): string {
  return capacity > 0 ? ((used / capacity) * 100).toFixed(0) : "0"
}
