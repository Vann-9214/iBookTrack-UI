import { authFetch } from "@/lib/auth-api"
import { StorageLocation, ReadyBox, PendingAssignment, SearchResult } from "../types/locator.types"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const locatorService = {
  async fetchLocations(): Promise<StorageLocation[]> {
    const res = await authFetch(`${API_URL}/api/storage/locations`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load storage locations')
    return data.locations || []
  },

  async fetchReadyBoxes(brand: string): Promise<ReadyBox[]> {
    const res = await authFetch(`${API_URL}/api/storage/ready-boxes?box_type=${brand}`)
    const data = await res.json()
    if (res.ok) return data.boxes || []
    return []
  },

  async fetchPendingAssignments(brand: string): Promise<PendingAssignment[]> {
    const res = await authFetch(`${API_URL}/api/storage/pending-assignments?box_type=${brand}`)
    const data = await res.json()
    if (res.ok) return data.assignments || []
    return []
  },

  async searchStorage(query: string, brand: string, kind: string): Promise<{ results: SearchResult[]; unlocated: { box_number: string }[]; lot_summary?: { lot_numbers: string[] } }> {
    const res = await authFetch(`${API_URL}/api/storage/search?q=${encodeURIComponent(query)}&box_type=${encodeURIComponent(brand)}&search_type=${kind}`)
    const data = await res.json()
    if (res.ok) {
      return {
        results: data.results || [],
        unlocated: data.unlocated || [],
        lot_summary: data.lot_summary
      }
    }
    return { results: [], unlocated: [] }
  },

  async provisionSection(section: number, capacity = 38, racks?: string[], levels?: number[]): Promise<StorageLocation[]> {
    const body: Record<string, unknown> = { section, capacity }
    if (racks) body.racks = racks
    if (levels) body.levels = levels

    const res = await authFetch(`${API_URL}/api/storage/locations/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to provision storage locations')
    return data.locations || []
  },

  async updateCapacity(locationId: string, capacity: number): Promise<void> {
    const res = await authFetch(`${API_URL}/api/storage/locations/${locationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capacity }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to update capacity')
  },

  async deleteLocation(locationId: string): Promise<void> {
    const res = await authFetch(`${API_URL}/api/storage/locations/${locationId}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to delete storage location')
    }
  },

  async assignBatch(boxIds: string[], locationId: string): Promise<void> {
    const res = await authFetch(`${API_URL}/api/storage/assign/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ box_ids: boxIds, storage_location_id: locationId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to assign boxes')
  },

  async confirmAssignment(assignmentId: string): Promise<void> {
    const res = await authFetch(`${API_URL}/api/storage/assignments/${assignmentId}/confirm`, {
      method: 'POST'
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to confirm placement')
  },

  async removeAssignmentsBatch(assignmentIds: string[]): Promise<void> {
    const res = await authFetch(`${API_URL}/api/storage/assignments/batch`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignment_ids: assignmentIds }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to remove assignments')
  }
}
