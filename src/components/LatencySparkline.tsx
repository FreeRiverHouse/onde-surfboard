'use client';

import { useMemo } from 'react';
import { Sparkline } from './Sparkline';
import { useTheme } from './ThemeProvider';

export interface LatencyHistoryPoint {
  timestamp: string;
  avgMs: number;
  p95Ms: number;
  count: number;
}

export interface LatencyHistoryData {
  generated_at: string;
  dataPoints: LatencyHistoryPoint[];
  summary: {
    avgLatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
    avgP95Ms: number;
    maxP95Ms: number;
    dataPointCount: number;
  };
}

interface LatencySparklineProps {
  data: LatencyHistoryData | null;
  width?: number;
  height?: number;
  showLabel?: boolean;
  className?: string;
}

/**
 * Mini sparkline showing latency trend over 24h (T800).
 * Color-coded: green=normal (<300ms), yellow=elevated (300-500ms), red=high (>500ms)
 */
export function LatencySparkline({
  data,
  width = 80,
  height = 24,
  showLabel = true,
  className = ''
}: LatencySparklineProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const { sparklineData, color, status, currentAvg } = useMemo(() => {
    if (!data?.dataPoints?.length) {
      return {
        sparklineData: [],
        color: isDark ? '#71717a' : '#a1a1aa',
        status: 'unknown' as const,
        currentAvg: null
      };
    }

    // Extract avgMs values for sparkline
    const values = data.dataPoints.map(d => d.avgMs);
    const current = values[values.length - 1];
    
    // Determine color based on current latency
    let sparkColor: string;
    let sparkStatus: 'normal' | 'elevated' | 'high' | 'unknown';
    
    if (current < 300) {
      sparkColor = isDark ? '#22c55e' : '#16a34a'; // green
      sparkStatus = 'normal';
    } else if (current < 500) {
      sparkColor = isDark ? '#eab308' : '#ca8a04'; // yellow
      sparkStatus = 'elevated';
    } else {
      sparkColor = isDark ? '#ef4444' : '#dc2626'; // red
      sparkStatus = 'high';
    }
    
    return {
      sparklineData: values,
      color: sparkColor,
      status: sparkStatus,
      currentAvg: current
    };
  }, [data, isDark]);

  // Status icon and label
  const statusConfig = {
    normal: { icon: '✓', label: 'Normal' },
    elevated: { icon: '⚡', label: 'Elevated' },
    high: { icon: '⚠', label: 'High' },
    unknown: { icon: '?', label: 'No data' }
  };

  const config = statusConfig[status];

  if (!data?.dataPoints?.length) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className={`w-${width / 4} h-${height / 4} rounded ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
        {showLabel && (
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
            No latency data
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`group relative flex items-center gap-1.5 ${className}`}>
      {/* Sparkline */}
      <Sparkline
        data={sparklineData}
        width={width}
        height={height}
        color={color}
        strokeWidth={1.5}
        showArea={true}
      />
      
      {/* Current value label */}
      {showLabel && currentAvg !== null && (
        <span 
          className="text-xs font-medium tabular-nums"
          style={{ color }}
        >
          {Math.round(currentAvg)}ms
        </span>
      )}
      
      {/* Hover tooltip */}
      <div className={`
        absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg
        opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none
        text-xs whitespace-nowrap z-50 shadow-lg
        ${isDark ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'bg-white text-gray-800 border border-gray-200'}
      `}>
        <div className="flex items-center gap-1.5 mb-1">
          <span>{config.icon}</span>
          <span className="font-medium" style={{ color }}>{config.label}</span>
        </div>
        {data.summary && (
          <>
            <div className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
              Avg: {data.summary.avgLatencyMs}ms • 
              Min: {data.summary.minLatencyMs}ms • 
              Max: {data.summary.maxLatencyMs}ms
            </div>
            <div className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
              P95: {data.summary.avgP95Ms}ms (max {data.summary.maxP95Ms}ms)
            </div>
            <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-gray-400'} mt-0.5`}>
              {data.summary.dataPointCount} data points (24h)
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Generate mock latency history data for testing/demo
 */
export function generateMockLatencyHistory(): LatencyHistoryData {
  const now = new Date();
  const dataPoints: LatencyHistoryPoint[] = [];
  
  // Generate 48 data points (24h at 30min intervals)
  for (let i = 47; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 30 * 60 * 1000);
    // Simulate varying latency with some spikes
    const baseLatency = 200 + Math.random() * 150;
    const spike = i % 12 === 0 ? Math.random() * 200 : 0; // Occasional spikes
    const avgMs = Math.round(baseLatency + spike);
    
    dataPoints.push({
      timestamp: timestamp.toISOString(),
      avgMs,
      p95Ms: Math.round(avgMs * 1.5 + Math.random() * 100),
      count: Math.floor(50 + Math.random() * 100)
    });
  }
  
  const avgValues = dataPoints.map(d => d.avgMs);
  const p95Values = dataPoints.map(d => d.p95Ms);
  
  return {
    generated_at: now.toISOString(),
    dataPoints,
    summary: {
      avgLatencyMs: Math.round(avgValues.reduce((a, b) => a + b, 0) / avgValues.length),
      minLatencyMs: Math.min(...avgValues),
      maxLatencyMs: Math.max(...avgValues),
      avgP95Ms: Math.round(p95Values.reduce((a, b) => a + b, 0) / p95Values.length),
      maxP95Ms: Math.max(...p95Values),
      dataPointCount: dataPoints.length
    }
  };
}
