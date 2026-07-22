import { StatsBar } from '@/components/stats-bar'

export function DashboardStats({ stats, refreshKey, loading }: { stats: any; refreshKey: number; loading: boolean }) {
  return <StatsBar stats={stats} refreshKey={refreshKey} loading={loading} />
}
