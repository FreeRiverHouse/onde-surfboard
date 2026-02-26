'use client';

import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

/**
 * ModelComparisonChart Component (T350)
 * 
 * Side-by-side comparison of v1 (old model) vs v2 (Black-Scholes) performance.
 * Shows win rate, PnL, and trade counts for each model version.
 */

interface ModelStats {
  trades: number;
  winRate: number;
  pnlCents: number;
  pnlDollars: number;
}

interface ModelComparisonProps {
  v1Stats: ModelStats | null;
  v2Stats: ModelStats | null;
  className?: string;
}

export function ModelComparisonChart({ v1Stats, v2Stats, className = '' }: ModelComparisonProps) {
  const v1 = v1Stats || { trades: 0, winRate: 0, pnlCents: 0, pnlDollars: 0 };
  const v2 = v2Stats || { trades: 0, winRate: 0, pnlCents: 0, pnlDollars: 0 };
  
  const totalTrades = v1.trades + v2.trades;
  const hasV1Data = v1.trades > 0;
  const hasV2Data = v2.trades > 0;
  
  // Calculate improvement metrics
  const winRateDiff = hasV2Data && hasV1Data ? v2.winRate - v1.winRate : null;
  const pnlDiff = hasV2Data && hasV1Data ? v2.pnlDollars - v1.pnlDollars : null;
  
  // Progress bar max for visual comparison
  const maxWinRate = Math.max(v1.winRate, v2.winRate, 50);
  
  return (
    <div className={`bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-gray-300">Model Comparison</span>
        </div>
        <span className="text-[10px] text-gray-600">
          {totalTrades} total trades
        </span>
      </div>
      
      {/* Comparison Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* V1 Model (Old) */}
        <div className={`p-3 rounded-lg border ${
          hasV1Data 
            ? v1.winRate >= 50 
              ? 'bg-emerald-500/5 border-emerald-500/20' 
              : 'bg-red-500/5 border-red-500/20'
            : 'bg-gray-500/5 border-gray-500/20'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">v1 (Legacy)</span>
            {hasV1Data && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                v1.winRate >= 50 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {v1.winRate >= 50 ? 'profitable' : 'losing'}
              </span>
            )}
          </div>
          
          {hasV1Data ? (
            <>
              {/* Win Rate */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                  <span>Win Rate</span>
                  <span className={v1.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>
                    {v1.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      v1.winRate >= 50 ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(v1.winRate / maxWinRate) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* PnL */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">PnL</span>
                <span className={`text-sm font-medium ${
                  v1.pnlDollars >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {v1.pnlDollars >= 0 ? '+' : ''}{v1.pnlDollars.toFixed(2)}$
                </span>
              </div>
              
              {/* Trades */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-500">Trades</span>
                <span className="text-xs text-gray-400">{v1.trades}</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-gray-500">
              <Clock className="w-6 h-6 mb-1 opacity-50" />
              <span className="text-xs">No v1 data</span>
            </div>
          )}
        </div>
        
        {/* V2 Model (Black-Scholes) */}
        <div className={`p-3 rounded-lg border ${
          hasV2Data 
            ? v2.winRate >= 50 
              ? 'bg-emerald-500/5 border-emerald-500/20' 
              : 'bg-red-500/5 border-red-500/20'
            : 'bg-cyan-500/5 border-cyan-500/20'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">v2 (B-S)</span>
            {hasV2Data ? (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                v2.winRate >= 50 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {v2.winRate >= 50 ? 'profitable' : 'losing'}
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                active
              </span>
            )}
          </div>
          
          {hasV2Data ? (
            <>
              {/* Win Rate */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                  <span>Win Rate</span>
                  <span className={v2.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>
                    {v2.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      v2.winRate >= 50 ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(v2.winRate / maxWinRate) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* PnL */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">PnL</span>
                <span className={`text-sm font-medium ${
                  v2.pnlDollars >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {v2.pnlDollars >= 0 ? '+' : ''}{v2.pnlDollars.toFixed(2)}$
                </span>
              </div>
              
              {/* Trades */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-500">Trades</span>
                <span className="text-xs text-gray-400">{v2.trades}</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-cyan-400/70">
              <TrendingUp className="w-6 h-6 mb-1 animate-pulse" />
              <span className="text-xs">Awaiting trades</span>
              <span className="text-[10px] text-gray-600 mt-0.5">
                Model active, no fills yet
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Improvement Summary */}
      {hasV1Data && hasV2Data && (
        <div className="mt-4 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">v2 vs v1</span>
            <div className="flex items-center gap-3">
              {/* Win Rate Change */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500">WR:</span>
                <span className={`text-xs font-medium ${
                  (winRateDiff ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {(winRateDiff ?? 0) >= 0 ? '+' : ''}{winRateDiff?.toFixed(1)}%
                </span>
                {(winRateDiff ?? 0) > 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : (winRateDiff ?? 0) < 0 ? (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                ) : null}
              </div>
              
              {/* PnL Change */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500">PnL:</span>
                <span className={`text-xs font-medium ${
                  (pnlDiff ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {(pnlDiff ?? 0) >= 0 ? '+' : ''}{pnlDiff?.toFixed(2)}$
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Status message when no comparison possible */}
      {!hasV1Data && !hasV2Data && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-yellow-400">
              No trading data available yet
            </span>
          </div>
        </div>
      )}
      
      {hasV1Data && !hasV2Data && (
        <div className="mt-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs text-cyan-400">
              v2 model active — comparison available after first v2 trades
            </span>
          </div>
        </div>
      )}
      
      {/* Model descriptions */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-gray-600">
        <div className="flex items-start gap-1.5">
          <XCircle className="w-3 h-3 text-red-500/50 mt-0.5" />
          <span><strong className="text-gray-500">v1:</strong> Simple probability model, bearish bias, insufficient edge threshold</span>
        </div>
        <div className="flex items-start gap-1.5">
          <CheckCircle className="w-3 h-3 text-emerald-500/50 mt-0.5" />
          <span><strong className="text-gray-500">v2:</strong> Black-Scholes derived, momentum-aware, dynamic regime detection</span>
        </div>
      </div>
    </div>
  );
}
