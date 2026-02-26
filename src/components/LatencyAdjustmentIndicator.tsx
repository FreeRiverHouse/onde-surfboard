'use client';

import { useMemo } from 'react';
import { useTheme } from './ThemeProvider';

interface LatencyAdjustmentIndicatorProps {
  /** Current average latency in ms (from sparkline or stats) */
  avgLatencyMs: number | null | undefined;
  /** Show as compact badge or full text */
  compact?: boolean;
  className?: string;
}

/**
 * Indicator showing when latency-based position sizing is active (T803).
 * Displays when the autotrader reduces Kelly fraction due to high API latency:
 * - Normal (<500ms): No reduction, green badge
 * - 25% reduction (500-1000ms): Yellow badge
 * - 50% reduction (1000-2000ms): Red badge  
 * - Trading paused (>2000ms): Red badge with warning
 */
export function LatencyAdjustmentIndicator({
  avgLatencyMs,
  compact = false,
  className = ''
}: LatencyAdjustmentIndicatorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const { multiplier, status, badge, color, bgColor, borderColor, description, threshold } = useMemo(() => {
    if (avgLatencyMs === null || avgLatencyMs === undefined) {
      return {
        multiplier: 1.0,
        status: 'unknown' as const,
        badge: '?',
        color: isDark ? '#71717a' : '#a1a1aa',
        bgColor: 'transparent',
        borderColor: isDark ? 'rgba(113,113,122,0.3)' : 'rgba(161,161,170,0.3)',
        description: 'Latency data unavailable',
        threshold: null
      };
    }

    if (avgLatencyMs < 500) {
      return {
        multiplier: 1.0,
        status: 'normal' as const,
        badge: '✓',
        color: isDark ? '#22c55e' : '#16a34a',
        bgColor: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(22,163,74,0.1)',
        borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgba(22,163,74,0.3)',
        description: 'Normal position sizing',
        threshold: '<500ms'
      };
    } else if (avgLatencyMs < 1000) {
      return {
        multiplier: 0.75,
        status: 'reduced' as const,
        badge: '⚡',
        color: isDark ? '#eab308' : '#ca8a04',
        bgColor: isDark ? 'rgba(234,179,8,0.1)' : 'rgba(202,138,4,0.1)',
        borderColor: isDark ? 'rgba(234,179,8,0.3)' : 'rgba(202,138,4,0.3)',
        description: '25% position size reduction',
        threshold: '500-1000ms'
      };
    } else if (avgLatencyMs < 2000) {
      return {
        multiplier: 0.50,
        status: 'high' as const,
        badge: '⚠',
        color: isDark ? '#f97316' : '#ea580c',
        bgColor: isDark ? 'rgba(249,115,22,0.1)' : 'rgba(234,88,12,0.1)',
        borderColor: isDark ? 'rgba(249,115,22,0.3)' : 'rgba(234,88,12,0.3)',
        description: '50% position size reduction',
        threshold: '1000-2000ms'
      };
    } else {
      return {
        multiplier: 0,
        status: 'paused' as const,
        badge: '⛔',
        color: isDark ? '#ef4444' : '#dc2626',
        bgColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(220,38,38,0.1)',
        borderColor: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(220,38,38,0.3)',
        description: 'Trading paused due to latency',
        threshold: '>2000ms'
      };
    }
  }, [avgLatencyMs, isDark]);

  // Don't show anything if latency is normal (no adjustment active)
  if (status === 'normal') {
    return null;
  }

  // Don't show if unknown
  if (status === 'unknown') {
    return null;
  }

  return (
    <div 
      className={`group relative inline-flex items-center gap-1 ${className}`}
    >
      {/* Badge */}
      <span
        className={`
          inline-flex items-center justify-center rounded-md text-xs font-medium
          px-1.5 py-0.5 transition-all duration-200
        `}
        style={{
          color,
          backgroundColor: bgColor,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor
        }}
      >
        <span className="mr-0.5">{badge}</span>
        {!compact && (
          <span className="tabular-nums">
            {multiplier === 0 ? 'Paused' : `${Math.round((1 - multiplier) * 100)}%`}
          </span>
        )}
      </span>

      {/* Hover tooltip */}
      <div className={`
        absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-2 rounded-lg
        opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none
        text-xs whitespace-nowrap z-50 shadow-lg min-w-[180px]
        ${isDark ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'bg-white text-gray-800 border border-gray-200'}
      `}>
        <div className="font-medium mb-1" style={{ color }}>
          Latency Adjustment Active
        </div>
        <div className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-gray-500'} space-y-0.5`}>
          <div>📊 Current latency: <span className="font-mono">{Math.round(avgLatencyMs!)}ms</span></div>
          <div>📉 {description}</div>
          {multiplier > 0 && (
            <div>💰 Kelly fraction: <span className="font-mono">{(multiplier * 100).toFixed(0)}%</span></div>
          )}
          <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-gray-400'} mt-1`}>
            Threshold: {threshold}
          </div>
        </div>
      </div>
    </div>
  );
}
