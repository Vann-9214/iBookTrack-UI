import { useState, useRef, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  receiveBox as receiveBoxApi,
  sendForwardBox as sendForwardBoxApi,
  advanceBox as advanceBoxApi,
  rollbackBox as rollbackBoxApi,
} from '../services/checkpoints.service'
import type { BoxItem, ConfirmActionType, UndoEntry, AdvanceError } from '../types/checkpoints.types'

export function useCheckpointActions(fetchData: () => Promise<void>) {
  const { toast } = useToast()

  const [advancing, setAdvancing] = useState<string | null>(null)
  const [receiving, setReceiving] = useState<string | null>(null)
  const [sendingForward, setSendingForward] = useState<string | null>(null)

  const [confirmBox, setConfirmBox] = useState<BoxItem | null>(null)
  const [confirmActionType, setConfirmActionType] = useState<ConfirmActionType | null>(null)
  const [advanceError, setAdvanceError] = useState<AdvanceError | null>(null)

  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleReceive = useCallback(async (box: BoxItem) => {
    setReceiving(box.id)
    try {
      const data = await receiveBoxApi(box.id)
      if (!data.success) throw new Error(data.error || 'Failed to receive')
      await fetchData()
    } catch (e) {
      toast({ variant: 'destructive', title: e instanceof Error ? e.message : 'Failed to receive box' })
    } finally {
      setReceiving(null)
    }
  }, [fetchData, toast])

  const handleSendForward = useCallback(async (box: BoxItem) => {
    setSendingForward(box.id)
    try {
      const data = await sendForwardBoxApi(box.id)
      if (!data.success) throw new Error(data.error || 'Failed to send forward')
      await fetchData()
    } catch (e) {
      toast({ variant: 'destructive', title: e instanceof Error ? e.message : 'Failed to send box' })
    } finally {
      setSendingForward(null)
    }
  }, [fetchData, toast])

  const doAdvance = useCallback(async (box: BoxItem) => {
    setAdvancing(box.id)
    setConfirmBox(null)
    try {
      const data = await advanceBoxApi(box.id)
      if (!data.success) {
        if (data.pending_isbns && Array.isArray(data.pending_isbns) && data.pending_isbns.length > 0) {
          setAdvanceError({ box, message: data.error || 'Cannot advance box', pending_isbns: data.pending_isbns })
        } else {
          throw new Error(data.error || 'Failed to advance')
        }
        return
      }
      setUndoEntry({ box, fromStage: data.from_stage || '', toStage: data.to_stage || '' })
      if (undoTimer.current) clearTimeout(undoTimer.current)
      undoTimer.current = setTimeout(() => setUndoEntry(null), 8000)
      await fetchData()
    } catch (e) {
      toast({ variant: 'destructive', title: e instanceof Error ? e.message : 'Failed to advance box' })
    } finally {
      setAdvancing(null)
    }
  }, [fetchData, toast])

  const handleUndo = useCallback(async () => {
    if (!undoEntry) return
    if (undoTimer.current) clearTimeout(undoTimer.current)
    setUndoEntry(null)
    setAdvancing(undoEntry.box.id)
    try {
      const data = await rollbackBoxApi(undoEntry.box.id, undoEntry.fromStage)
      if (!data.success) throw new Error(data.error || 'Failed to undo')
      await fetchData()
    } catch (e) {
      toast({ variant: 'destructive', title: e instanceof Error ? e.message : 'Failed to undo' })
    } finally {
      setAdvancing(null)
    }
  }, [fetchData, toast, undoEntry])

  const confirmAndExecute = useCallback(async () => {
    if (!confirmBox || !confirmActionType) return
    if (confirmActionType === 'receive') await handleReceive(confirmBox)
    else if (confirmActionType === 'send_forward') await handleSendForward(confirmBox)
    else await doAdvance(confirmBox)
    setConfirmBox(null)
    setConfirmActionType(null)
  }, [confirmBox, confirmActionType, handleReceive, handleSendForward, doAdvance])

  return {
    advancing,
    receiving,
    sendingForward,
    confirmBox,
    setConfirmBox,
    confirmActionType,
    setConfirmActionType,
    advanceError,
    setAdvanceError,
    undoEntry,
    setUndoEntry,
    undoTimer,
    handleReceive,
    handleSendForward,
    doAdvance,
    handleUndo,
    confirmAndExecute,
  }
}
