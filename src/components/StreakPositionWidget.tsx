"use client"

import { useMemo } from 'react'

interface PositionAnalysis {
  context: string
  total: number
  wins: number
  losses: number
  win_rate: number
}

interface ContinuationAnalysis {
  streak_type: 'win' | 'loss'
  streak_length: number
  total: number
  continues: number
  breaks: number
  continuation_rate: number
}

interface Insight {
  type: 'positive' | 'warning' | 'neutral'
  context?: string
  message: string
}

interface StreakPositionData {
  generated_at: string
  trades_analyzed: number
  min_trades_threshold: number
  position_analysis: PositionAnalysis[]
  continuation_analysis: ContinuationAnalysis[]
  insights: Insight[]
}

interface StreakPositionWidgetProps {
  data?: StreakPositionData
  loading?: boolean
}

// Get color for win rate
function getWinRateColor(rate: number): string {
  if (rate >= 60) return '#22C55E'  // green-500
  if (rate >= 50) return '#EAB308'  // yellow-500
  if (rate >= 40) return '#F97316'  // orange-500
  return '#EF4444'                   // red-500
}

// Format context label for display
function formatContext(context: string): string {
  return context
    .replace('after_', 'After ')
    .replace('_wins', ' wins')
    .replace('_losses', ' losses')
    .replace('first_trade', 'First trade')
}

// Progress bar component
function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const percent = Math.min((value / max) * 100, 100)
  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  )
}

// Insight badge
function InsightBadge({ insight }: { insight: Insight }) {
  const colors = {
    positive: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
  }
  
  const icons = {
    positive: '🔥',
    warning: '⚠️',
    neutral: '📊',
  }
  
  return (
    <div className={`px-3 py-2 rounded-lg text-sm border ${colors[insight.type]}`}>
      <span className="mr-2">{icons[insight.type]}</span>
      {insight.message}
    </div>
  )
}

export function StreakPositionWidget({ data, loading }: StreakPositionWidgetProps) {
  
  // Filter position analysis to significant contexts (>= 3 trades)
  const significantPositions = useMemo(() => {
    if (!data?.position_analysis) return []
    return data.position_analysis
      .filter(p => p.total >= (data.min_trades_threshold || 3))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)  // Top 5 contexts
  }, [data])
  
  // Get continuation analysis sorted by streak length
  const continuationData = useMemo(() => {
    if (!data?.continuation_analysis) return []
    return data.continuation_analysis.sort((a, b) => a.streak_length - b.streak_length)
  }, [data])
  
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }
  
  if (!data || !data.position_analysis?.length) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          🎯 Streak Position Analysis
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No streak position data available yet. Need more settled trades.
        </p>
      </div>
    )
  }
  
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          🎯 Streak Position Analysis
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {data.trades_analyzed} trades analyzed
        </span>
      </div>
      
      {/* Insights at top */}
      {data.insights && data.insights.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {data.insights.slice(0, 3).map((insight, i) => (
            <InsightBadge key={i} insight={insight} />
          ))}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Position-based win rates */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Win Rate by Context
          </h4>
          <div className="space-y-3">
            {significantPositions.map((pos) => (
              <div key={pos.context} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatContext(pos.context)}
                  </span>
                  <span className="font-medium" style={{ color: getWinRateColor(pos.win_rate) }}>
                    {pos.win_rate.toFixed(1)}%
                    <span className="text-xs text-gray-500 ml-1">
                      ({pos.wins}W/{pos.losses}L)
                    </span>
                  </span>
                </div>
                <ProgressBar 
                  value={pos.win_rate} 
                  color={getWinRateColor(pos.win_rate)} 
                />
              </div>
            ))}
            {significantPositions.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Need more trades per context
              </p>
            )}
          </div>
        </div>
        
        {/* Continuation probability */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Streak Continuation %
          </h4>
          <div className="space-y-3">
            {continuationData.map((cont) => {
              const isWinStreak = cont.streak_type === 'win'
              const emoji = isWinStreak ? '🔥' : '❄️'
              const label = `After ${cont.streak_length} ${isWinStreak ? 'win' : 'loss'}${cont.streak_length > 1 ? 's' : ''}`
              const color = isWinStreak 
                ? (cont.continuation_rate > 50 ? '#22C55E' : '#EAB308')
                : (cont.continuation_rate > 50 ? '#EF4444' : '#22C55E')
              
              return (
                <div key={`${cont.streak_type}-${cont.streak_length}`} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {emoji} {label}
                    </span>
                    <span className="font-medium" style={{ color }}>
                      {cont.continuation_rate.toFixed(0)}%
                      <span className="text-xs text-gray-500 ml-1">
                        (n={cont.total})
                      </span>
                    </span>
                  </div>
                  <ProgressBar value={cont.continuation_rate} color={color} />
                </div>
              )
            })}
            {continuationData.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Need more streak data
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
        <span>Min {data.min_trades_threshold} trades per context</span>
        <span>
          Updated: {new Date(data.generated_at).toLocaleString()}
        </span>
      </div>
    </div>
  )
}
