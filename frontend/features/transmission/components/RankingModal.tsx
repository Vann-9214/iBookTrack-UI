'use client'

import { Loader2, Trophy } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { RankingResponse } from '../types/transmission.types'

interface RankingModalProps {
  showRanking: boolean
  setShowRanking: (open: boolean) => void
  ranking: RankingResponse | null
  rankingLoading: boolean
}

export function RankingModal({ showRanking, setShowRanking, ranking, rankingLoading }: RankingModalProps) {
  if (!showRanking) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setShowRanking(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '90vw', maxWidth: 1100, height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 bg-amber-50 border-b border-amber-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">Performance Ranking</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRanking(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-amber-200 text-gray-600 hover:bg-amber-100 hover:text-gray-900 transition-all font-semibold text-sm"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col p-6 gap-5">
          {rankingLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : ranking ? (
            <div className="flex flex-col gap-4 overflow-hidden">
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Books</p>
                  <p className="text-3xl font-black text-blue-600 mt-1">{ranking.totalBooks.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Pages</p>
                  <p className="text-3xl font-black text-green-600 mt-1">{ranking.totalPages.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Highest Output</p>
                  <p className="text-3xl font-black text-amber-600 mt-1">{ranking.highestOutput}</p>
                </div>
                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Avg Output</p>
                  <p className="text-3xl font-black text-teal-600 mt-1">{ranking.avgOutput}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-100 bg-white">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b border-gray-100">
                      <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-left w-12">
                        Rank
                      </th>
                      <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-left">
                        Scan User
                      </th>
                      <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-left w-64">
                        Performance
                      </th>
                      <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-right">
                        Books
                      </th>
                      <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-right">
                        Pages
                      </th>
                      <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-right">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.data.map((r) => (
                      <tr
                        key={r.Rank}
                        className={cn(
                          'border-b border-gray-50 transition-colors',
                          r.Rank === 1 ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'
                        )}
                      >
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              'text-sm font-black',
                              r.Rank === 1
                                ? 'text-amber-500'
                                : r.Rank === 2
                                  ? 'text-gray-400'
                                  : r.Rank === 3
                                    ? 'text-orange-400'
                                    : 'text-gray-500'
                            )}
                          >
                            {r.Rank === 1 ? '🥇' : r.Rank === 2 ? '🥈' : r.Rank === 3 ? '🥉' : `#${r.Rank}`}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-semibold text-gray-800 text-sm">{r.ScanUser}</span>
                        </td>
                        <td className="px-5 py-3">
                          <Progress value={r.ScoreNum} className="h-2.5" />
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-gray-800">{r.Books.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-gray-500">{r.Pages.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            {r.Score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-gray-400">No ranking data available</div>
          )}
        </div>
      </div>
    </div>
  )
}
