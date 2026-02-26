"use client"

import { useMemo } from 'react'

interface CorrelationData {
  generated_at: string
  status: string
  correlation: {
    value: number
    period_days: number
    interpretation: string
    data_points: number
  }
  adjustment: {
    crypto_group_limit: number
    adjustment_reason: string
    risk_level: string
  }
  current_prices: {
    btc: number
    eth: number
    btc_7d_change_pct: number
    eth_7d_change_pct: number
  }
  data_source: string
}

interface CorrelationMatrix {
  assets: string[]
  values: number[][]
}

interface CorrelationHeatmapWidgetProps {
  correlationData?: CorrelationData
  loading?: boolean
}

// Get color for correlation value (-1 to 1)
function getCorrelationColor(value: number): string {
  // High positive correlation: red (warning - assets move together)
  // Low correlation: green (good diversification)
  // Negative correlation: blue (great for hedging)
  
  if (value >= 0.9) return '#EF4444'      // red-500 (very high risk)
  if (value >= 0.7) return '#F97316'      // orange-500 (high)
  if (value >= 0.5) return '#EAB308'      // yellow-500 (medium)
  if (value >= 0.3) return '#84CC16'      // lime-500 (low)
  if (value >= 0) return '#22C55E'        // green-500 (very low)
  if (value >= -0.3) return '#14B8A6'     // teal-500 (slight negative)
  if (value >= -0.7) return '#0EA5E9'     // sky-500 (negative)
  return '#3B82F6'                         // blue-500 (highly negative)
}

// Get text color for readability
function getTextColor(value: number): string {
  return Math.abs(value) > 0.6 ? 'white' : 'black'
}

// Risk level badge
function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[level] || colors.medium}`}>
      {level.toUpperCase()}
    </span>
  )
}

export function CorrelationHeatmapWidget({ correlationData, loading }: CorrelationHeatmapWidgetProps) {
  
  // Build correlation matrix
  // Currently we have BTC-ETH correlation. Weather is assumed uncorrelated (0).
  const matrix = useMemo<CorrelationMatrix>(() => {
    const btcEthCorr = correlationData?.correlation.value ?? 0.9
    
    // Assets: BTC, ETH, Weather
    // Matrix is symmetric: corr(A,B) = corr(B,A)
    // Diagonal is always 1 (self-correlation)
    return {
      assets: ['BTC', 'ETH', 'Weather'],
      values: [
        [1.0, btcEthCorr, 0.05],      // BTC row
        [btcEthCorr, 1.0, 0.02],      // ETH row
        [0.05, 0.02, 1.0],            // Weather row
      ]
    }
  }, [correlationData])
  
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }
  
  const cellSize = 80
  const labelWidth = 70
  const headerHeight = 30
  const totalWidth = labelWidth + matrix.assets.length * cellSize
  const totalHeight = headerHeight + matrix.assets.length * cellSize
  
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Asset Correlation Matrix
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {correlationData?.correlation.period_days || 7}-day rolling correlation
          </p>
        </div>
        {correlationData && (
          <RiskBadge level={correlationData.adjustment.risk_level} />
        )}
      </div>
      
      {/* Heatmap */}
      <div className="flex justify-center overflow-x-auto">
        <svg width={totalWidth} height={totalHeight} className="block">
          {/* Column headers */}
          {matrix.assets.map((asset, i) => (
            <text
              key={`header-${asset}`}
              x={labelWidth + i * cellSize + cellSize / 2}
              y={headerHeight - 8}
              textAnchor="middle"
              className="text-xs font-medium fill-gray-600 dark:fill-gray-400"
            >
              {asset}
            </text>
          ))}
          
          {/* Rows */}
          {matrix.assets.map((rowAsset, row) => (
            <g key={`row-${rowAsset}`}>
              {/* Row label */}
              <text
                x={labelWidth - 10}
                y={headerHeight + row * cellSize + cellSize / 2 + 4}
                textAnchor="end"
                className="text-xs font-medium fill-gray-600 dark:fill-gray-400"
              >
                {rowAsset}
              </text>
              
              {/* Cells */}
              {matrix.values[row].map((value, col) => (
                <g key={`cell-${row}-${col}`}>
                  <rect
                    x={labelWidth + col * cellSize}
                    y={headerHeight + row * cellSize}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    rx={8}
                    fill={getCorrelationColor(value)}
                    className="transition-opacity hover:opacity-80"
                  />
                  <text
                    x={labelWidth + col * cellSize + cellSize / 2 - 1}
                    y={headerHeight + row * cellSize + cellSize / 2 + 5}
                    textAnchor="middle"
                    fill={getTextColor(value)}
                    className="text-sm font-semibold"
                  >
                    {value.toFixed(2)}
                  </text>
                </g>
              ))}
            </g>
          ))}
        </svg>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="flex items-center gap-1">
          {[-1, -0.5, 0, 0.5, 0.9].map(v => (
            <div
              key={v}
              className="w-6 h-4 rounded"
              style={{ backgroundColor: getCorrelationColor(v) }}
              title={v.toString()}
            />
          ))}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
          <span className="text-blue-500">Hedging</span>
          {' → '}
          <span className="text-green-500">Diversified</span>
          {' → '}
          <span className="text-red-500">Correlated</span>
        </div>
      </div>
      
      {/* Details */}
      {correlationData && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* BTC-ETH Insight */}
          <div className="flex items-start gap-3">
            <div className="text-2xl">📊</div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                BTC-ETH Correlation: {(correlationData.correlation.value * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {correlationData.adjustment.adjustment_reason}
              </p>
            </div>
          </div>
          
          {/* Crypto limit */}
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Combined Crypto Limit: {correlationData.adjustment.crypto_group_limit}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Auto-adjusted based on {correlationData.correlation.data_points} data points
              </p>
            </div>
          </div>
          
          {/* Weather Diversification */}
          <div className="flex items-start gap-3">
            <div className="text-2xl">🌤️</div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Weather: Uncorrelated (~0%)
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Excellent diversification — NWS forecasts independent of crypto markets
              </p>
            </div>
          </div>
          
          {/* Prices */}
          <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">BTC Price</div>
              <div className="font-medium text-gray-900 dark:text-white">
                ${correlationData.current_prices.btc.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className={`text-xs ${correlationData.current_prices.btc_7d_change_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {correlationData.current_prices.btc_7d_change_pct >= 0 ? '+' : ''}
                {correlationData.current_prices.btc_7d_change_pct.toFixed(1)}% 7d
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">ETH Price</div>
              <div className="font-medium text-gray-900 dark:text-white">
                ${correlationData.current_prices.eth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className={`text-xs ${correlationData.current_prices.eth_7d_change_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {correlationData.current_prices.eth_7d_change_pct >= 0 ? '+' : ''}
                {correlationData.current_prices.eth_7d_change_pct.toFixed(1)}% 7d
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-2">
            Data from {correlationData.data_source} • Updated {new Date(correlationData.generated_at).toLocaleString()}
          </div>
        </div>
      )}
      
      {!correlationData && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>📊 No correlation data available</p>
          <p className="text-xs mt-1">Run btc-eth-correlation.py to generate</p>
        </div>
      )}
    </div>
  )
}
