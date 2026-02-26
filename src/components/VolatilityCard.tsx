"use client"

import { useState } from 'react'

interface AssetVolatility {
  modelAssumption: number
  periods: {
    [key: string]: {
      realized: number
      deviation: number
      priceRangePct: number
    }
  }
}

interface VolatilityData {
  generated_at: string
  assets: {
    BTC?: AssetVolatility
    ETH?: AssetVolatility
  }
}

interface VolatilityCardProps {
  volatility?: VolatilityData | null
  loading?: boolean
}

export function VolatilityCard({ volatility, loading }: VolatilityCardProps) {
  const [period, setPeriod] = useState<'7d' | '14d' | '30d'>('7d')
  
  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-white/10 rounded"></div>
            <div className="h-8 bg-white/10 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
  
  if (!volatility?.assets) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
        <h3 className="text-sm font-medium text-white/60 mb-3">Volatility Analysis</h3>
        <p className="text-white/40 text-sm">No volatility data available</p>
      </div>
    )
  }
  
  const assets = ['BTC', 'ETH'] as const
  
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white/60 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Volatility (Realized vs Model)
        </h3>
        <div className="flex gap-1">
          {(['7d', '14d', '30d'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                period === p 
                  ? 'bg-white/20 text-white' 
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      
      <div className="space-y-3">
        {assets.map(asset => {
          const data = volatility.assets[asset]
          if (!data) return null
          
          const periodData = data.periods[period]
          if (!periodData) {
            return (
              <div key={asset} className="flex items-center justify-between text-sm">
                <span className="text-white/80 font-medium">{asset}</span>
                <span className="text-white/40">No data for {period}</span>
              </div>
            )
          }
          
          const { realized, deviation } = periodData
          const model = data.modelAssumption
          const maxVol = Math.max(realized, model, 1)
          const realizedWidth = (realized / maxVol) * 100
          const modelWidth = (model / maxVol) * 100
          
          // Color based on deviation
          const deviationColor = deviation > 0 
            ? 'text-red-400' // Model underestimates (risky)
            : deviation < -20 
              ? 'text-green-400' // Model overestimates significantly (conservative)
              : 'text-amber-400' // Model slightly overestimates
          
          return (
            <div key={asset} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80 font-medium">{asset}</span>
                <span className={`text-xs ${deviationColor}`}>
                  {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                </span>
              </div>
              
              {/* Comparison bars */}
              <div className="space-y-1">
                {/* Realized bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 w-12">Real</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500/70 rounded-full transition-all duration-500"
                      style={{ width: `${realizedWidth}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/60 w-10 text-right">{realized.toFixed(2)}%</span>
                </div>
                
                {/* Model bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 w-12">Model</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500/50 rounded-full transition-all duration-500"
                      style={{ width: `${modelWidth}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/60 w-10 text-right">{model.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-white/5 flex justify-between text-[10px] text-white/40">
        <span>📊 Hourly volatility (%)</span>
        <span>
          {volatility.generated_at && new Date(volatility.generated_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}
