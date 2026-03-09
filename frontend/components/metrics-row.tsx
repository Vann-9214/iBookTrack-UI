export function MetricsRow() {
  const metrics = [
    {
      label: 'Total Books in Pipeline',
      value: '200,000',
      subtext: '',
      color: 'text-primary',
    },
    {
      label: 'Total Delivered',
      value: '150,868',
      subtext: 'Completed',
      color: 'text-success',
    },
    {
      label: 'Books To Go',
      value: '49,132',
      subtext: 'COUNTDOWN',
      color: 'text-warning',
      badge: true,
    },
    {
      label: 'Completion Rate',
      value: '94.5%',
      subtext: 'Feb 2026',
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
            {metric.badge && (
              <span className="text-xs font-semibold bg-warning/20 text-warning px-2 py-1 rounded">
                {metric.subtext}
              </span>
            )}
          </div>
          {!metric.badge && metric.subtext && (
            <p className="text-xs text-muted-foreground">{metric.subtext}</p>
          )}
          {idx === 3 && (
            <div className="w-full bg-border rounded-full h-1 mt-2">
              <div className="bg-primary h-1 rounded-full" style={{ width: '94.5%' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
