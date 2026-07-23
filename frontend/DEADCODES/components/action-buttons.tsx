import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, AlertCircle, Copy, Repeat2 } from 'lucide-react'

interface ActionButtonsProps {
  onAction: (status: 'pass' | 'reject' | 'mismatch' | 'wrong-lot' | 'already-scanned') => void
  disabled?: boolean
}

export function ActionButtons({ onAction, disabled = false }: ActionButtonsProps) {
  const buttons = [
    {
      id: 'pass',
      label: 'Pass / Received',
      icon: CheckCircle,
      color: 'bg-success hover:bg-success/90 text-success-foreground',
      description: 'Book matches and is valid',
    },
    {
      id: 'reject',
      label: 'Reject',
      icon: XCircle,
      color: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
      description: 'Physical damage or defect',
    },
    {
      id: 'mismatch',
      label: 'Mismatch',
      icon: AlertCircle,
      color: 'bg-warning hover:bg-warning/90 text-warning-foreground',
      description: 'Title doesn\'t match ISBN',
    },
    {
      id: 'wrong-lot',
      label: 'Wrong Lot',
      icon: Copy,
      color: 'bg-orange-600 hover:bg-orange-700 text-white',
      description: 'Move to segregation box',
    },
    {
      id: 'already-scanned',
      label: 'Already Scanned',
      icon: Repeat2,
      color: 'bg-muted hover:bg-muted/80 text-muted-foreground',
      description: 'Duplicate entry',
    },
  ]

  return (
    <div className="grid grid-cols-5 gap-3">
      {buttons.map((btn) => (
        <button
          key={btn.id}
          onClick={() => onAction(btn.id as any)}
          disabled={disabled}
          className={`p-4 rounded-lg transition-all flex flex-col items-center gap-2 ${
            btn.color
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
          title={btn.description}
        >
          <btn.icon className="w-6 h-6" />
          <span className="text-sm font-medium text-center">{btn.label}</span>
        </button>
      ))}
    </div>
  )
}
