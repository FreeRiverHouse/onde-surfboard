"use client"

import { useMemo } from 'react'

interface HeatmapCell {
  day: number
  day_name: string
  hour: number
  trades: number
  won: number
  lost: number
  win_rate: number | null
  pnl: number
}

interface HeatmapSummary {
  max_trades_in_cell: number
  best_win_rate: number | null
  worst_win_rate: number | null
  best_cells: Array<{ day: string; hour: number; win_rate: number }>
  worst_cells: Array<{ day: string; hour: number; win_rate: number }>
}

interface HourDayHeatmapData {
  generated_at: string
  total_trades: number
  heatmap: HeatmapCell[]
  summary: HeatmapSummary
  days: string[]
  hours: number[]
}

interface TimeOfDayHeatmapProps {
  heatmapData?: HourDayHeatmapData
  loading?: boolean
}

// Get color for win rate (0-100)
function getWinRateColor(winRate: number | null, trades: number): string {
  if (winRate === null || trades === 0) {
    return 'bg-gray-100 dark:bg-gray-800' // No data
  }
  
  // Require minimum trades for confident color
  if (trades < 2) {
    return 'bg-gray-200 dark:bg-gray-700' // Insufficient data
  }
  
  if (winRate >= 70) return 'bg-emerald-500'
  if (winRate >= 60) return 'bg-emerald-400'
  if (winRate >= 55) return 'bg-green-300'
  if (winRate >= 50) return 'bg-yellow-300'
  if (winRate >= 45) return 'bg-orange-300'
  if (winRate >= 40) return 'bg-orange-400'
  if (winRate >= 30) return 'bg-red-400'
  return 'bg-red-500'
}

// Get text color for readability
function getTextColor(winRate: number | null, trades: number): string {
  if (winRate === null || trades < 2) return 'text-gray-400 dark:text-gray-500'
  if (winRate >= 60 || winRate <= 35) return 'text-white'
  return 'text-gray-800 dark:text-gray-900'
}

// Tooltip component
function CellTooltip({ cell }: { cell: HeatmapCell }) {
  const settled = cell.won + cell.lost
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
      <div className="font-semibold">{cell.day_name} {cell.hour.toString().padStart(2, '0')}:00 UTC</div>
      <div className="mt-1 space-y-0.5">
        <div>Trades: {cell.trades}</div>
        {settled > 0 && (
          <>
            <div>Won: {cell.won} | Lost: {cell.lost}</div>
            <div>Win Rate: {cell.win_rate?.toFixed(1)}%</div>
            <div>PnL: ${cell.pnl.toFixed(2)}</div>
          </>
        )}
        {settled === 0 && cell.trades > 0 && <div>Pending settlement</div>}
      </div>
      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
    </div>
  )
}

export function TimeOfDayHeatmap({ heatmapData, loading }: TimeOfDayHeatmapProps) {
  // Build grid matrix
  const grid = useMemo(() => {
    if (!heatmapData) return null
    
    // Create 7x24 grid
    const matrix: (HeatmapCell | null)[][] = Array(7).fill(null).map(() => Array(24).fill(null))
    
    for (const cell of heatmapData.heatmap) {
      matrix[cell.day][cell.hour] = cell
    }
    
    return matrix
  }, [heatmapData])
  
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }
  
  if (!heatmapData || !grid) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📊 Trading Heatmap
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No trading data available yet
        </p>
      </div>
    )
  }
  
  const days = heatmapData.days
  const hours = [0, 3, 6, 9, 12, 15, 18, 21] // Show every 3 hours for labels
  
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          📊 Trading Heatmap by Time
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {heatmapData.total_trades.toLocaleString()} trades
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-600 dark:text-gray-400">
        <span>Win Rate:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>&lt;35%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-300 rounded"></div>
          <span>50%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-emerald-500 rounded"></div>
          <span>&gt;65%</span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <span>No data</span>
        </div>
      </div>
      
      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex ml-12 mb-1">
            {Array(24).fill(0).map((_, h) => (
              <div 
                key={h} 
                className="flex-1 text-center text-[10px] text-gray-500 dark:text-gray-400"
              >
                {hours.includes(h) ? `${h.toString().padStart(2, '0')}` : ''}
              </div>
            ))}
          </div>
          
          {/* Grid rows */}
          {days.map((day, dayIdx) => (
            <div key={day} className="flex items-center mb-0.5">
              {/* Day label */}
              <div className="w-12 text-xs text-gray-600 dark:text-gray-400 font-medium">
                {day}
              </div>
              
              {/* Hour cells */}
              <div className="flex flex-1 gap-0.5">
                {Array(24).fill(0).map((_, hour) => {
                  const cell = grid[dayIdx][hour]
                  const winRate = cell?.win_rate ?? null
                  const trades = cell?.trades ?? 0
                  
                  return (
                    <div
                      key={hour}
                      className={`
                        relative group flex-1 h-6 rounded-sm cursor-pointer
                        ${getWinRateColor(winRate, trades)}
                        transition-all hover:ring-2 hover:ring-blue-400 hover:z-10
                      `}
                    >
                      {/* Trade count indicator */}
                      {trades > 0 && (
                        <span className={`
                          absolute inset-0 flex items-center justify-center text-[8px] font-medium
                          ${getTextColor(winRate, trades)}
                        `}>
                          {trades > 99 ? '99+' : trades}
                        </span>
                      )}
                      
                      {/* Tooltip */}
                      {cell && <CellTooltip cell={cell} />}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          
          {/* UTC label */}
          <div className="ml-12 mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            Hours (UTC)
          </div>
        </div>
      </div>
      
      {/* Insights */}
      {(heatmapData.summary.best_cells.length > 0 || heatmapData.summary.worst_cells.length > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Best windows */}
            {heatmapData.summary.best_cells.length > 0 && (
              <div>
                <h4 className="font-medium text-emerald-600 dark:text-emerald-400 mb-2">
                  🟢 Best Trading Windows
                </h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  {heatmapData.summary.best_cells.slice(0, 3).map((cell, i) => (
                    <li key={i}>
                      {cell.day} {cell.hour.toString().padStart(2, '0')}:00 — {cell.win_rate.toFixed(0)}%
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Worst windows */}
            {heatmapData.summary.worst_cells.length > 0 && (
              <div>
                <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">
                  🔴 Avoid Trading
                </h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  {heatmapData.summary.worst_cells.slice(0, 3).map((cell, i) => (
                    <li key={i}>
                      {cell.day} {cell.hour.toString().padStart(2, '0')}:00 — {cell.win_rate.toFixed(0)}%
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-right">
        Updated: {new Date(heatmapData.generated_at).toLocaleString()}
      </div>
    </div>
  )
}
