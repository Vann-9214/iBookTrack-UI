import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/use-user'
import { RoleGuard } from '@/components/role-guard'
import type { BoxItem, Stage, ConfirmActionType } from '../types/checkpoints.types'

interface BoxActionButtonProps {
  box: BoxItem
  brand: string
  advancing: string | null
  receiving: string | null
  sendingForward: string | null
  checkingSimflexBoxId: string | null
  selectedStage: Stage | null
  onConfirm: (box: BoxItem, action: ConfirmActionType) => void
}

function ActionBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Badge variant="outline" className={cn('text-[10px] shrink-0 flex items-center justify-center w-[76px] h-7 cursor-default', className)}>
      {children}
    </Badge>
  )
}

function PlainButton({
  label,
  loading,
  variant = 'outline',
  className,
  onClick,
}: {
  label: string
  loading: boolean
  variant?: 'outline' | 'default'
  className?: string
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <Button
      size="sm"
      variant={variant}
      disabled={loading}
      onClick={onClick}
      className={cn('h-7 gap-1 text-xs shrink-0', className)}
    >
      {loading ? '...' : label}
      {!loading && label === 'Send' && <ArrowRight className="h-3 w-3" />}
    </Button>
  )
}

function SlideAction({
  badgeClass,
  badgeLabel,
  buttonLabel,
  loading,
  variant = 'default',
  buttonClass,
  onClick,
}: {
  badgeClass?: string
  badgeLabel: string
  buttonLabel: string
  loading: boolean
  variant?: 'outline' | 'default'
  buttonClass?: string
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <div className="group/action relative flex items-center justify-end w-[76px] h-7 shrink-0 rounded-md cursor-pointer overflow-hidden">
      <Badge variant="outline" className={cn('text-[10px] transition-all duration-300 group-hover/action:-translate-x-full group-hover/action:opacity-0 cursor-default flex items-center justify-center w-full h-full text-center', badgeClass)}>
        {badgeLabel}
      </Badge>
      <Button
        size="sm"
        variant={variant}
        disabled={loading}
        onClick={onClick}
        className={cn('absolute inset-y-0 right-0 h-full w-full px-0 gap-1 text-xs opacity-0 translate-x-full group-hover/action:translate-x-0 group-hover/action:opacity-100 pointer-events-none group-hover/action:pointer-events-auto transition-all duration-300', buttonClass)}
      >
        {loading ? '...' : buttonLabel}
        {!loading && buttonLabel === 'Send' && <ArrowRight className="h-3 w-3" />}
      </Button>
    </div>
  )
}

