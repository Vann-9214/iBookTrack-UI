interface MetricsRowProps {
  data?: {
    totalBooks: number
    transmitted: number
    rejected: number
    booksToGo: number
    completionRate: string
  }
}

export function MetricsRow({ data }: MetricsRowProps) {
  const metrics = [
    {
      label: 'Total Books (Finished Lots)',
      value: data?.totalBooks.toLocaleString() || '0',
      subtext: 'Lot 1-51',
      color: 'text-primary',
    },
    {
      label: 'Total Transmitted',
      value: data?.transmitted.toLocaleString() || '0',
      subtext: 'Completed',
      color: 'text-success',
    },
    {
      label: 'Books Rejected',
      value: data?.rejected.toLocaleString() || '0',
      subtext: 'Issues Found',
      color: 'text-destructive',
    },
    {
      label: 'Completion Rate',
      value: `${data?.completionRate || '0'}%`,
      subtext: 'Finished Lots',
      color: 'text-primary',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => (
        <div
          key={idx}
          className="bg-card border border-border rounded-lg p-6 space-y-3"
        >
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          <div className="flex items-baseline justify-between">
            <p className={`text-2xl font-bold ${metric.color}`}>
              {metric.value}
            </p>
          </div>
          {metric.subtext && (
            <p className="text-xs text-muted-foreground">{metric.subtext}</p>
          )}
          {idx === 3 && data && (
            <div className="w-full bg-border rounded-full h-1 mt-2">
              <div className="bg-primary h-1 rounded-full" style={{ width: `${data.completionRate}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
