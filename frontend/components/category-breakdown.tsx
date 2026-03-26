'use client'

import { useState } from 'react'

interface CategoryBreakdownProps {
  lotData?: Array<{
    lot: string
    total: number
    transmitted: number
    rejected: number
    completionRate: string
  }>
  vendorData?: Array<{
    vendor: string
    total: number
    transmitted: number
    rejected: number
    completionRate: string
  }>
}

export function CategoryBreakdown({ lotData, vendorData }: CategoryBreakdownProps) {
  const [selectedLots, setSelectedLots] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'top3' | 'selected'>('top3')
  
  // Show top 3 lots by volume or selected lots
  const displayLots = viewMode === 'selected' && selectedLots.length > 0
    ? lotData?.filter(lot => selectedLots.includes(lot.lot)) || []
    : lotData?.slice(0, 3) || []
  
  const gradients = [
    { bgGradient: 'from-blue-900/20 to-blue-800/10', accentColor: 'text-blue-400' },
    { bgGradient: 'from-cyan-900/20 to-cyan-800/10', accentColor: 'text-cyan-400' },
    { bgGradient: 'from-purple-900/20 to-purple-800/10', accentColor: 'text-purple-400' },
  ]
  
  const categories = displayLots.map((lot, idx) => ({
    name: lot.lot,
    totalBooks: lot.total.toLocaleString(),
    transmitted: lot.transmitted.toLocaleString(),
    rejected: lot.rejected.toLocaleString(),
    completionRate: lot.completionRate,
    ...gradients[idx % gradients.length] // Handle more than 3 lots
  }))

  const handleLotToggle = (lot: string) => {
    setSelectedLots(prev => {
      if (prev.includes(lot)) {
        return prev.filter(l => l !== lot)
      } else {
        return [...prev, lot].slice(0, 3) // Max 3 lots
      }
    })
    setViewMode('selected')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Lot Breakdown
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'top3' | 'selected')}
            className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground cursor-pointer hover:bg-card transition-colors"
          >
            <option value="top3">Top 3 Lots</option>
            <option value="selected">Selected Lots</option>
          </select>
          {viewMode === 'selected' && (
            <div className="relative">
              <select
                multiple
                value={selectedLots}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setSelectedLots(selected.slice(0, 3))
                }}
                className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground cursor-pointer hover:bg-card transition-colors min-w-[200px]"
                size={5}
              >
                {lotData?.map(lot => (
                  <option key={lot.lot} value={lot.lot}>
                    {lot.lot} ({lot.total.toLocaleString()} books)
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Hold Ctrl/Cmd to select multiple (max 3)
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((category, idx) => (
          <div
            key={idx}
            className={`bg-gradient-to-br ${category.bgGradient} border border-border rounded-lg p-6 space-y-4`}
          >
            <h3 className={`font-semibold ${category.accentColor}`}>
              {category.name}
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Books</p>
                <p className="text-xl font-bold text-foreground">
                  {category.totalBooks}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Transmitted</p>
                  <p className="text-lg font-bold text-success">
                    {category.transmitted}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Rejected</p>
                  <p className="text-lg font-bold text-destructive">
                    {category.rejected}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Completion Rate
                </p>
                <p className={`text-xl font-bold ${category.accentColor}`}>
                  {category.completionRate}%
                </p>
              </div>
              <div className="w-full bg-border rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full bg-gradient-to-r from-primary to-accent`}
                  style={{
                    width: Math.min(
                      parseFloat(category.completionRate) / 100,
                      1
                    ) * 100 + '%',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
