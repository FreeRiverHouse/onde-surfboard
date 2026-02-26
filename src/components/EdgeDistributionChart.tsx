'use client';

import { useMemo } from 'react';
import { Target } from 'lucide-react';

// ============== TYPES ==============
interface EdgeBucket {
  bucket: string;
  range: [number, number];
  trades: number;
  won: number;
  lost: number;
  winRate: number;
  avgEdge: number;
}

export interface EdgeDistributionData {
  buckets: EdgeBucket[];
  totalSettled: number;
  tradesWithEdge: number;
  correlation: 'positive' | 'negative' | 'neutral' | 'insufficient_data';
}

interface EdgeDistributionChartProps {
  data: EdgeDistributionData | null;
  className?: string;
}

// ============== COMPONENT ==============
export function EdgeDistributionChart({ data, className = '' }: EdgeDistributionChartProps) {
  // Calculate chart values
  const chartData = useMemo(() => {
    if (!data?.buckets?.length) return null;
    
    const maxTrades = Math.max(...data.buckets.map(b => b.trades));
    const hasData = data.buckets.some(b => b.trades > 0);
    
    return {
      buckets: data.buckets.map(b => ({
        ...b,
        barHeight: maxTrades > 0 ? (b.trades / maxTrades) * 100 : 0,
        // Color based on win rate
        color: b.trades === 0 
          ? 'bg-gray-600' 
          : b.winRate >= 60 
            ? 'bg-emerald-500' 
            : b.winRate >= 50 
              ? 'bg-green-500' 
              : b.winRate >= 40 
                ? 'bg-yellow-500' 
                : b.winRate >= 30 
                  ? 'bg-orange-500' 
                  : 'bg-red-500'
      })),
      hasData,
      maxTrades,
      correlation: data.correlation
    };
  }, [data]);

  // Correlation badge
  const correlationBadge = useMemo(() => {
    if (!chartData) return null;
    
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      positive: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '📈 Calibrated' },
      negative: { bg: 'bg-red-500/20', text: 'text-red-400', label: '⚠️ Needs Tuning' },
      neutral: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '➖ Neutral' },
      insufficient_data: { bg: 'bg-gray-500/20', text: 'text-gray-500', label: '⏳ Awaiting Data' }
    };
    
    const style = styles[chartData.correlation] || styles.insufficient_data;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  }, [chartData]);

  if (!chartData) {
    return (
      <div className={`bg-white/[0.02] border border-white/10 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center">
            <Target className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Edge Distribution</h3>
            <p className="text-xs text-gray-500">Win rate by edge bucket</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
          No edge data available
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/[0.02] border border-white/10 rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center">
            <Target className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Edge Distribution</h3>
            <p className="text-xs text-gray-500">
              {data?.totalSettled || 0} settled trades
            </p>
          </div>
        </div>
        {correlationBadge}
      </div>

      {/* Chart */}
      {chartData.hasData ? (
        <div className="space-y-4">
          {/* Bar chart */}
          <div className="flex items-end gap-2 h-32">
            {chartData.buckets.map((bucket) => (
              <div key={bucket.bucket} className="flex-1 flex flex-col items-center">
                {/* Bar with tooltip */}
                <div 
                  className="relative group w-full flex flex-col items-center"
                  title={`${bucket.trades} trades\n${bucket.won}W / ${bucket.lost}L\n${bucket.winRate}% win rate`}
                >
                  {/* Win rate label on hover */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <span className={`text-xs font-bold ${
                      bucket.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {bucket.trades > 0 ? `${bucket.winRate}%` : '-'}
                    </span>
                  </div>
                  
                  {/* Bar */}
                  <div 
                    className={`w-full rounded-t transition-all duration-300 group-hover:opacity-80 ${bucket.color}`}
                    style={{ height: `${Math.max(bucket.barHeight, 4)}%` }}
                  />
                  
                  {/* Trade count */}
                  <span className="text-[10px] text-gray-500 mt-1">
                    {bucket.trades}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* X-axis labels */}
          <div className="flex gap-2">
            {chartData.buckets.map((bucket) => (
              <div key={bucket.bucket} className="flex-1 text-center">
                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                  {bucket.bucket}
                </span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-gray-400">≥50% WR</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-[10px] text-gray-400">40-50%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-gray-400">&lt;40%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-32 text-gray-500">
          <p className="text-sm">No settled trades with edge data</p>
          <p className="text-xs mt-1">Chart will populate as trades settle</p>
        </div>
      )}

      {/* Correlation insight */}
      {chartData.hasData && chartData.correlation !== 'insufficient_data' && (
        <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <p className="text-xs text-gray-400">
            {chartData.correlation === 'positive' && (
              <>📈 <span className="text-emerald-400">Model calibrated:</span> Higher edge trades show better win rates.</>
            )}
            {chartData.correlation === 'negative' && (
              <>⚠️ <span className="text-red-400">Calibration needed:</span> Lower edge trades outperforming - edge calculation may be inverted.</>
            )}
            {chartData.correlation === 'neutral' && (
              <>➖ <span className="text-gray-400">No clear pattern:</span> Win rates consistent across edge buckets.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// ============== MOCK DATA ==============
export function generateMockEdgeDistribution(): EdgeDistributionData {
  return {
    buckets: [
      { bucket: '0-5%', range: [0, 0.05], trades: 3, won: 1, lost: 2, winRate: 33.3, avgEdge: 3.2 },
      { bucket: '5-10%', range: [0.05, 0.10], trades: 8, won: 3, lost: 5, winRate: 37.5, avgEdge: 7.8 },
      { bucket: '10-15%', range: [0.10, 0.15], trades: 12, won: 5, lost: 7, winRate: 41.7, avgEdge: 12.4 },
      { bucket: '15-20%', range: [0.15, 0.20], trades: 10, won: 5, lost: 5, winRate: 50.0, avgEdge: 17.2 },
      { bucket: '20-30%', range: [0.20, 0.30], trades: 6, won: 4, lost: 2, winRate: 66.7, avgEdge: 24.1 },
      { bucket: '30%+', range: [0.30, 1.00], trades: 2, won: 2, lost: 0, winRate: 100.0, avgEdge: 35.5 },
    ],
    totalSettled: 41,
    tradesWithEdge: 45,
    correlation: 'positive'
  };
}
