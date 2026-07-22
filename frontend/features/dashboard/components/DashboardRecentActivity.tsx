import { TransmissionQueue } from '@/components/transmission-queue'

export function DashboardRecentActivity({ scans, loading }: { scans: any[]; loading: boolean }) {
  return <TransmissionQueue scans={scans} loading={loading} />
}