export function BoxActionButton({
  box,
  brand,
  advancing,
  receiving,
  sendingForward,
  checkingSimflexBoxId,
  selectedStage,
  onConfirm,
}: BoxActionButtonProps) {
  const stage = box.current_stage
  const isAdvancing = advancing === box.id
  const isReceiving = receiving === box.id
  const isSending = sendingForward === box.id
  const confirm = (action: ConfirmActionType) => (e: React.MouseEvent) => {
    e.stopPropagation()
    onConfirm(box, action)
  }

  const { user } = useUser()
  const isSupervisor = user?.role === 'supervisor'

  if (stage === 'storage') {
    return <ActionBadge className="border-emerald-300 text-emerald-700 bg-emerald-50">Done</ActionBadge>
  }

  if (stage === 'warehouse') {
    const status = box.box_sessions?.[0]?.status || 'sent'
    if (status === 'completed') {
      if (!isSupervisor) return <ActionBadge className="border-emerald-300 text-emerald-700 bg-emerald-50">Complete</ActionBadge>
      return <SlideAction badgeLabel="Complete" buttonLabel="Send" badgeClass="border-emerald-300 text-emerald-700 bg-emerald-50" loading={isAdvancing} onClick={confirm('advance')} />
    }
    if (status === 'received') {
      return (
        <ActionBadge
          className={cn(
            brand === 'jaguar'
              ? 'border-green-300 text-green-700 bg-green-50'
              : 'border-blue-300 text-blue-700 bg-blue-50'
          )}
        >
          Received
        </ActionBadge>
      )
    }
    
    if (!isSupervisor) return <ActionBadge className="border-yellow-400 text-yellow-700 bg-yellow-50">Pending</ActionBadge>
    return (
      <PlainButton
        label="Receive"
        loading={isReceiving}
        className="w-[76px] border-yellow-400 text-yellow-700 hover:bg-yellow-50"
        onClick={confirm('receive')}
      />
    )
  }

  if (stage === 'inventory') {
    const status = box.box_sessions?.[0]?.status || 'sent'
    if (status === 'received') return <ActionBadge className="border-blue-300 text-blue-700 bg-blue-50">Received</ActionBadge>
    if (status === 'sent') {
      if (!isSupervisor) return <ActionBadge className="border-indigo-300 text-indigo-700 bg-indigo-50">Sent</ActionBadge>
      return <SlideAction badgeLabel="Sent" buttonLabel="Receive" badgeClass="border-indigo-300 text-indigo-700 bg-indigo-50" buttonClass="border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100" variant="outline" loading={isAdvancing} onClick={confirm('advance')} />
    }
    return <ActionBadge className="border-emerald-300 text-emerald-700 bg-emerald-50">{status === 'completed' ? 'Complete' : status}</ActionBadge>
  }

  if (stage === 'cut') {
    const status = box.box_sessions?.[0]?.status || 'sent'
    if (status === 'received') {
      if (!isSupervisor) return <ActionBadge className="border-blue-300 text-blue-700 bg-blue-50">Received</ActionBadge>
      return <SlideAction badgeLabel="Received" buttonLabel="Send" badgeClass="border-blue-300 text-blue-700 bg-blue-50" loading={isSending} onClick={confirm('send_forward')} />
    }
    if (status === 'sent') {
      if (!isSupervisor) return <ActionBadge className="border-indigo-300 text-indigo-700 bg-indigo-50">Sent</ActionBadge>
      return <SlideAction badgeLabel="Sent" buttonLabel="Receive" badgeClass="border-indigo-300 text-indigo-700 bg-indigo-50" buttonClass="border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100" variant="outline" loading={isAdvancing} onClick={confirm('advance')} />
    }
    return <ActionBadge className="border-emerald-300 text-emerald-700 bg-emerald-50">{status === 'completed' ? 'Complete' : status}</ActionBadge>
  }

  if (stage === 'endorsement') {
    const status = box.box_sessions?.[0]?.status || 'sent'
    if (status === 'received') return <ActionBadge className="border-blue-300 text-blue-700 bg-blue-50">Received</ActionBadge>
    if (status === 'completed') {
      if (!isSupervisor) return <ActionBadge className="border-emerald-300 text-emerald-700 bg-emerald-50">Complete</ActionBadge>
      return <SlideAction badgeLabel="Complete" buttonLabel="Send" badgeClass="border-emerald-300 text-emerald-700 bg-emerald-50" loading={isSending} onClick={confirm('send_forward')} />
    }
    if (status === 'sent') {
      if (!isSupervisor) return <ActionBadge className="border-indigo-300 text-indigo-700 bg-indigo-50">Sent</ActionBadge>
      return <SlideAction badgeLabel="Sent" buttonLabel="Receive" badgeClass="border-indigo-300 text-indigo-700 bg-indigo-50" buttonClass="border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100" variant="outline" loading={isAdvancing} onClick={confirm('advance')} />
    }
    return <ActionBadge className="border-gray-300 text-gray-700 bg-gray-50">{status}</ActionBadge>
  }

  if (stage === 'scan') {
    if (selectedStage === 'storage') {
      return <ActionBadge className="border-emerald-300 text-emerald-700 bg-emerald-50 h-7 px-2 w-auto">Done</ActionBadge>
    }
    return <ActionBadge className="border-amber-300 text-amber-700 bg-amber-50 h-7 px-2 w-auto">{checkingSimflexBoxId === box.id ? 'Checking...' : 'Pending'}</ActionBadge>
  }

  if (stage === 'transmit') {
    if (!isSupervisor) return <ActionBadge className="border-emerald-300 text-emerald-700 bg-emerald-50">Ready</ActionBadge>
    return (
      <PlainButton
        label="Send"
        loading={isAdvancing}
        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        onClick={confirm('advance')}
      />
    )
  }

  if (!isSupervisor) return <ActionBadge className="border-yellow-400 text-yellow-700 bg-yellow-50">Pending</ActionBadge>
  return (
    <PlainButton
      label="Receive"
      loading={isReceiving}
      className="border-yellow-400 text-yellow-700 hover:bg-yellow-50"
      onClick={confirm('receive')}
    />
  )
}
