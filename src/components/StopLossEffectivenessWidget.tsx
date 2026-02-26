"use client"

import { useState, useMemo } from 'react'
import { Shield, TrendingUp, TrendingDown, Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface StopLossEvent {
  timestamp: string
  ticker: string
  entryPrice: number
  exitPrice: number
  contracts: number
  lossPct: number
  actualLossCents: number
  outcome: 'saved' | 'premature' | 'unknown'
  potentialLossCents?: number
  savedCents?: number
  potentialProfitCents?: number
}

interface StopLossStats {
  totalTriggered: number
  wouldHaveLost: number
  wouldHaveWon: number
  unknownOutcome: number
  effectivenessPct: number
  actualLossCents: number
  potentialLossCents: number
  savedCents: number
  savedDollars: number
  events: StopLossEvent[]
  generatedAt: string
}

interface StopLossEffectivenessWidgetProps {
  data?: StopLossStats | null
  loading?: boolean
}

export function StopLossEffectivenessWidget({ data, loading }: StopLossEffectivenessWidgetProps) {
  const [showEvents, setShowEvents] = useState(false)
  
  // Parse asset from ticker
  const parseAsset = (ticker: string): string => {
    if (ticker.includes('KXETHD')) return 'ETH'
    if (ticker.includes('KXBTCD')) return 'BTC'
    return 'Other'
  }
  
  // Format timestamp for display
  const formatTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return timestamp.slice(0, 16)
    }
  }
  
  // Calculate stats by outcome
  const outcomeStats = useMemo(() => {
    if (!data?.events?.length) return null
    
    const byOutcome = {
      saved: data.events.filter(e => e.outcome === 'saved'),
      premature: data.events.filter(e => e.outcome === 'premature'),
      unknown: data.events.filter(e => e.outcome === 'unknown')
    }
    
    const totalSaved = byOutcome.saved.reduce((sum, e) => sum + (e.savedCents || 0), 0)
    const missedProfit = byOutcome.premature.reduce((sum, e) => sum + (e.potentialProfitCents || 0), 0)
    
    return {
      ...byOutcome,
      totalSaved,
      missedProfit,
      netBenefit: totalSaved - missedProfit
    }
  }, [data])
  
  // Loading state
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Stop-Loss Effectiveness</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }
  
  // No data state
  if (!data || data.totalTriggered === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Stop-Loss Effectiveness</h3>
        </div>
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            No stop-losses triggered yet
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
            Stop-losses protect against sudden price movements
          </p>
        </div>
      </div>
    )
  }
  
  // Effectiveness color
  const effectivenessColor = data.effectivenessPct >= 60 
    ? 'text-emerald-600 dark:text-emerald-400' 
    : data.effectivenessPct >= 40 
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400'
  
  // Net benefit color
  const netBenefitColor = (outcomeStats?.netBenefit || 0) >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400'
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Stop-Loss Effectiveness</h3>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {data.totalTriggered} triggered
        </span>
      </div>
      
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Effectiveness Rate */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Effectiveness</div>
          <div className={`text-2xl font-bold ${effectivenessColor}`}>
            {data.effectivenessPct}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {data.wouldHaveLost}/{data.wouldHaveLost + data.wouldHaveWon} correct
          </div>
        </div>
        
        {/* Total Saved */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Est. Saved</div>
          <div className={`text-2xl font-bold ${data.savedCents >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            ${data.savedDollars.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            vs holding to settlement
          </div>
        </div>
      </div>
      
      {/* Outcome Breakdown */}
      <div className="space-y-2 mb-4">
        {/* Saved positions */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-slate-600 dark:text-slate-400">Correctly exited (saved loss)</span>
          </div>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {data.wouldHaveLost}
          </span>
        </div>
        
        {/* Premature exits */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-slate-600 dark:text-slate-400">Premature exits (missed profit)</span>
          </div>
          <span className="font-medium text-red-600 dark:text-red-400">
            {data.wouldHaveWon}
          </span>
        </div>
        
        {/* Unknown */}
        {data.unknownOutcome > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              <span className="text-slate-600 dark:text-slate-400">Pending settlement</span>
            </div>
            <span className="font-medium text-slate-500">
              {data.unknownOutcome}
            </span>
          </div>
        )}
      </div>
      
      {/* Net Benefit */}
      {outcomeStats && (
        <div className="bg-slate-100 dark:bg-slate-700/30 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Net Benefit</span>
            <span className={`font-bold ${netBenefitColor}`}>
              {outcomeStats.netBenefit >= 0 ? '+' : ''}${(outcomeStats.netBenefit / 100).toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Saved ${(outcomeStats.totalSaved / 100).toFixed(2)} − Missed ${(outcomeStats.missedProfit / 100).toFixed(2)}
          </div>
        </div>
      )}
      
      {/* Events Toggle */}
      {data.events.length > 0 && (
        <div>
          <button
            onClick={() => setShowEvents(!showEvents)}
            className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {showEvents ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showEvents ? 'Hide' : 'Show'} recent events ({data.events.length})
          </button>
          
          {showEvents && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {data.events.slice(0, 10).map((event, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/30 rounded text-xs"
                >
                  <div className="flex items-center gap-2">
                    {event.outcome === 'saved' ? (
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                    ) : event.outcome === 'premature' ? (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    ) : (
                      <Clock className="w-3 h-3 text-slate-400" />
                    )}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {parseAsset(event.ticker)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {event.entryPrice}¢ → {event.exitPrice}¢
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={
                      event.outcome === 'saved' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : event.outcome === 'premature'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-500'
                    }>
                      {event.outcome === 'saved' && event.savedCents
                        ? `+$${(event.savedCents / 100).toFixed(2)}`
                        : event.outcome === 'premature' && event.potentialProfitCents
                          ? `-$${(event.potentialProfitCents / 100).toFixed(2)}`
                          : '—'}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500">
                      {formatTime(event.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Stop-loss threshold: 50% loss from entry price. 
          {data.effectivenessPct >= 50 
            ? ' ✅ Working as intended.'
            : ' ⚠️ Consider adjusting threshold.'}
        </p>
      </div>
    </div>
  )
}
