'use client';

import { useMemo } from 'react';
import { Timer, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

// ============== TYPES ==============
interface EndpointLatency {
  name: string;
  count: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
}

interface CategoryData {
  total_calls: number;
  endpoint_count: number;
  avg_latency_ms: number;
  endpoints: EndpointLatency[];
}

export interface ApiLatencyData {
  generated_at?: string;
  categories: Record<string, CategoryData>;
  slowest?: EndpointLatency[];
  overall?: {
    total_calls: number;
    avg_latency_ms: number;
  };
}

interface ApiLatencyChartProps {
  data: ApiLatencyData | null;
  className?: string;
}

// ============== COMPONENT ==============
export function ApiLatencyChart({ data, className = '' }: ApiLatencyChartProps) {
  // Process categories for display
  const chartData = useMemo(() => {
    if (!data?.categories) return null;
    
    const categories = Object.entries(data.categories)
      .map(([name, cat]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        calls: cat.total_calls,
        avgMs: cat.avg_latency_ms,
        p95Ms: cat.endpoints?.[0]?.p95Ms || cat.avg_latency_ms * 1.5,
        maxMs: Math.max(...(cat.endpoints?.map(e => e.maxMs) || [cat.avg_latency_ms])),
        // Color based on latency
        color: cat.avg_latency_ms < 200 
          ? 'green' 
          : cat.avg_latency_ms < 500 
            ? 'yellow' 
            : 'red'
      }))
      .filter(c => c.calls > 0)
      .sort((a, b) => b.avgMs - a.avgMs);
    
    const maxAvg = Math.max(...categories.map(c => c.avgMs), 1);
    
    return {
      categories: categories.map(c => ({
        ...c,
        barWidth: (c.avgMs / maxAvg) * 100
      })),
      overall: data.overall,
      slowest: data.slowest?.slice(0, 3) || []
    };
  }, [data]);

  // Health status
  const healthStatus = useMemo(() => {
    if (!chartData) return 'unknown';
    const avgAll = chartData.overall?.avg_latency_ms || 
      (chartData.categories.reduce((sum, c) => sum + c.avgMs * c.calls, 0) / 
       chartData.categories.reduce((sum, c) => sum + c.calls, 0));
    
    if (avgAll < 200) return 'healthy';
    if (avgAll < 400) return 'warning';
    return 'critical';
  }, [chartData]);

  const HealthIcon = healthStatus === 'healthy' ? CheckCircle : healthStatus === 'warning' ? AlertTriangle : AlertCircle;
  const healthColor = healthStatus === 'healthy' ? 'text-emerald-400' : healthStatus === 'warning' ? 'text-yellow-400' : 'text-red-400';

  if (!chartData || chartData.categories.length === 0) {
    return (
      <div className={`bg-white/[0.02] border border-white/10 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-indigo-500/30 flex items-center justify-center">
            <Timer className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">API Latency</h3>
            <p className="text-xs text-gray-500">By category</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
          No latency data available
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/[0.02] border border-white/10 rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-indigo-500/30 flex items-center justify-center">
            <Timer className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">API Latency</h3>
            <p className="text-xs text-gray-500">
              {chartData.overall?.total_calls?.toLocaleString() || '0'} total calls
            </p>
          </div>
        </div>
        
        {/* Health indicator */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
          healthStatus === 'healthy' 
            ? 'bg-emerald-500/10 border-emerald-500/20' 
            : healthStatus === 'warning'
              ? 'bg-yellow-500/10 border-yellow-500/20'
              : 'bg-red-500/10 border-red-500/20'
        }`}>
          <HealthIcon className={`w-3.5 h-3.5 ${healthColor}`} />
          <span className={`text-xs font-medium ${healthColor}`}>
            {chartData.overall?.avg_latency_ms?.toFixed(0) || '—'}ms avg
          </span>
        </div>
      </div>

      {/* Category bars */}
      <div className="space-y-3">
        {chartData.categories.map((category) => (
          <div key={category.name} className="group">
            {/* Label row */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-300">{category.name}</span>
              <span className={`text-xs font-mono ${
                category.color === 'green' 
                  ? 'text-emerald-400' 
                  : category.color === 'yellow' 
                    ? 'text-yellow-400' 
                    : 'text-red-400'
              }`}>
                {category.avgMs.toFixed(0)}ms
              </span>
            </div>
            
            {/* Bar */}
            <div className="h-6 bg-white/5 rounded-lg overflow-hidden relative">
              {/* Main bar (avg) */}
              <div 
                className={`h-full rounded-lg transition-all duration-300 ${
                  category.color === 'green' 
                    ? 'bg-gradient-to-r from-emerald-500/60 to-emerald-500/40' 
                    : category.color === 'yellow' 
                      ? 'bg-gradient-to-r from-yellow-500/60 to-yellow-500/40' 
                      : 'bg-gradient-to-r from-red-500/60 to-red-500/40'
                }`}
                style={{ width: `${category.barWidth}%` }}
              />
              
              {/* P95 marker */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white/30"
                style={{ left: `${(category.p95Ms / (chartData.categories[0]?.avgMs || 1) / 100) * category.barWidth}%` }}
                title={`P95: ${category.p95Ms.toFixed(0)}ms`}
              />
              
              {/* Hover info */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded">
                  p95: {category.p95Ms.toFixed(0)}ms • max: {category.maxMs.toFixed(0)}ms • {category.calls} calls
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-4 mt-4 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-gray-400">&lt;200ms</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-[10px] text-gray-400">200-500ms</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[10px] text-gray-400">&gt;500ms</span>
        </div>
      </div>

      {/* Slowest endpoints alert (if any red) */}
      {chartData.categories.some(c => c.color === 'red') && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">
              High latency detected on {chartData.categories.filter(c => c.color === 'red').map(c => c.name).join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== EXPORTS ==============
export default ApiLatencyChart;
