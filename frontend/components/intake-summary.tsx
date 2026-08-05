'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Package, AlertCircle } from 'lucide-react'

export function IntakeSummary() {
  const stats = [
    {
      title: 'Total Received Today',
      value: '2,450',
      unit: 'books',
      icon: Package,
      bgColor: 'bg-primary/10',
      textColor: 'text-primary',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Validated',
      value: '2,180',
      unit: 'books',
      icon: TrendingUp,
      bgColor: 'bg-primary/10',
      textColor: 'text-primary',
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Pending Review',
      value: '270',
      unit: 'books',
      icon: AlertCircle,
      bgColor: 'bg-yellow-500/10',
      textColor: 'text-yellow-500',
      trend: '-3%',
      trendUp: false,
    },
    {
      title: 'Failed Validation',
      value: '45',
      unit: 'books',
      icon: TrendingDown,
      bgColor: 'bg-red-500/10',
      textColor: 'text-red-500',
      trend: '+2%',
      trendUp: false,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.textColor}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.unit}</div>
              </div>
              <div className={`text-xs mt-2 flex items-center gap-1 ${stat.trendUp ? 'text-primary' : 'text-red-500'}`}>
                {stat.trendUp ? '↑' : '↓'} {stat.trend} from yesterday
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
