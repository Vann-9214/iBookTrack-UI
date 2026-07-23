import { createElement, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import type { TransmissionBrand } from '../types/transmission.types'

export const NONE_MACHINE = '__NONE__'

export function formatPipelineStage(stage: string) {
  if (!stage) return '—'
  if (stage === 'Tif2PDF') return 'PDF Conversion'
  if (stage === 'Validate') return 'Jaguar Validate'
  return stage.replace(/_/g, ' ')
}

export function parseStatus(status: string) {
  const parts = status?.split(' ') || []
  const state = parts.pop()?.toUpperCase() || ''
  const stage = parts.join(' ')
  return { stage, state }
}

export function getPipelineStatusBadge(status: string): ReactNode {
  const parts = status?.split(' ') || []
  const state = parts.pop() || 'ONGOING'
  const stage = parts.join(' ')
  const formattedStage = formatPipelineStage(stage)
  const stateUpper = state.toUpperCase()

  if (stateUpper === 'COMPLETED') {
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-success/30 bg-success/10 text-success gap-1 text-[10px]' },
      createElement(CheckCircle2, { className: 'h-3 w-3' }),
      ` ${formattedStage} COMPLETED`
    )
  }

  if (stateUpper === 'FAILED') {
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-destructive/30 bg-destructive/10 text-destructive gap-1 text-[10px]' },
      createElement(XCircle, { className: 'h-3 w-3' }),
      ` ${formattedStage} FAILED`
    )
  }

  return createElement(
    Badge,
    { variant: 'outline', className: 'border-blue-300 bg-blue-50 text-blue-600 gap-1 text-[10px]' },
    createElement(Loader2, { className: 'h-3 w-3 animate-spin' }),
    ` ${formattedStage} ONGOING`
  )
}

export function getSimflexBadge(status: string | null | undefined, completed: boolean, scanStatus?: string): ReactNode {
  if (scanStatus === 'non_processable') {
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-gray-200 bg-gray-100 text-gray-400 text-[10px]' },
      'N/A'
    )
  }

  if (completed) {
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-emerald-300 bg-emerald-50 text-emerald-700 gap-1 text-[10px]' },
      createElement(CheckCircle2, { className: 'h-3 w-3' }),
      ' Transmitted'
    )
  }

  if (!status) {
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-gray-200 bg-gray-50 text-gray-500 text-[10px]' },
      'Pending'
    )
  }

  if (status.includes('Validate')) {
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-blue-300 bg-blue-50 text-blue-700 text-[10px]' },
      'Jaguar Validate'
    )
  }

  if (status.includes('Tif2PDF')) {
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-violet-300 bg-violet-50 text-violet-700 text-[10px]' },
      'PDFConversion'
    )
  }

  if (status.includes('Preval')) {
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-amber-300 bg-amber-50 text-amber-700 text-[10px]' },
      'Pre-Validation'
    )
  }

  if (status.includes('Scanning')) {
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-cyan-300 bg-cyan-50 text-cyan-700 text-[10px]' },
      'Done Scan'
    )
  }

  return createElement(
    Badge,
    { variant: 'outline', className: 'border-gray-200 bg-gray-50 text-gray-500 text-[10px]' },
    status
  )
}

export function getScanStatusBadge(scan_status: string): ReactNode {
  if (scan_status === 'processable') {
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-green-300 bg-green-50 text-green-700 text-[10px]' },
      'Processable'
    )
  }

  if (scan_status === 'non_processable') {
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-red-300 bg-red-50 text-red-700 text-[10px]' },
      'Non-Processable'
    )
  }

  if (scan_status === 'reject') {
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-orange-300 bg-orange-50 text-orange-700 text-[10px]' },
      'Rejected'
    )
  }

  return createElement(
    Badge,
    { variant: 'outline', className: 'border-gray-200 text-[10px]' },
    scan_status
  )
}

export const todayStr = () => new Date().toISOString().split('T')[0]

export function lotTypeForBrand(brand: TransmissionBrand) {
  return brand === 'jaguar' ? 'Jaguar' : 'Mustang'
}

export function normalizeMachineName(name: unknown) {
  const s = String(name ?? '').trim()
  return s ? s : NONE_MACHINE
}

export function machineDisplayName(key: string) {
  return key === NONE_MACHINE ? '—' : key
}
