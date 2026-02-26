"use client"

import { useMemo } from 'react'

interface MomentumRegimeData {
  timestamp: string
  regime: 'TRENDING' | 'RANGING' | 'VOLATILE'
  aggregate_score: number
  direction: 'bullish' | 'bearish' | 'mixed'
  btc: {
    price: number
    momentum_score: number
    direction: string
    adx: number
    roc_24h: number
    roc_7d: number
  }
  eth: {
    price: number
    momentum_score: number
    direction: string
    adx: number
    roc_24h: number
    roc_7d: number
  }
  recommendation: {
    strategy: string
    description: string
    sizing: string
    hold_time: string
  }
  thresholds: {
    trending: number
    ranging: number
  }
  source: string
}

interface MomentumRegimeWidgetProps {
  regimeData?: MomentumRegimeData | null
  loading?: boolean
}

// Get color for regime
function getRegimeColor(regime: string): { bg: string; text: string; border: string } {
  switch (regime) {
    case 'TRENDING':
      return {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-500'
      }
    case 'RANGING':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-500'
      }
    case 'VOLATILE':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-500'
      }
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-700 dark:text-gray-400',
        border: 'border-gray-500'
      }
  }
}

// Get direction arrow and color
function getDirectionDisplay(direction: string): { arrow: string; color: string } {
  switch (direction) {
    case 'bullish':
      return { arrow: '↗', color: 'text-green-500' }
    case 'bearish':
      return { arrow: '↘', color: 'text-red-500' }
    case 'mixed':
      return { arrow: '↔', color: 'text-amber-500' }
    default:
      return { arrow: '•', color: 'text-gray-500' }
  }
}

// Score gauge component
function ScoreGauge({ score, label }: { score: number; label: string }) {
  // Score is 0-1, convert to percentage for width
  const percentage = Math.min(100, Math.max(0, score * 100))
  
  // Color based on score thresholds
  let barColor = 'bg-amber-500'
  if (score >= 0.6) barColor = 'bg-emerald-500'
  else if (score <= 0.3) barColor = 'bg-red-500'
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-mono font-medium">{(score * 100).toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// ADX strength indicator
function ADXIndicator({ adx }: { adx: number }) {
  // ADX interpretation:
  // 0-20: No trend / weak
  // 20-40: Strong trend
  // 40-60: Very strong trend
  // 60+: Extremely strong trend
  
  let strength = 'Weak'
  let color = 'text-gray-500'
  let dots = 1
  
  if (adx >= 60) {
    strength = 'Extreme'
    color = 'text-emerald-500'
    dots = 4
  } else if (adx >= 40) {
    strength = 'Very Strong'
    color = 'text-emerald-400'
    dots = 3
  } else if (adx >= 20) {
    strength = 'Strong'
    color = 'text-amber-500'
    dots = 2
  }
  
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">ADX {adx.toFixed(0)}</span>
      <div className="flex gap-0.5">
        {Array(4).fill(0).map((_, i) => (
          <div 
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${i < dots ? color.replace('text-', 'bg-') : 'bg-gray-300 dark:bg-gray-600'}`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${color}`}>{strength}</span>
    </div>
  )
}

// ROC badge
function ROCBadge({ roc, label }: { roc: number; label: string }) {
  const isPositive = roc >= 0
  const color = isPositive ? 'text-green-500' : 'text-red-500'
  const bgColor = isPositive ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
  
  return (
    <div className={`px-2 py-1 rounded ${bgColor}`}>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`ml-1 text-xs font-medium ${color}`}>
        {isPositive ? '+' : ''}{roc.toFixed(1)}%
      </span>
    </div>
  )
}

export function MomentumRegimeWidget({ regimeData, loading }: MomentumRegimeWidgetProps) {
  
  const formattedTime = useMemo(() => {
    if (!regimeData?.timestamp) return null
    const date = new Date(regimeData.timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }, [regimeData?.timestamp])
  
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }
  
  if (!regimeData) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          📊 Market Momentum Regime
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No regime data available
        </p>
      </div>
    )
  }
  
  const { regime, aggregate_score, direction, btc, eth, recommendation } = regimeData
  const regimeColors = getRegimeColor(regime)
  const directionDisplay = getDirectionDisplay(direction)
  
  return (
    <div className={`rounded-xl border ${regimeColors.border} border-2 bg-white dark:bg-gray-800 p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          📊 Market Momentum
        </h3>
        <div className="flex items-center gap-2">
          {/* Regime badge */}
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${regimeColors.bg} ${regimeColors.text}`}>
            {regime}
          </span>
          {/* Direction */}
          <span className={`text-2xl ${directionDisplay.color}`}>
            {directionDisplay.arrow}
          </span>
        </div>
      </div>
      
      {/* Main score gauge */}
      <div className="mb-4">
        <ScoreGauge score={aggregate_score} label="Momentum Score" />
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>Ranging</span>
          <span>Volatile</span>
          <span>Trending</span>
        </div>
      </div>
      
      {/* BTC/ETH breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* BTC */}
        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
              ₿ BTC
            </span>
            <span className={`text-sm font-bold ${getDirectionDisplay(btc.direction).color}`}>
              {getDirectionDisplay(btc.direction).arrow}
            </span>
          </div>
          <div className="text-lg font-mono font-bold text-gray-900 dark:text-white mb-1">
            ${btc.price.toLocaleString()}
          </div>
          <ADXIndicator adx={btc.adx} />
          <div className="flex gap-1 mt-2">
            <ROCBadge roc={btc.roc_24h} label="24h" />
            <ROCBadge roc={btc.roc_7d} label="7d" />
          </div>
        </div>
        
        {/* ETH */}
        <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">
              Ξ ETH
            </span>
            <span className={`text-sm font-bold ${getDirectionDisplay(eth.direction).color}`}>
              {getDirectionDisplay(eth.direction).arrow}
            </span>
          </div>
          <div className="text-lg font-mono font-bold text-gray-900 dark:text-white mb-1">
            ${eth.price.toLocaleString()}
          </div>
          <ADXIndicator adx={eth.adx} />
          <div className="flex gap-1 mt-2">
            <ROCBadge roc={eth.roc_24h} label="24h" />
            <ROCBadge roc={eth.roc_7d} label="7d" />
          </div>
        </div>
      </div>
      
      {/* Recommendation */}
      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">💡</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Strategy: {recommendation.strategy.charAt(0).toUpperCase() + recommendation.strategy.slice(1)}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {recommendation.description}
        </p>
        <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Sizing: {recommendation.sizing}</span>
          <span>Hold: {recommendation.hold_time}</span>
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>Source: {regimeData.source}</span>
        {formattedTime && <span>Updated: {formattedTime}</span>}
      </div>
    </div>
  )
}
