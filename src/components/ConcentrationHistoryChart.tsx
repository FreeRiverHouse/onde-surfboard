"use client"

import { useState, useMemo } from 'react'

interface ConcentrationSnapshot {
  timestamp: string
  portfolio_value_cents: number
  by_asset_class: Record<string, number>
  by_correlation_group: Record<string, number>
  total_exposure_cents: number
  position_count: Record<string, number>
  largest_asset_class: string | null
  largest_asset_class_pct: number
  largest_correlated_group: string | null
  largest_correlated_group_pct: number
  exposure_pct: number
}

interface ConcentrationHistoryChartProps {
  data?: ConcentrationSnapshot[]
  loading?: boolean
}

// Color palette for asset classes
const ASSET_COLORS: Record<string, string> = {
  btc: '#F7931A',      // Bitcoin orange
  eth: '#627EEA',      // Ethereum blue
  weather: '#4CAF50',  // Weather green
  crypto: '#9333EA',   // Crypto purple (combined)
  other: '#6B7280',    // Gray
}

export function ConcentrationHistoryChart({ data, loading }: ConcentrationHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  
  // Filter data by time range
  const filteredData = useMemo(() => {
    if (!data?.length) return []
    
    const cutoff = new Date()
    
    switch (timeRange) {
      case '24h':
        cutoff.setHours(cutoff.getHours() - 24)
        break
      case '7d':
        cutoff.setDate(cutoff.getDate() - 7)
        break
      case '30d':
        cutoff.setDate(cutoff.getDate() - 30)
        break
    }
    
    return data.filter(d => new Date(d.timestamp) >= cutoff)
  }, [data, timeRange])
  
  // Get unique asset classes across all data
  const assetClasses = useMemo(() => {
    const classes = new Set<string>()
    filteredData.forEach(d => {
      Object.keys(d.by_asset_class).forEach(c => classes.add(c))
    })
    return Array.from(classes).sort()
  }, [filteredData])
  
  // Calculate statistics
  const stats = useMemo(() => {
    if (!filteredData.length) return null
    
    const latestConcentrations = filteredData.length > 0 
      ? filteredData[filteredData.length - 1].by_asset_class 
      : {}
    
    // Average concentration by asset over period
    const avgByAsset: Record<string, number> = {}
    assetClasses.forEach(asset => {
      const values = filteredData
        .map(d => d.by_asset_class[asset] || 0)
        .filter(v => v > 0)
      avgByAsset[asset] = values.length > 0 
        ? values.reduce((a, b) => a + b, 0) / values.length 
        : 0
    })
    
    // Max concentration seen
    const maxConcentration = Math.max(
      ...filteredData.map(d => Math.max(...Object.values(d.by_asset_class), 0))
    )
    
    // Time at warning level (>40%)
    const warningCount = filteredData.filter(d => 
      Object.values(d.by_asset_class).some(v => v > 0.4)
    ).length
    const warningPct = filteredData.length > 0 
      ? (warningCount / filteredData.length) * 100 
      : 0
    
    return {
      latestConcentrations,
      avgByAsset,
      maxConcentration,
      warningPct,
      dataPoints: filteredData.length
    }
  }, [filteredData, assetClasses])
  
  if (loading) {
    return (
      <div className="bg-white/5 dark:bg-white/5 bg-black/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 dark:border-white/10 border-black/10">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 dark:bg-white/10 bg-black/10 rounded w-1/3 mb-4"></div>
          <div className="h-40 bg-white/10 dark:bg-white/10 bg-black/10 rounded"></div>
        </div>
      </div>
    )
  }
  
  if (!filteredData.length || !stats) {
    return (
      <div className="bg-white/5 dark:bg-white/5 bg-black/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 dark:border-white/10 border-black/10">
        <h3 className="text-sm font-medium text-white/60 dark:text-white/60 text-black/60 flex items-center gap-2 mb-4">
          <span className="text-lg">📊</span>
          Portfolio Concentration History
        </h3>
        <div className="text-center py-8 text-white/40 dark:text-white/40 text-black/40">
          <p>No concentration data yet</p>
          <p className="text-xs mt-2">Data will appear after trading cycles with open positions</p>
        </div>
      </div>
    )
  }
  
  // Chart dimensions
  const chartWidth = 400
  const chartHeight = 120
  const padding = { top: 10, right: 10, bottom: 20, left: 40 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom
  
  // Scales
  const xScale = (i: number) => padding.left + (i / (filteredData.length - 1 || 1)) * innerWidth
  const yScale = (v: number) => chartHeight - padding.bottom - (v * innerHeight)
  
  // Generate paths for each asset class
  const paths: Record<string, string> = {}
  assetClasses.forEach(asset => {
    const points = filteredData.map((d, i) => {
      const x = xScale(i)
      const y = yScale(d.by_asset_class[asset] || 0)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
    paths[asset] = points
  })
  
  // Warning line at 40%
  const warningY = yScale(0.4)
  // Max line at 50%
  const maxY = yScale(0.5)
  
  // Time labels
  const getTimeLabel = (timestamp: string) => {
    const d = new Date(timestamp)
    if (timeRange === '24h') {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  
  return (
    <div className="bg-white/5 dark:bg-white/5 bg-black/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 dark:border-white/10 border-black/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/60 dark:text-white/60 text-black/60 flex items-center gap-2">
          <span className="text-lg">📊</span>
          Portfolio Concentration History
        </h3>
        
        {/* Time range selector */}
        <div className="flex gap-1">
          {(['24h', '7d', '30d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                timeRange === range
                  ? 'bg-white/20 dark:bg-white/20 bg-black/20 text-white dark:text-white text-black'
                  : 'text-white/40 dark:text-white/40 text-black/40 hover:text-white/60 dark:hover:text-white/60 hover:text-black/60'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart */}
      <div className="relative">
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
          className="w-full h-auto"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Warning zone background */}
          <rect
            x={padding.left}
            y={maxY}
            width={innerWidth}
            height={warningY - maxY}
            fill="rgba(239, 68, 68, 0.1)"
          />
          
          {/* Warning line */}
          <line
            x1={padding.left}
            y1={warningY}
            x2={chartWidth - padding.right}
            y2={warningY}
            stroke="rgba(251, 191, 36, 0.5)"
            strokeDasharray="4 2"
            strokeWidth={1}
          />
          <text
            x={padding.left + 2}
            y={warningY - 3}
            fill="rgba(251, 191, 36, 0.7)"
            fontSize={8}
          >
            40% warn
          </text>
          
          {/* Max line */}
          <line
            x1={padding.left}
            y1={maxY}
            x2={chartWidth - padding.right}
            y2={maxY}
            stroke="rgba(239, 68, 68, 0.5)"
            strokeDasharray="4 2"
            strokeWidth={1}
          />
          <text
            x={padding.left + 2}
            y={maxY - 3}
            fill="rgba(239, 68, 68, 0.7)"
            fontSize={8}
          >
            50% max
          </text>
          
          {/* Grid lines */}
          {[0, 0.2, 0.4, 0.6].map(v => (
            <line
              key={v}
              x1={padding.left}
              y1={yScale(v)}
              x2={chartWidth - padding.right}
              y2={yScale(v)}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={1}
            />
          ))}
          
          {/* Y axis labels */}
          {[0, 20, 40, 60].map(v => (
            <text
              key={v}
              x={padding.left - 5}
              y={yScale(v / 100) + 3}
              fill="rgba(255, 255, 255, 0.4)"
              fontSize={9}
              textAnchor="end"
            >
              {v}%
            </text>
          ))}
          
          {/* Asset class lines */}
          {assetClasses.map(asset => (
            <path
              key={asset}
              d={paths[asset]}
              fill="none"
              stroke={ASSET_COLORS[asset] || ASSET_COLORS.other}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
            />
          ))}
          
          {/* Hover points */}
          {filteredData.map((d, i) => (
            <g key={i}>
              {assetClasses.map(asset => {
                const val = d.by_asset_class[asset] || 0
                if (val === 0) return null
                return (
                  <circle
                    key={`${i}-${asset}`}
                    cx={xScale(i)}
                    cy={yScale(val)}
                    r={hoveredPoint === i ? 4 : 2}
                    fill={ASSET_COLORS[asset] || ASSET_COLORS.other}
                    opacity={hoveredPoint === i ? 1 : 0.6}
                  />
                )
              })}
              {/* Invisible hover area */}
              <rect
                x={xScale(i) - 10}
                y={padding.top}
                width={20}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredPoint(i)}
              />
            </g>
          ))}
          
          {/* X axis labels (first, middle, last) */}
          {filteredData.length > 0 && (
            <>
              <text
                x={xScale(0)}
                y={chartHeight - 5}
                fill="rgba(255, 255, 255, 0.4)"
                fontSize={8}
                textAnchor="start"
              >
                {getTimeLabel(filteredData[0].timestamp)}
              </text>
              <text
                x={xScale(filteredData.length - 1)}
                y={chartHeight - 5}
                fill="rgba(255, 255, 255, 0.4)"
                fontSize={8}
                textAnchor="end"
              >
                {getTimeLabel(filteredData[filteredData.length - 1].timestamp)}
              </text>
            </>
          )}
        </svg>
        
        {/* Hover tooltip */}
        {hoveredPoint !== null && filteredData[hoveredPoint] && (
          <div 
            className="absolute bg-black/90 dark:bg-black/90 bg-white/90 rounded-lg px-3 py-2 text-xs shadow-lg pointer-events-none z-10"
            style={{
              left: `${(hoveredPoint / (filteredData.length - 1 || 1)) * 100}%`,
              top: '50%',
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-white/60 dark:text-white/60 text-black/60 mb-1">
              {new Date(filteredData[hoveredPoint].timestamp).toLocaleString()}
            </div>
            {Object.entries(filteredData[hoveredPoint].by_asset_class).map(([asset, pct]) => (
              <div key={asset} className="flex items-center gap-2">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ASSET_COLORS[asset] || ASSET_COLORS.other }}
                />
                <span className="text-white dark:text-white text-black uppercase">{asset}</span>
                <span className="text-white/80 dark:text-white/80 text-black/80">{(pct * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {assetClasses.map(asset => (
          <div key={asset} className="flex items-center gap-1.5">
            <span 
              className="w-3 h-1 rounded"
              style={{ backgroundColor: ASSET_COLORS[asset] || ASSET_COLORS.other }}
            />
            <span className="text-xs text-white/60 dark:text-white/60 text-black/60 uppercase">
              {asset}
            </span>
            <span className="text-xs text-white/40 dark:text-white/40 text-black/40">
              ({((stats.latestConcentrations[asset] || 0) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
      
      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10 dark:border-white/10 border-black/10">
        <div className="text-center">
          <div className="text-lg font-bold text-white dark:text-white text-black">
            {(stats.maxConcentration * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-white/40 dark:text-white/40 text-black/40">Max Seen</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold ${stats.warningPct > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {stats.warningPct.toFixed(0)}%
          </div>
          <div className="text-xs text-white/40 dark:text-white/40 text-black/40">Time at Warning</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white dark:text-white text-black">
            {stats.dataPoints}
          </div>
          <div className="text-xs text-white/40 dark:text-white/40 text-black/40">Data Points</div>
        </div>
      </div>
    </div>
  )
}
