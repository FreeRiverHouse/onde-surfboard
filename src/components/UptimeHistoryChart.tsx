'use client';

import { useMemo } from 'react';

interface UptimeCheck {
  timestamp: string;
  status: number;
  latency_ms: number;
  ok: boolean;
}

interface SiteHistory {
  checks: UptimeCheck[];
}

interface UptimeHistoryData {
  generated_at: string;
  sites: Record<string, SiteHistory>;
}

interface UptimeHistoryChartProps {
  data: UptimeHistoryData | null;
  className?: string;
}

export function UptimeHistoryChart({ data, className = '' }: UptimeHistoryChartProps) {
  const chartData = useMemo(() => {
    if (!data?.sites) return null;

    const sites = Object.entries(data.sites).map(([name, siteData]) => {
      const checks = siteData.checks || [];
      const recentChecks = checks.slice(-48); // Last 48 checks (4 hours at 5min intervals)
      
      const uptime = checks.length > 0
        ? (checks.filter(c => c.ok).length / checks.length * 100).toFixed(1)
        : '0.0';
      
      const avgLatency = checks.length > 0
        ? Math.round(checks.reduce((sum, c) => sum + c.latency_ms, 0) / checks.length)
        : 0;

      return {
        name,
        checks: recentChecks,
        uptime,
        avgLatency,
        totalChecks: checks.length,
      };
    });

    return sites;
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`p-6 rounded-2xl bg-white/5 border border-white/10 ${className}`}>
        <p className="text-gray-500 text-center">No uptime data available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {chartData.map((site) => (
        <div
          key={site.name}
          className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {site.name.includes('surf') ? '🏄' : '🌊'}
              </span>
              <div>
                <h3 className="font-semibold text-white">{site.name}</h3>
                <p className="text-xs text-gray-500">{site.totalChecks} checks recorded</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${
                parseFloat(site.uptime) >= 99.5 ? 'text-emerald-400' :
                parseFloat(site.uptime) >= 99 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {site.uptime}%
              </p>
              <p className="text-xs text-gray-500">uptime</p>
            </div>
          </div>

          {/* Uptime bar chart (last 48 checks) */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Last 4 hours</span>
              <span>Avg latency: {site.avgLatency}ms</span>
            </div>
            <div className="flex gap-[2px] h-8">
              {site.checks.map((check, i) => {
                const isUp = check.ok;
                const latencyNorm = Math.min(check.latency_ms / 500, 1); // Normalize to 500ms max
                const height = Math.max(20, 100 - latencyNorm * 60); // Higher bar = faster
                
                return (
                  <div
                    key={i}
                    className="flex-1 flex items-end group relative"
                    title={`${new Date(check.timestamp).toLocaleTimeString()}: ${check.latency_ms}ms`}
                  >
                    <div
                      className={`w-full rounded-sm transition-all ${
                        isUp 
                          ? 'bg-emerald-500/60 group-hover:bg-emerald-400' 
                          : 'bg-red-500/60 group-hover:bg-red-400'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                        {new Date(check.timestamp).toLocaleTimeString()}<br/>
                        {check.latency_ms}ms - {isUp ? '✓' : '✕'}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Fill empty slots if less than 48 checks */}
              {Array.from({ length: Math.max(0, 48 - site.checks.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex-1">
                  <div className="w-full h-2 bg-gray-800 rounded-sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-2 rounded-lg bg-white/5">
              <p className="text-lg font-bold text-emerald-400">
                {site.checks.filter(c => c.ok).length}
              </p>
              <p className="text-xs text-gray-500">Up</p>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <p className="text-lg font-bold text-red-400">
                {site.checks.filter(c => !c.ok).length}
              </p>
              <p className="text-xs text-gray-500">Down</p>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <p className="text-lg font-bold text-blue-400">
                {site.avgLatency}ms
              </p>
              <p className="text-xs text-gray-500">Avg</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default UptimeHistoryChart;
