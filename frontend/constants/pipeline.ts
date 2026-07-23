export const STAGE_ORDER = [
  'intake',
  'inventory',
  'cut',
  'endorsement',
  'scan',
  'transmission',
  'storage',
] as const

export type PipelineStage = (typeof STAGE_ORDER)[number]

export const STAGE_META: Record<
  string,
  { label: string; bg: string; color: string; border: string; description: string }
> = {
  intake: {
    label: 'Intake',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    color: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    description: 'Received at facility',
  },
  inventory: {
    label: 'Inventory',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    color: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    description: 'Inventoried & boxed',
  },
  cut: {
    label: 'Cut',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    color: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    description: 'Spine cut & prepared',
  },
  endorsement: {
    label: 'Endorsement',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    color: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    description: 'Inspected & endorsed',
  },
  scan: {
    label: 'Scan',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    color: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    description: 'High-speed scanning',
  },
  transmission: {
    label: 'Transmission',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    color: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800',
    description: 'WMS transmission & validation',
  },
  storage: {
    label: 'Storage',
    bg: 'bg-slate-100 dark:bg-slate-800',
    color: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700',
    description: 'Stored in warehouse rack',
  },
}

export function formatPipelineStage(stage: string): string {
  const meta = STAGE_META[stage.toLowerCase()]
  if (meta) return meta.label
  return stage.charAt(0).toUpperCase() + stage.slice(1)
}
