import { ActivePipeline } from '@/components/active-pipeline'

export function DashboardPipeline({ currentLot, stats, brand, loading }: { currentLot: string; stats: any; brand: 'mustang' | 'jaguar'; loading: boolean }) {
  return <ActivePipeline currentLot={currentLot} stats={stats} brand={brand} loading={loading} />
}
