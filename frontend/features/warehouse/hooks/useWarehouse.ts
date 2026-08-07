'use client'

import { useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { useToast } from '@/hooks/use-toast'
import { fetchUserProfile, getApiBaseUrl } from '@/lib/auth-api'
import { useBrand } from '@/hooks/use-brand'
import { useWarehouseState } from './useWarehouseState'
import { useWarehouseIsbnStream } from './useWarehouseIsbnStream'
import { useWarehouseSession } from './useWarehouseSession'
import { useWarehouseScans } from './useWarehouseScans'
import { useWarehouseSSE } from './useWarehouseSSE'
import { fetchLots } from '../services/warehouse.service'

export function useWarehouse() {
  const { brand } = useBrand()
  const core = useWarehouseState()
  const { toast } = useToast()
  const { data, isLoading, isValidating, error, mutate } = useSWR(
    'warehouse_lots',
    fetchLots,
    { 
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  )

  const lotsLoading = isLoading || !data
  const isRefreshing = isValidating
  const lots = data || []

  const session = useWarehouseSession(core, lots, mutate)
  const scans = useWarehouseScans(core)

  const lotsError = error ? (error.message || 'Failed to connect to iLMS.') : null

  const { lockedWarehouseBoxes } = useWarehouseSSE({
    onUnlocked: (box) => {
      // If the currently active session's box was just unlocked by a supervisor,
      // force the session to clear.
      if (core.sessionActive && core.activeLot.trim().toLowerCase() === (box.lot_number || '').trim().toLowerCase() && core.selectedBox.trim() === (box.box_number || '').trim()) {
        session.clearSession()
        toast({ title: 'Session Terminated', description: 'Your session was closed by an administrator.', variant: 'destructive' })
      }
    },
    onRefreshNeeded: () => {
      mutate()
    }
  })

  useWarehouseIsbnStream(core.sessionActive)

  const {
    setUserName, setUserId, setLastStatsUpdate,
    setRefreshingStats, sessionActive, currentSessionRef, sessionActiveRef,
  } = core

  // Live lock check: name of the user currently processing the typed lot/box
  // combination (null when the box is free or locked by the current user).
  const boxLockedBy = useMemo(() => {
    const lot = core.activeLot.trim().toLowerCase()
    const box = core.selectedBox.trim()
    if (!lot || !box) return null
    const match = lockedWarehouseBoxes.find((l) =>
      (l.lot_number || '').trim().toLowerCase() === lot &&
      (l.box_number || '').trim() === box &&
      (!brand || (l.box_type || '').toLowerCase() === brand.toLowerCase())
    )
    if (!match) return null
    if (core.userId && match.user_id === core.userId) return null
    return match.user_name || 'another user'
  }, [lockedWarehouseBoxes, core.activeLot, core.selectedBox, brand, core.userId])

  const loadLots = async () => {
    await mutate()
  }

  const handleRefreshStats = async () => {
    setRefreshingStats(true)
    try {
      await mutate()
      setLastStatsUpdate(new Date())
      toast({ title: 'Lots Refreshed', description: 'Warehouse lot list synchronized successfully.' })
    } catch {
      core.setSessionError('Failed to refresh lots.')
    } finally {
      setRefreshingStats(false)
    }
  }

  useEffect(() => {
    fetchUserProfile().then((profile) => {
      if (profile?.name) setUserName(profile.name)
      if (profile?.id) setUserId(profile.id)
    })
  }, [setUserName, setUserId])

  useEffect(() => {
    const cleanupSession = () => {
      if (sessionActiveRef.current && currentSessionRef.current && !currentSessionRef.current.id.startsWith('pending')) {
        fetch(`${getApiBaseUrl()}/api/warehouse/sessions/${currentSessionRef.current.id}`, {
          method: 'DELETE',
          credentials: 'include',
          keepalive: true,
        }).catch(console.error)
      }
    }
    window.addEventListener('beforeunload', cleanupSession)
    return () => {
      window.removeEventListener('beforeunload', cleanupSession)
      cleanupSession()
    }
  }, [sessionActiveRef, currentSessionRef])

  return {
    brand,
    ...core,
    ...session,
    ...scans,
    lots,
    lotsLoading,
    isRefreshing,
    lotsError,
    loadLots,
    handleRefreshStats,
    lockedWarehouseBoxes,
    boxLockedBy,
  }
}
