'use client';

import { useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface RecentTrade {
  timestamp: string;
  ticker: string;
  side: string;
  contracts: number;
  price_cents: number;
  result_status?: string;
}

interface DailyVolumeWidgetProps {
  recentTrades: RecentTrade[];
  className?: string;
}

/**
 * Calculate 7-day volume history for sparkline
 */
function calculate7DayHistory(trades: RecentTrade[]): number[] {
  const now = new Date();
  const history: number[] = [];
  
  // Get last 7 days (today + 6 previous)
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    let dayVolume = 0;
    for (const trade of trades) {
      const tradeDate = new Date(trade.timestamp);
      if (tradeDate >= dayStart && tradeDate < dayEnd) {
        dayVolume += (trade.contracts * trade.price_cents) / 100;
      }
    }
    history.push(dayVolume);
  }
  
  return history;
}

/**
 * Simple sparkline component using SVG
 */
function Sparkline({ data, className = '' }: { data: number[]; className?: string }) {
  if (!data.length || data.every(d => d === 0)) {
    return null;
  }
  
  const max = Math.max(...data, 0.01); // Avoid division by zero
  const width = 60;
  const height = 20;
  const padding = 2;
  
  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - (value / max) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className={className}>
      <polyline
        points={points}
        fill="none"
        stroke="rgb(168, 85, 247)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot on last point */}
      {data.length > 0 && (
        <circle
          cx={width - padding}
          cy={height - padding - (data[data.length - 1] / max) * (height - padding * 2)}
          r="2"
          fill="rgb(168, 85, 247)"
        />
      )}
    </svg>
  );
}

/**
 * Calculate daily trading volume from recent trades
 * Volume = sum of (contracts * price_cents / 100) for each trade
 */
export function calculateDailyVolume(trades: RecentTrade[]): {
  todayVolume: number;
  yesterdayVolume: number;
  todayTradeCount: number;
  yesterdayTradeCount: number;
  avgTradeSize: number;
  largestTrade: number;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let todayVolume = 0;
  let yesterdayVolume = 0;
  let todayTradeCount = 0;
  let yesterdayTradeCount = 0;
  let largestTrade = 0;

  for (const trade of trades) {
    const tradeDate = new Date(trade.timestamp);
    const tradeValue = (trade.contracts * trade.price_cents) / 100;
    
    if (tradeValue > largestTrade) {
      largestTrade = tradeValue;
    }

    // Check if trade is from today
    if (tradeDate >= today) {
      todayVolume += tradeValue;
      todayTradeCount++;
    } 
    // Check if trade is from yesterday
    else if (tradeDate >= yesterday && tradeDate < today) {
      yesterdayVolume += tradeValue;
      yesterdayTradeCount++;
    }
  }

  const avgTradeSize = todayTradeCount > 0 ? todayVolume / todayTradeCount : 0;

  return {
    todayVolume,
    yesterdayVolume,
    todayTradeCount,
    yesterdayTradeCount,
    avgTradeSize,
    largestTrade,
  };
}

/**
 * Format volume with appropriate suffix (K for thousands)
 */
function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}K`;
  }
  return `$${volume.toFixed(2)}`;
}

export function DailyVolumeWidget({ recentTrades, className = '' }: DailyVolumeWidgetProps) {
  const volumeData = useMemo(() => calculateDailyVolume(recentTrades), [recentTrades]);
  const weekHistory = useMemo(() => calculate7DayHistory(recentTrades), [recentTrades]);
  const weekTotal = useMemo(() => weekHistory.reduce((a, b) => a + b, 0), [weekHistory]);
  
  const {
    todayVolume,
    yesterdayVolume,
    todayTradeCount,
    avgTradeSize,
    largestTrade,
  } = volumeData;

  // Calculate volume change percentage
  const volumeChange = yesterdayVolume > 0 
    ? ((todayVolume - yesterdayVolume) / yesterdayVolume) * 100 
    : todayVolume > 0 ? 100 : 0;

  const isPositiveChange = volumeChange >= 0;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.08] p-3 sm:p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 flex-shrink-0" />
          <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Daily Volume</span>
          
          {/* Change indicator */}
          {yesterdayVolume > 0 && (
            <div className={`flex items-center gap-0.5 text-[9px] sm:text-[10px] font-medium ${
              isPositiveChange ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {isPositiveChange ? (
                <TrendingUp className="w-2.5 h-2.5" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5" />
              )}
              <span>{Math.abs(volumeChange).toFixed(0)}%</span>
            </div>
          )}
        </div>
        
        {/* 7-day sparkline */}
        <Sparkline data={weekHistory} className="opacity-60 hover:opacity-100 transition-opacity" />
      </div>

      {/* Main value */}
      <div className="text-lg sm:text-xl md:text-2xl font-mono font-bold text-purple-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]">
        {formatVolume(todayVolume)}
      </div>

      {/* Subtitle with details */}
      <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
        <p className="text-[10px] sm:text-xs text-gray-600">
          {todayTradeCount} trade{todayTradeCount !== 1 ? 's' : ''} today
        </p>
        {avgTradeSize > 0 && (
          <>
            <span className="text-gray-700">•</span>
            <p className="text-[10px] sm:text-xs text-gray-600">
              avg ${avgTradeSize.toFixed(2)}
            </p>
          </>
        )}
      </div>

      {/* Largest trade indicator */}
      {largestTrade > 0 && largestTrade > avgTradeSize * 1.5 && (
        <div className="mt-2 pt-2 border-t border-white/[0.05]">
          <p className="text-[9px] sm:text-[10px] text-gray-500">
            Largest: ${largestTrade.toFixed(2)}
          </p>
        </div>
      )}

      {/* Yesterday comparison */}
      {yesterdayVolume > 0 && (
        <div className="mt-1">
          <p className="text-[9px] sm:text-[10px] text-gray-500">
            vs yesterday: {formatVolume(yesterdayVolume)}
          </p>
        </div>
      )}

      {/* Week total */}
      {weekTotal > 0 && (
        <div className="mt-2 pt-2 border-t border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-gray-500" />
            <p className="text-[9px] sm:text-[10px] text-gray-500">7-day total</p>
          </div>
          <p className="text-[10px] sm:text-xs text-purple-300 font-medium">
            {formatVolume(weekTotal)}
          </p>
        </div>
      )}
    </div>
  );
}

export default DailyVolumeWidget;
