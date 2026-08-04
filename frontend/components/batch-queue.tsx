'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight, Clock } from 'lucide-react'

const batches = [
  {
    id: 'BATCH-001',
    source: 'Delhi Archive',
    books: 500,
    status: 'In Progress',
    progress: 85,
    eta: '2:30 PM',
  },
  {
    id: 'BATCH-002',
    source: 'Mumbai Centre',
    books: 750,
    status: 'Queued',
    progress: 0,
    eta: '4:15 PM',
  },
  {
    id: 'BATCH-003',
    source: 'Bangalore Hub',
    books: 320,
    status: 'Validation',
    progress: 65,
    eta: '1:45 PM',
  },
  {
    id: 'BATCH-004',
    source: 'Chennai Depot',
    books: 450,
    status: 'Completed',
    progress: 100,
    eta: 'Done',
  },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'In Progress':
      return 'bg-blue-500/10 text-blue-500'
    case 'Queued':
      return 'bg-gray-500/10 text-gray-400'
    case 'Validation':
      return 'bg-yellow-500/10 text-yellow-500'
    case 'Completed':
      return 'bg-green-500/10 text-green-500'
    default:
      return 'bg-gray-500/10 text-gray-400'
  }
}

export function BatchQueue() {
  return (
    <Card className="bg-card border-border col-span-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold text-foreground">
            Batch Queue
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Incoming batches and processing status
          </p>
        </div>
        <Button variant="outline" size="sm">
          New Batch
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="p-4 rounded-lg bg-sidebar border border-border hover:bg-sidebar/80 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {batch.id}
                    </span>
                    <Badge variant="outline" className={getStatusColor(batch.status)}>
                      {batch.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{batch.source}</p>
                </div>
                <span className="text-sm font-semibold text-foreground">{batch.books}</span>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="w-full h-2 bg-sidebar-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition"
                    style={{ width: `${batch.progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{batch.progress}% complete</p>
              </div>

              {/* ETA */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  ETA: {batch.eta}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
