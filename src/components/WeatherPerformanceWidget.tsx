"use client"

import { useState } from 'react'

interface CityStats {
  city: string
  cityName: string
  trades: number
  wins: number
  losses: number
  winRate: number
  pnlCents: number
  avgEdge: number
  forecastAccuracy: number  // NWS forecast accuracy (within 2°F of actual)
}

interface WeatherPerformance {
  totalTrades: number
  wins: number
  losses: number
  pending: number
  winRate: number
  pnlCents: number
  avgEdge: number
  cities: CityStats[]
  forecastAccuracy: number  // Overall NWS forecast accuracy
  cryptoComparison: {
    weatherWinRate: number
    cryptoWinRate: number
    weatherEdge: number
    cryptoEdge: number
  }
  lastUpdated: string
}

interface WeatherPerformanceWidgetProps {
  data?: WeatherPerformance | null
  loading?: boolean
}

const CITY_FLAGS: Record<string, string> = {
  NYC: '🗽',
  NY: '🗽',
  CHI: '🌬️',
  MIA: '🌴',
  DEN: '🏔️',
  LAX: '🌴',
  HOU: '🤠',
  AUS: '🎸',
  PHI: '🔔',
  SFO: '🌉',
}

export function WeatherPerformanceWidget({ data, loading }: WeatherPerformanceWidgetProps) {
  const [showAllCities, setShowAllCities] = useState(false)
  
  if (loading) {
    return (
      <div className="bg-white/5 dark:bg-white/5 bg-black/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 dark:border-white/10 border-black/10">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 dark:bg-white/10 bg-black/10 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-white/10 dark:bg-white/10 bg-black/10 rounded"></div>
            <div className="h-24 bg-white/10 dark:bg-white/10 bg-black/10 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
  
  // If no data, show "coming soon" state
  if (!data || data.totalTrades === 0) {
    return (
      <div className="bg-white/5 dark:bg-white/5 bg-black/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 dark:border-white/10 border-black/10">
        <h3 className="text-sm font-medium text-white/60 dark:text-white/60 text-black/60 flex items-center gap-2 mb-4">
          <span className="text-lg">🌤️</span>
          Weather Market Performance
        </h3>
        
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🌡️</div>
          <p className="text-white/80 dark:text-white/80 text-black/80 font-medium mb-2">
            Weather Markets Ready
          </p>
          <p className="text-white/50 dark:text-white/50 text-black/50 text-sm mb-4">
            KXHIGH/KXLOW markets integrated with NWS forecasts.
            <br />
            Trades will appear here once weather opportunities meet edge thresholds.
          </p>
          
          {/* Show advantage of weather markets */}
          <div className="grid grid-cols-2 gap-3 mt-4 text-left">
            <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
              <div className="text-emerald-400 text-xs font-medium mb-1">NWS Forecasts</div>
              <div className="text-white/80 dark:text-white/80 text-black/80 text-sm">
                Official weather data provides reliable edge
              </div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
              <div className="text-blue-400 text-xs font-medium mb-1">Higher Kelly</div>
              <div className="text-white/80 dark:text-white/80 text-black/80 text-sm">
                8% Kelly fraction (vs 5% crypto)
              </div>
            </div>
          </div>
          
          {/* City availability */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {Object.entries(CITY_FLAGS).slice(0, 6).map(([city, flag]) => (
              <span
                key={city}
                className="px-2 py-1 bg-white/5 dark:bg-white/5 bg-black/5 rounded text-xs text-white/60 dark:text-white/60 text-black/60"
              >
                {flag} {city}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  // Full performance view when we have trades
  const sortedCities = [...data.cities].sort((a, b) => b.pnlCents - a.pnlCents)
  const displayCities = showAllCities ? sortedCities : sortedCities.slice(0, 4)
  const hasMoreCities = sortedCities.length > 4
  
  const pnlDollars = data.pnlCents / 100
  // Future: use for crypto comparison display
  const _cryptoPnlEstimate = data.cryptoComparison.cryptoWinRate > 0 
    ? (data.cryptoComparison.cryptoWinRate - 50) / 50 * Math.abs(pnlDollars)
    : 0
  void _cryptoPnlEstimate // silence lint
  
  return (
    <div className="bg-white/5 dark:bg-white/5 bg-black/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 dark:border-white/10 border-black/10">
      <h3 className="text-sm font-medium text-white/60 dark:text-white/60 text-black/60 flex items-center gap-2 mb-4">
        <span className="text-lg">🌤️</span>
        Weather Market Performance
        <span className="ml-auto text-xs text-white/40 dark:text-white/40 text-black/40">
          {data.totalTrades} trades
        </span>
      </h3>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Win Rate */}
        <div className="bg-white/5 dark:bg-white/5 bg-black/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white dark:text-white text-black">
            {data.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-white/50 dark:text-white/50 text-black/50">Win Rate</div>
          <div className={`text-xs ${data.winRate > data.cryptoComparison.cryptoWinRate ? 'text-emerald-400' : 'text-red-400'}`}>
            {data.winRate > data.cryptoComparison.cryptoWinRate ? '↑' : '↓'} 
            {Math.abs(data.winRate - data.cryptoComparison.cryptoWinRate).toFixed(1)}% vs crypto
          </div>
        </div>
        
        {/* PnL */}
        <div className="bg-white/5 dark:bg-white/5 bg-black/5 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${pnlDollars >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${Math.abs(pnlDollars).toFixed(2)}
          </div>
          <div className="text-xs text-white/50 dark:text-white/50 text-black/50">
            {pnlDollars >= 0 ? 'Profit' : 'Loss'}
          </div>
          <div className="text-xs text-white/40 dark:text-white/40 text-black/40">
            {data.wins}W / {data.losses}L
          </div>
        </div>
        
        {/* NWS Accuracy */}
        <div className="bg-white/5 dark:bg-white/5 bg-black/5 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${data.forecastAccuracy >= 85 ? 'text-emerald-400' : data.forecastAccuracy >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
            {data.forecastAccuracy.toFixed(0)}%
          </div>
          <div className="text-xs text-white/50 dark:text-white/50 text-black/50">NWS Accuracy</div>
          <div className="text-xs text-white/40 dark:text-white/40 text-black/40">
            forecasts ±2°F
          </div>
        </div>
      </div>
      
      {/* Weather vs Crypto Comparison */}
      <div className="bg-gradient-to-r from-blue-500/10 to-orange-500/10 rounded-lg p-3 mb-4 border border-white/5">
        <div className="text-xs font-medium text-white/60 dark:text-white/60 text-black/60 mb-2">
          Weather vs Crypto Edge
        </div>
        <div className="flex items-center gap-4">
          {/* Weather bar */}
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-blue-400">🌤️ Weather</span>
              <span className="text-white/80 dark:text-white/80 text-black/80">
                {data.cryptoComparison.weatherEdge.toFixed(1)}% avg edge
              </span>
            </div>
            <div className="h-2 bg-white/10 dark:bg-white/10 bg-black/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(data.cryptoComparison.weatherEdge * 3, 100)}%` }}
              />
            </div>
          </div>
          
          {/* Crypto bar */}
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-orange-400">₿ Crypto</span>
              <span className="text-white/80 dark:text-white/80 text-black/80">
                {data.cryptoComparison.cryptoEdge.toFixed(1)}% avg edge
              </span>
            </div>
            <div className="h-2 bg-white/10 dark:bg-white/10 bg-black/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(data.cryptoComparison.cryptoEdge * 3, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* City Breakdown */}
      {sortedCities.length > 0 && (
        <div>
          <div className="text-xs font-medium text-white/60 dark:text-white/60 text-black/60 mb-2">
            Performance by City
          </div>
          <div className="space-y-2">
            {displayCities.map(city => (
              <div 
                key={city.city}
                className="flex items-center justify-between bg-white/5 dark:bg-white/5 bg-black/5 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CITY_FLAGS[city.city] || '🌡️'}</span>
                  <div>
                    <div className="text-sm font-medium text-white/90 dark:text-white/90 text-black/90">
                      {city.cityName}
                    </div>
                    <div className="text-xs text-white/50 dark:text-white/50 text-black/50">
                      {city.trades} trades • {city.forecastAccuracy.toFixed(0)}% accuracy
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${city.pnlCents >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {city.pnlCents >= 0 ? '+' : '-'}${Math.abs(city.pnlCents / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-white/50 dark:text-white/50 text-black/50">
                    {city.winRate.toFixed(0)}% WR
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {hasMoreCities && (
            <button
              onClick={() => setShowAllCities(!showAllCities)}
              className="w-full mt-2 py-1.5 text-xs text-white/50 dark:text-white/50 text-black/50 hover:text-white/80 dark:hover:text-white/80 hover:text-black/80 transition-colors"
            >
              {showAllCities ? '↑ Show Less' : `↓ Show ${sortedCities.length - 4} More Cities`}
            </button>
          )}
        </div>
      )}
      
      {/* Last Updated */}
      {data.lastUpdated && (
        <div className="mt-3 pt-3 border-t border-white/5 dark:border-white/5 border-black/5 text-xs text-white/30 dark:text-white/30 text-black/30 text-right">
          Updated: {new Date(data.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  )
}

// Export helper function to parse weather data from trades gist
export function parseWeatherPerformance(trades: Array<{
  ticker: string
  side: string
  contracts: number
  price_cents: number
  result_status?: string
  edge?: number
  pnl_cents?: number
}>): WeatherPerformance | null {
  // Filter for weather market trades
  const weatherTrades = trades.filter(t => 
    t.ticker?.startsWith('KXHIGH') || t.ticker?.startsWith('KXLOW')
  )
  
  if (weatherTrades.length === 0) {
    return null
  }
  
  // Parse city from ticker
  const getCityFromTicker = (ticker: string): string => {
    const match = ticker.match(/KX(?:HIGH|LOW)([A-Z]+)-/)
    return match ? match[1] : 'UNK'
  }
  
  // Aggregate stats
  const cityStats: Record<string, CityStats> = {}
  let totalWins = 0
  let totalLosses = 0
  let totalPending = 0
  let totalPnl = 0
  let totalEdge = 0
  
  for (const trade of weatherTrades) {
    const city = getCityFromTicker(trade.ticker)
    
    if (!cityStats[city]) {
      cityStats[city] = {
        city,
        cityName: getCityName(city),
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        pnlCents: 0,
        avgEdge: 0,
        forecastAccuracy: 85 // Default NWS accuracy
      }
    }
    
    cityStats[city].trades++
    
    if (trade.result_status === 'won') {
      cityStats[city].wins++
      totalWins++
    } else if (trade.result_status === 'lost') {
      cityStats[city].losses++
      totalLosses++
    } else {
      totalPending++
    }
    
    if (trade.pnl_cents) {
      cityStats[city].pnlCents += trade.pnl_cents
      totalPnl += trade.pnl_cents
    }
    
    if (trade.edge) {
      totalEdge += trade.edge
    }
  }
  
  // Calculate win rates
  for (const city of Object.values(cityStats)) {
    const settled = city.wins + city.losses
    city.winRate = settled > 0 ? (city.wins / settled) * 100 : 0
  }
  
  const totalSettled = totalWins + totalLosses
  const winRate = totalSettled > 0 ? (totalWins / totalSettled) * 100 : 0
  const avgEdge = weatherTrades.length > 0 ? totalEdge / weatherTrades.length : 0
  
  return {
    totalTrades: weatherTrades.length,
    wins: totalWins,
    losses: totalLosses,
    pending: totalPending,
    winRate,
    pnlCents: totalPnl,
    avgEdge,
    cities: Object.values(cityStats),
    forecastAccuracy: 85, // NWS is typically ~85% accurate within 2°F
    cryptoComparison: {
      weatherWinRate: winRate,
      cryptoWinRate: 0, // Will be filled from overall stats
      weatherEdge: avgEdge,
      cryptoEdge: 0
    },
    lastUpdated: new Date().toISOString()
  }
}

function getCityName(code: string): string {
  const names: Record<string, string> = {
    NYC: 'New York City',
    NY: 'New York City',
    CHI: 'Chicago',
    MIA: 'Miami',
    DEN: 'Denver',
    LAX: 'Los Angeles',
    HOU: 'Houston',
    AUS: 'Austin',
    PHI: 'Philadelphia',
    SFO: 'San Francisco',
  }
  return names[code] || code
}
