'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DataPoint {
  date: string;
  winRate: number;
  trades?: number;
}

interface WinRateSparklineProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  className?: string;
  showTrendIcon?: boolean;
}

/**
 * A compact sparkline chart for win rate trends
 * Similar to stock sparklines - minimal, inline, color-coded by trend direction
 */
export function WinRateSparkline({
  data,
  width = 60,
  height = 24,
  className = '',
  showTrendIcon = true
}: WinRateSparklineProps) {
  const chartData = useMemo(() => {
    if (!data || data.length < 2) return null;

    const padding = 2;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    // Normalize values
    const values = data.map(d => d.winRate);
    const minRate = Math.min(...values);
    const maxRate = Math.max(...values);
    const range = maxRate - minRate || 1;

    // Generate path points
    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - ((d.winRate - minRate) / range) * chartHeight;
      return { x, y, value: d.winRate };
    });

    // Create SVG path (smooth curve)
    const pathD = points.reduce((acc, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      
      // Simple line for sparkline (could add bezier for smoother curve)
      return `${acc} L ${point.x} ${point.y}`;
    }, '');

    // Determine trend direction
    const firstHalf = values.slice(0, Math.ceil(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const trendDiff = secondAvg - firstAvg;
    const trend: 'up' | 'down' | 'flat' = 
      trendDiff > 1 ? 'up' : 
      trendDiff < -1 ? 'down' : 
      'flat';

    // Calculate trend percentage
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const trendPct = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    return { 
      points, 
      pathD, 
      trend, 
      trendPct,
      lastValue,
      firstValue
    };
  }, [data, width, height]);

  if (!chartData || data.length < 2) {
    return (
      <div className={`flex items-center justify-center text-gray-500 ${className}`} style={{ width, height }}>
        <Minus className="w-3 h-3 opacity-50" />
      </div>
    );
  }

  const { pathD, trend } = chartData;

  // Theme-aware colors
  const getTrendColor = () => {
    if (trend === 'up') return '#10b981'; // emerald-500
    if (trend === 'down') return '#ef4444'; // red-500
    return '#6b7280'; // gray-500
  };
  
  const trendColor = getTrendColor();

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="flex-shrink-0"
        style={{ width, height }}
      >
        {/* Gradient background for area under curve */}
        <defs>
          <linearGradient id={`sparkline-gradient-${trend}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={trendColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <path
          d={`${pathD} L ${width - 2} ${height - 2} L 2 ${height - 2} Z`}
          fill={`url(#sparkline-gradient-${trend})`}
        />
        
        {/* Main line */}
        <path
          d={pathD}
          fill="none"
          stroke={trendColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* End point dot */}
        <circle
          cx={chartData.points[chartData.points.length - 1].x}
          cy={chartData.points[chartData.points.length - 1].y}
          r="2"
          fill={trendColor}
        />
      </svg>
      
      {showTrendIcon && (
        <TrendIcon 
          className="w-3 h-3 flex-shrink-0" 
          style={{ color: trendColor }}
        />
      )}
    </div>
  );
}

/**
 * Parse win rate trend data from trading stats
 * Returns last 7 days of daily win rates
 */
export function parseWinRateTrendFromStats(
  winRateTrend?: { data: Array<{ date: string; winRate: number; trades: number }> }
): DataPoint[] {
  if (!winRateTrend?.data || winRateTrend.data.length === 0) {
    return [];
  }
  
  // Take last 7 days
  return winRateTrend.data.slice(-7);
}

/**
 * Generate mock 7-day win rate trend for testing
 */
export function generateMockSparklineData(days: number = 7): DataPoint[] {
  const data: DataPoint[] = [];
  let winRate = 45 + Math.random() * 20; // Start between 45-65%

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Random walk
    winRate += (Math.random() - 0.5) * 8;
    winRate = Math.max(20, Math.min(80, winRate));

    data.push({
      date: date.toISOString().slice(0, 10),
      winRate: Math.round(winRate * 10) / 10,
      trades: Math.floor(Math.random() * 5) + 1
    });
  }

  return data;
}
