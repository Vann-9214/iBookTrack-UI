'use client'

import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  advanceInventoryBox,
  checkBoxSimflex,
  deleteInventoryBox,
  fetchBoxBookTypes,
  fetchInventoryBox,
  receiveInventoryBox,
  sendInventoryBoxToCut,
} from '../services/inventory.service'
import { getInventoryBoxGroups, PRINT_PROCESS_ROWS } from '../utils/inventory.helpers'
import type { BookInBox, InventoryBox, InventoryConfirmAction, InventoryTab, SimflexModalState } from '../types/inventory.types'
import type { useInventory } from './useInventory'
import type { useVerificationSession } from './useVerificationSession'

type InventoryState = ReturnType<typeof useInventory>
type VerificationState = ReturnType<typeof useVerificationSession>

export function useInventoryActions(brand: string, inventory: InventoryState, verification: VerificationState) {
  const { toast } = useToast()
  const groups = useMemo(() => getInventoryBoxGroups(inventory.boxes, brand), [inventory.boxes, brand])
  const { incoming: incomingBoxes, verification: inventoryBoxes, outgoing: outgoingBoxes } = groups

  const [printBox, setPrintBox] = useState<InventoryBox | null>(null)
  const [printBooks, setPrintBooks] = useState<BookInBox[]>([])
  const [printBookType, setPrintBookType] = useState('')
  const [loadingPrint, setLoadingPrint] = useState<string | null>(null)

  const [printBook, setPrintBook] = useState<{ book: BookInBox; box: InventoryBox } | null>(null)
  const [loadingBookPrint, setLoadingBookPrint] = useState<string | null>(null)

  const [outgoingExpandedBoxId, setOutgoingExpandedBoxId] = useState<string | null>(null)
  const [outgoingLoadingBooks, setOutgoingLoadingBooks] = useState<string | null>(null)

  const [printedBoxLabels, setPrintedBoxLabels] = useState<Set<string>>(new Set())
  const [printedBookSlips, setPrintedBookSlips] = useState<Record<string, Set<string>>>({})

  const [simflexBookStatus, setSimflexBookStatus] = useState<Record<string, Record<string, string>>>({})
  const [loadingSimflexStatus, setLoadingSimflexStatus] = useState<string | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; box_number: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [simflexModal, setSimflexModal] = useState<SimflexModalState | null>(null)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const [movingToStorage, setMovingToStorage] = useState<string | null>(null)

  const [inventoryTab, setInventoryTab] = useState<InventoryTab>('incoming')

  const [verifExpandedBoxId, setVerifExpandedBoxId] = useState<string | null>(null)
  const [verifRowBooks, setVerifRowBooks] = useState<Record<string, BookInBox[]>>({})
  const [loadingVerifRowBooks, setLoadingVerifRowBooks] = useState<string | null>(null)

  const [confirmModal, setConfirmModal] = useState<{ open: boolean; action: InventoryConfirmAction | null; box: InventoryBox | null }>({ open: false, action: null, box: null })
  const [receivingBox, setReceivingBox] = useState<string | null>(null)
  const [sendingToCut, setSendingToCut] = useState<string | null>(null)

  useEffect(() => { void verification.loadUserProfile() }, [verification.loadUserProfile])

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true)
    try {
      await inventory.fetchBoxes()
    } finally {
      setIsManualRefreshing(false)
    }
  }

  const handleDeleteBox = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await deleteInventoryBox(deleteConfirm.id)
      inventory.setBoxes((prev) => prev ? prev.filter((b) => b.id !== deleteConfirm.id) : [])
      setDeleteConfirm(null)
    } catch (e) { alert(e instanceof Error ? e.message : 'Delete failed') }
    finally { setDeleting(false) }
  }

  const handlePrintLabel = async (box: InventoryBox) => {
    setLoadingPrint(box.id)
    try {
      let books = inventory.boxBooks[box.id]
      if (!books) {
        const data = await fetchInventoryBox(box.id)
        books = (data.box?.books || []) as BookInBox[]
        inventory.setBoxBooks((prev) => ({ ...prev, [box.id]: books as BookInBox[] }))
      }
      const data = await fetchBoxBookTypes(box.id)
      const type = (Array.from(new Set((data.books || []).map((b: { book_type?: string }) => (b.book_type || '').trim()).filter(Boolean))) as string[])[0] || '—'
      setPrintBox(box); setPrintBooks(books || []); setPrintBookType(type.charAt(0).toUpperCase() + type.slice(1).toLowerCase())
    } catch (e) { console.error('Failed to fetch books for label:', e) }
    finally { setLoadingPrint(null) }
  }

  const handleReceiveBox = async (box: InventoryBox) => {
    setReceivingBox(box.id)
    try { 
      await receiveInventoryBox(box.id); 
      void inventory.fetchBoxes();
      setInventoryTab('verification');
    }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed to receive box') }
    finally { setReceivingBox(null) }
  }

  const handleSendToCut = async (box: InventoryBox) => {
    setSendingToCut(box.id)
    try { await sendInventoryBoxToCut(box.id, 'Sent to Cut from Inventory Outgoing'); void inventory.fetchBoxes() }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed to send to cut') }
    finally { setSendingToCut(null) }
  }

  const loadBooks = async (box: InventoryBox, setLoading: (v: string | null) => void, setCache: (fn: (v: Record<string, BookInBox[]>) => Record<string, BookInBox[]>) => void) => {
    if (inventory.boxBooks[box.id]) return
    setLoading(box.id)
    try {
      const data = await fetchInventoryBox(box.id)
      setCache((v) => ({ ...v, [box.id]: (data.box?.books || []) as BookInBox[] }))
    } finally { setLoading(null) }
  }

  const toggleOutgoingBox = async (box: InventoryBox) => {
    if (outgoingExpandedBoxId === box.id) { setOutgoingExpandedBoxId(null); return }
    setOutgoingExpandedBoxId(box.id)
    await loadBooks(box, setOutgoingLoadingBooks, inventory.setBoxBooks)
  }

  const toggleVerifRow = async (boxId: string) => {
    if (verifExpandedBoxId === boxId) { setVerifExpandedBoxId(null); return }
    setVerifExpandedBoxId(boxId)
    if (verifRowBooks[boxId]) return
    setLoadingVerifRowBooks(boxId)
    try {
      const data = await fetchInventoryBox(boxId)
      setVerifRowBooks((v) => ({ ...v, [boxId]: (data.box?.books || []) as BookInBox[] }))
    } catch { setVerifRowBooks((v) => ({ ...v, [boxId]: [] })) }
    finally { setLoadingVerifRowBooks(null) }
  }

  const handlePrintBookSlip = (book: BookInBox, box: InventoryBox) => { setLoadingBookPrint(`${box.id}-${book.id}`); setPrintBook({ book, box }) }

  const handleMoveToStorage = async (box: InventoryBox) => {
    setMovingToStorage(box.id)
    try { await advanceInventoryBox(box.id); void inventory.fetchBoxes() }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed to move to storage') }
    finally { setMovingToStorage(null) }
  }

  const handleCheckSimflex = async (box: InventoryBox) => {
    setSimflexModal({ box, loading: true, result: null, error: null })
    try {
      const data = await checkBoxSimflex(box.id)
      setSimflexModal((v) => (v ? { ...v, loading: false, result: data as SimflexModalState['result'] } : null))
      if ((data as { autoAdvanced?: boolean }).autoAdvanced) void inventory.fetchBoxes()
    } catch (e) {
      setSimflexModal((v) => (v ? { ...v, loading: false, error: e instanceof Error ? e.message : 'Unknown error' } : null))
    }
  }

  const openConfirm = (action: InventoryConfirmAction, box: InventoryBox) => setConfirmModal({ open: true, action, box })
  const closeConfirm = () => setConfirmModal({ open: false, action: null, box: null })

  return {
    printBox, setPrintBox, printBooks, printBookType, loadingPrint,
    printBook, setPrintBook, loadingBookPrint, setLoadingBookPrint,
    outgoingExpandedBoxId, outgoingLoadingBooks, printedBoxLabels, setPrintedBoxLabels, printedBookSlips, setPrintedBookSlips,
    printProcessRows: PRINT_PROCESS_ROWS, simflexBookStatus, loadingSimflexStatus,
    deleteConfirm, setDeleteConfirm, deleting, handleDeleteBox,
    simflexModal, setSimflexModal, handleCheckSimflex,
    isManualRefreshing, handleManualRefresh,
    movingToStorage, setMovingToStorage,
    inventoryTab, setInventoryTab,
    verifExpandedBoxId, verifRowBooks, loadingVerifRowBooks, toggleVerifRow,
    confirmModal, openConfirm, closeConfirm,
    receivingBox, handleReceiveBox,
    sendingToCut, handleSendToCut,
    toggleOutgoingBox, handlePrintLabel, handlePrintBookSlip, handleMoveToStorage,
    incomingBoxes, inventoryBoxes, outgoingBoxes,
  }
}
