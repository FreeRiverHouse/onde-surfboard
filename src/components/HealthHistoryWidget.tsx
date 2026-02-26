"use client"

import { useState, useMemo } from 'react'

interface HealthSnapshot {
  timestamp: string
  is_running: boolean
  cycle_count: number
  dry_run: boolean
  trades_today: number
  win_rate_today: number
  pnl_today_cents: number
  positions_count: number
  cash_cents: number
  circuit_breaker_active: boolean
  consecutive_losses: number
  status: string
}

interface DowntimePeriod {
  start: string
  end: string | null
  ongoing?: boolean
}

interface HealthHistoryData {
  snapshots: HealthSnapshot[]
  dataPoints: number
  uptimePct: number
  runningCount: number
  circuitBreakerCount: number
  downtimePeriods: DowntimePeriod[]
  latestStatus: string | null
  lastUpdated: string | null
}

interface HealthHistoryWidgetProps {
  data?: HealthHistoryData
  loading?: boolean
}

export function HealthHistoryWidget({ data, loading }: HealthHistoryWidgetProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d'>('24h')
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  
  // Filter data by time range
  const filteredData = useMemo(() => {
    if (!data?.snapshots?.length) return []
    
    const cutoff = new Date()
    
    switch (timeRange) {
      case '24h':
        cutoff.setHours(cutoff.getHours() - 24)
        break
      case '7d':
        cutoff.setDate(cutoff.getDate() - 7)
        break
    }
    
    return data.snapshots.filter(d => new Date(d.timestamp) >= cutoff)
  }, [data, timeRange])
  
  // Calculate statistics for the view
  const stats = useMemo(() => {
    if (!filteredData.length) return null
    
    const running = filteredData.filter(s => s.is_running).length
    const cbActive = filteredData.filter(s => s.circuit_breaker_active).length
    const total = filteredData.length
    
    return {
      uptime: total > 0 ? (running / total * 100).toFixed(1) : '0',
      cbPct: total > 0 ? (cbActive / total * 100).toFixed(1) : '0',
      dataPoints: total
    }
  }, [filteredData])
  
  // Format time for display
  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  
  // Get status color and emoji
  const getStatusStyle = (snapshot: HealthSnapshot) => {
    if (!snapshot.is_running) return { color: 'bg-red-500', emoji: '🔴' }
    if (snapshot.circuit_breaker_active) return { color: 'bg-yellow-500', emoji: '⏸️' }
    return { color: 'bg-green-500', emoji: '🟢' }
  }
  
  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-32 mb-3"></div>
          <div className="h-24 bg-gray-700/50 rounded"></div>
        </div>
      </div>
    )
  }
  
  if (!data?.snapshots?.length) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <h3 className="text-sm font-medium text-gray-400 mb-2">🩺 Autotrader Health</h3>
        <p className="text-gray-500 text-sm">No health history data yet.</p>
        <p className="text-gray-600 text-xs mt-1">Data populates every 5 minutes.</p>
      </div>
    )
  }
  
  // Chart dimensions
  const chartWidth = 320
  const chartHeight = 80
  const barWidth = Math.max(2, Math.min(8, (chartWidth - 40) / filteredData.length))
  const barGap = 1
  
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          🩺 Autotrader Uptime
          {data.latestStatus && (
            <span className={`text-xs px-2 py-0.5 rounded ${
              data.latestStatus.includes('paused') ? 'bg-yellow-500/20 text-yellow-400' :
              data.latestStatus.includes('running') ? 'bg-green-500/20 text-green-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {data.latestStatus}
            </span>
          )}
        </h3>
        
        {/* Time range selector */}
        <div className="flex gap-1">
          {(['24h', '7d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                timeRange === range
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      
      {/* Stats row */}
      {stats && (
        <div className="flex gap-4 mb-3 text-xs">
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${
              parseFloat(stats.uptime) >= 95 ? 'bg-green-500' :
              parseFloat(stats.uptime) >= 80 ? 'bg-yellow-500' : 'bg-red-500'
            }`}></span>
            <span className="text-gray-400">Uptime:</span>
            <span className="text-gray-200 font-medium">{stats.uptime}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Circuit Breaker:</span>
            <span className={`font-medium ${
              parseFloat(stats.cbPct) > 20 ? 'text-yellow-400' : 'text-gray-200'
            }`}>{stats.cbPct}%</span>
          </div>
          <div className="text-gray-500">
            {stats.dataPoints} samples
          </div>
        </div>
      )}
      
      {/* Timeline chart */}
      <div className="relative" style={{ height: chartHeight }}>
        <svg width="100%" height={chartHeight} className="overflow-visible">
          {/* Background grid lines */}
          <line x1="0" y1={chartHeight * 0.5} x2="100%" y2={chartHeight * 0.5} stroke="#374151" strokeWidth="1" strokeDasharray="4"/>
          
          {/* Bars */}
          {filteredData.map((snapshot, i) => {
            const x = (i * (barWidth + barGap))
            const style = getStatusStyle(snapshot)
            const isHovered = hoveredPoint === i
            
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={10}
                  width={barWidth}
                  height={chartHeight - 20}
                  rx={1}
                  className={`${style.color} ${isHovered ? 'opacity-100' : 'opacity-70'} transition-opacity cursor-pointer`}
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                {/* Circuit breaker indicator */}
                {snapshot.circuit_breaker_active && snapshot.is_running && (
                  <rect
                    x={x}
                    y={chartHeight - 15}
                    width={barWidth}
                    height={5}
                    rx={1}
                    className="fill-yellow-400"
                  />
                )}
              </g>
            )
          })}
        </svg>
        
        {/* Tooltip */}
        {hoveredPoint !== null && filteredData[hoveredPoint] && (
          <div 
            className="absolute bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs shadow-lg z-10 pointer-events-none"
            style={{ 
              left: Math.min(hoveredPoint * (barWidth + barGap), chartWidth - 150),
              top: -60
            }}
          >
            <div className="text-gray-300 font-medium mb-1">
              {formatDate(filteredData[hoveredPoint].timestamp)} {formatTime(filteredData[hoveredPoint].timestamp)}
            </div>
            <div className="flex items-center gap-2">
              <span>{getStatusStyle(filteredData[hoveredPoint]).emoji}</span>
              <span className="text-gray-400">{filteredData[hoveredPoint].status}</span>
            </div>
            <div className="text-gray-500 mt-1">
              Cycle #{filteredData[hoveredPoint].cycle_count} • {filteredData[hoveredPoint].positions_count} positions
            </div>
            {filteredData[hoveredPoint].circuit_breaker_active && (
              <div className="text-yellow-400 mt-1">
                ⏸️ {filteredData[hoveredPoint].consecutive_losses} consecutive losses
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-green-500"></span>
          Running
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-yellow-500"></span>
          Paused
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-red-500"></span>
          Down
        </div>
      </div>
      
      {/* Downtime periods */}
      {data.downtimePeriods && data.downtimePeriods.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <div className="text-xs text-gray-500 mb-1">Recent Downtime:</div>
          <div className="flex flex-wrap gap-2">
            {data.downtimePeriods.slice(-3).map((period, i) => (
              <div key={i} className="text-xs bg-red-900/20 text-red-400 px-2 py-0.5 rounded">
                {formatTime(period.start)}
                {period.ongoing ? ' → now' : period.end ? ` → ${formatTime(period.end)}` : ''}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Last updated */}
      {data.lastUpdated && (
        <div className="text-xs text-gray-600 mt-2">
          Last updated: {formatTime(data.lastUpdated)}
        </div>
      )}
    </div>
  )
}
