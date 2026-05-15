'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

const validationData = [
  { name: 'Metadata', valid: 450, invalid: 25, pending: 40 },
  { name: 'ISBN Check', valid: 460, invalid: 15, pending: 30 },
  { name: 'Barcode Scan', valid: 440, invalid: 35, pending: 20 },
  { name: 'Image Quality', valid: 430, invalid: 45, pending: 10 },
  { name: 'OCR Check', valid: 420, invalid: 50, pending: 15 },
]

export function ValidationStatus() {
  return (
    <Card className="bg-card border-border col-span-1">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Validation Pipeline
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Status breakdown across validation stages
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={validationData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis 
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: `1px solid var(--color-border)`,
                borderRadius: '8px',
                color: 'var(--color-foreground)',
              }}
            />
            <Legend />
            <Bar dataKey="valid" fill="var(--color-success)" />
            <Bar dataKey="invalid" fill="var(--color-destructive)" />
            <Bar dataKey="pending" fill="var(--color-warning)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
