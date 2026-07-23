'use client'

import { useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { fetchUserProfile, getApiBaseUrl } from '@/lib/auth-api'
import { useBrand } from '@/hooks/use-brand'
import { useWarehouseState } from './useWarehouseState'
import { useWarehouseIsbnStream } from './useWarehouseIsbnStream'
import { useWarehouseSession } from './useWarehouseSession'
import { useWarehouseScans } from './useWarehouseScans'
import { fetchLots } from '../services/warehouse.service'

export function useWarehouse() {
  const { brand } = useBrand()
  const core = useWarehouseState()
  const session = useWarehouseSession(core)
  const scans = useWarehouseScans(core)
  useWarehouseIsbnStream(core.sessionActive)

  const { toast } = useToast()
  const {
    setLots, setLotsLoading, setLotsError, setUserName, setLastStatsUpdate,
    setRefreshingStats, sessionActive, currentSessionRef, sessionActiveRef,
  } = core

  const loadLots = async () => {
    setLotsLoading(true)
    setLotsError(null)
    try {
      setLots(await fetchLots())
    } catch (err: any) {
      setLotsError(err.message || 'Failed to connect to iLMS.')
    } finally {
      setLotsLoading(false)
    }
  }

  const handleRefreshStats = async () => {
    setRefreshingStats(true)
    try {
      await loadLots()
      setLastStatsUpdate(new Date())
      toast({ title: 'Lots Refreshed', description: 'Warehouse lot list synchronized successfully.' })
    } catch {
      core.setSessionError('Failed to refresh lots.')
    } finally {
      setRefreshingStats(false)
    }
  }

  useEffect(() => {
    fetchUserProfile().then((profile) => profile?.name && setUserName(profile.name))
  }, [setUserName])

  useEffect(() => {
    loadLots()
  }, [])

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
  }, [])

  return {
    brand,
    ...core,
    ...session,
    ...scans,
    loadLots,
    handleRefreshStats,
  }
}
