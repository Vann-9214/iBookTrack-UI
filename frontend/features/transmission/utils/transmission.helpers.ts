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

  let badgeNode: ReactNode

  if (stateUpper === 'COMPLETED') {
    badgeNode = createElement(
      Badge,
      { variant: 'outline', className: 'px-1.5 py-0 h-4 border-success/30 bg-success/10 text-success gap-1 text-[8px] uppercase font-bold' },
      createElement(CheckCircle2, { className: 'h-2.5 w-2.5' }),
      ' COMPLETED'
    )
  } else if (stateUpper === 'FAILED') {
    badgeNode = createElement(
      Badge,
      { variant: 'outline', className: 'px-1.5 py-0 h-4 border-destructive/30 bg-destructive/10 text-destructive gap-1 text-[8px] uppercase font-bold' },
      createElement(XCircle, { className: 'h-2.5 w-2.5' }),
      ' FAILED'
    )
  } else {
    badgeNode = createElement(
      Badge,
      { variant: 'outline', className: 'px-1.5 py-0 h-4 border-blue-300 bg-blue-50 text-blue-600 gap-1 text-[8px] uppercase font-bold' },
      createElement(Loader2, { className: 'h-2.5 w-2.5 animate-spin' }),
      ' ONGOING'
    )
  }

  return createElement(
    'div',
    { className: 'flex flex-col items-start gap-0.5' },
    createElement(
      'span',
      { className: 'text-[8px] font-bold text-muted-foreground uppercase leading-tight' },
      formattedStage
    ),
    badgeNode
  )
}

function formatSimflexStage(stage: string): string {
  if (stage === 'Jaguar Validate') return 'Validate'
  if (stage === 'Tif2PDF') return 'PDF Conversion'
  if (stage === 'Scanning') return 'Scan'
  if (stage === 'Preval') return 'Preval'
  if (stage === 'Transmission_Archive' || stage === 'Transmission_Archived') return 'Transmission'
  return stage.replace(/_/g, ' ')
}

function formatSimflexState(state: string): string {
  if (state === 'COMPLETED') return 'Completed'
  if (state === 'ONGOING') return 'Ongoing'
  if (state === 'FAILED') return 'Failed'
  return state
}

export function getSimflexBadge(status: string | null | undefined, completed: boolean, scanStatus?: string): ReactNode {
  if (scanStatus === 'non_processable') {
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-gray-200 bg-gray-100 text-gray-400 text-[10px] whitespace-normal' },
      'N/A'
    )
  }

  if (!status) {
    if (completed) {
      return createElement(
        Badge,
        { variant: 'outline', className: 'border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px] whitespace-normal' },
        'Transmission Completed'
      )
    }
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-gray-200 bg-gray-50 text-gray-500 text-[10px] whitespace-normal' },
      'Pending'
    )
  }

  if (/transmission/i.test(status) && /completed/i.test(status)) {
    return createElement(
      Badge,
      { variant: 'outline', className: 'border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px] whitespace-normal' },
      'Transmission Completed'
    )
  }

  const parts = status.trim().split(/\s+/)
  const rawState = (parts.pop() || '').toUpperCase()
  const rawStage = parts.join(' ')

  const stageLabel = formatSimflexStage(rawStage)
  const stateLabel = formatSimflexState(rawState)
  const label = stageLabel && stateLabel ? `${stageLabel} ${stateLabel}` : stageLabel || stateLabel || status

  const colorClass =
    rawState === 'COMPLETED' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
    rawState === 'ONGOING' ? 'border-blue-300 bg-blue-50 text-blue-700' :
    rawState === 'FAILED' ? 'border-red-300 bg-red-50 text-red-700' :
    'border-gray-200 bg-gray-50 text-gray-500'

  return createElement(
    Badge,
    { variant: 'outline', className: `${colorClass} text-[10px] whitespace-normal` },
    label
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
