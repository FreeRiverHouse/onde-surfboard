"use client"

import { useMemo } from 'react'
import { Clock, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface Position {
  ticker: string
  position: number
  exposure: number
  pnl?: number
  openedAt?: string
}

interface PositionExpiryHeatmapProps {
  positions?: Position[]
  loading?: boolean
}

interface ExpiryBucket {
  label: string
  minHours: number
  maxHours: number
  positions: Position[]
  totalExposure: number
  totalPnl: number
  count: number
}

// Parse expiration time from Kalshi ticker
function parseTickerExpiration(ticker: string): Date | null {
  try {
    const match = ticker.match(/(?:KXBTCD|KXETHD|INX|KXWEATHER)-(\d{2})([A-Z]{3})(\d{2})(\d{2})-/)
    if (!match) return null
    
    const [, day, monthStr, year, hour] = match
    const months: Record<string, number> = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
    }
    
    const monthNum = months[monthStr]
    if (monthNum === undefined) return null
    
    const fullYear = 2000 + parseInt(year, 10)
    return new Date(Date.UTC(fullYear, monthNum, parseInt(day, 10), parseInt(hour, 10), 0, 0))
  } catch {
    return null
  }
}

// Get hours until expiration
function getHoursToExpiry(ticker: string): number {
  const expiry = parseTickerExpiration(ticker)
  if (!expiry) return -1
  const now = new Date()
  return (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
}

// Determine asset type from ticker
function getAssetType(ticker: string): 'BTC' | 'ETH' | 'Weather' | 'Other' {
  if (ticker.includes('KXBTCD')) return 'BTC'
  if (ticker.includes('KXETHD')) return 'ETH'
  if (ticker.includes('WEATHER') || ticker.includes('TEMP')) return 'Weather'
  return 'Other'
}

// Get risk level color for expiry urgency
function getExpiryColor(hoursLeft: number): string {
  if (hoursLeft < 0) return 'border-red-500 bg-red-50 dark:bg-red-900/20'
  if (hoursLeft < 1) return 'border-red-400 bg-red-50 dark:bg-red-900/20'
  if (hoursLeft < 4) return 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
  if (hoursLeft < 12) return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
  if (hoursLeft < 24) return 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
  return 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
}

export function PositionExpiryHeatmap({ positions = [], loading }: PositionExpiryHeatmapProps) {
  // Define expiry buckets
  const buckets = useMemo(() => {
    const bucketDefs = [
      { label: 'Expired', minHours: -Infinity, maxHours: 0 },
      { label: '<1h', minHours: 0, maxHours: 1 },
      { label: '1-4h', minHours: 1, maxHours: 4 },
      { label: '4-12h', minHours: 4, maxHours: 12 },
      { label: '12-24h', minHours: 12, maxHours: 24 },
      { label: '1-3d', minHours: 24, maxHours: 72 },
      { label: '>3d', minHours: 72, maxHours: Infinity }
    ]
    
    return bucketDefs.map(def => {
      const bucketPositions = positions.filter(p => {
        const hours = getHoursToExpiry(p.ticker)
        if (hours < 0 && def.label === 'Expired') return true
        return hours >= def.minHours && hours < def.maxHours
      })
      
      return {
        ...def,
        positions: bucketPositions,
        count: bucketPositions.length,
        totalExposure: bucketPositions.reduce((sum, p) => sum + Math.abs(p.exposure), 0),
        totalPnl: bucketPositions.reduce((sum, p) => sum + (p.pnl || 0), 0)
      } as ExpiryBucket
    }).filter(b => b.count > 0 || b.label === '<1h' || b.label === '1-4h') // Always show near-term buckets
  }, [positions])
  
  // Calculate concentration metrics
  const metrics = useMemo(() => {
    const totalExposure = positions.reduce((sum, p) => sum + Math.abs(p.exposure), 0)
    const totalPnl = positions.reduce((sum, p) => sum + (p.pnl || 0), 0)
    
    // Find most concentrated bucket
    const maxBucket = buckets.length > 0 
      ? buckets.reduce((max, b) => b.totalExposure > max.totalExposure ? b : max, buckets[0])
      : null
    
    // Count urgent positions (<4h)
    const urgentCount = positions.filter(p => {
      const hours = getHoursToExpiry(p.ticker)
      return hours >= 0 && hours < 4
    }).length
    
    // Concentration in urgent (<4h)
    const urgentExposure = buckets
      .filter(b => b.maxHours <= 4)
      .reduce((sum, b) => sum + b.totalExposure, 0)
    const urgentPct = totalExposure > 0 ? (urgentExposure / totalExposure) * 100 : 0
    
    return {
      totalExposure,
      totalPnl,
      maxBucket,
      urgentCount,
      urgentPct,
      riskLevel: urgentPct > 50 ? 'high' : urgentPct > 25 ? 'medium' : 'low'
    }
  }, [positions, buckets])
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  if (positions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4" />
          Position Expiry Heatmap
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">No open positions</p>
      </div>
    )
  }
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Position Expiry Heatmap
        </h3>
        
        {/* Risk indicator */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
          metrics.riskLevel === 'high' 
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
            : metrics.riskLevel === 'medium'
            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        }`}>
          {metrics.riskLevel === 'high' && <AlertTriangle className="w-3 h-3" />}
          {metrics.urgentPct.toFixed(0)}% near-term
        </div>
      </div>
      
      {/* Heatmap Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
        {buckets.map(bucket => (
          <div
            key={bucket.label}
            className={`relative rounded-lg border-2 p-2 min-h-[80px] transition-all ${getExpiryColor(bucket.maxHours)}`}
          >
            {/* Bucket label */}
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              {bucket.label}
            </div>
            
            {bucket.count > 0 ? (
              <>
                {/* Position count */}
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {bucket.count}
                </div>
                
                {/* Exposure */}
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  ${(bucket.totalExposure / 100).toFixed(0)}
                </div>
                
                {/* PnL indicator */}
                <div className={`flex items-center gap-0.5 text-xs mt-1 ${
                  bucket.totalPnl >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {bucket.totalPnl >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  ${(Math.abs(bucket.totalPnl) / 100).toFixed(2)}
                </div>
                
                {/* Position dots by asset */}
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {bucket.positions.slice(0, 8).map((p, i) => {
                    const asset = getAssetType(p.ticker)
                    return (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          asset === 'BTC' ? 'bg-orange-400' :
                          asset === 'ETH' ? 'bg-purple-400' :
                          asset === 'Weather' ? 'bg-blue-400' :
                          'bg-gray-400'
                        }`}
                        title={`${p.ticker}: $${(p.exposure / 100).toFixed(2)}`}
                      />
                    )
                  })}
                  {bucket.positions.length > 8 && (
                    <span className="text-[10px] text-gray-500">+{bucket.positions.length - 8}</span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-400 dark:text-gray-600">—</div>
            )}
          </div>
        ))}
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Exposure</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            ${(metrics.totalExposure / 100).toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total PnL</div>
          <div className={`text-sm font-semibold ${
            metrics.totalPnl >= 0 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {metrics.totalPnl >= 0 ? '+' : ''}${(metrics.totalPnl / 100).toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Urgent (&lt;4h)</div>
          <div className={`text-sm font-semibold ${
            metrics.urgentCount > 0 
              ? 'text-orange-600 dark:text-orange-400' 
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            {metrics.urgentCount} position{metrics.urgentCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-400" /> BTC
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-purple-400" /> ETH
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-400" /> Weather
        </div>
      </div>
    </div>
  )
}
