'use client';

import { useMemo } from 'react';

interface Trade {
  result_status: 'won' | 'lost' | 'pending';
  price_cents: number;
  contracts: number;
  side?: 'yes' | 'no';
}

interface ReturnDistributionChartProps {
  trades: Trade[];
  width?: number;
  height?: number;
  showLabels?: boolean;
}

interface Bucket {
  label: string;
  min: number;
  max: number;
  count: number;
  isPositive: boolean;
}

// Calculate PnL for a single trade
function calculateTradePnl(trade: Trade): number | null {
  if (trade.result_status === 'pending') return null;
  
  const priceCents = trade.price_cents || 0;
  const contracts = trade.contracts || 1;
  
  if (trade.result_status === 'won') {
    // Won: receive (100 - price) per contract for NO, (100 - price) for YES
    return (100 - priceCents) * contracts;
  } else {
    // Lost: lose price per contract
    return -priceCents * contracts;
  }
}

// Create histogram buckets
function createBuckets(pnls: number[]): Bucket[] {
  if (pnls.length === 0) return [];
  
  // Fixed buckets: -$10+, -$5 to -$10, -$2 to -$5, -$1 to -$2, -$0.50 to -$1, 
  // $0 to -$0.50, $0 to $0.50, $0.50 to $1, $1 to $2, $2 to $5, $5 to $10, $10+
  const bucketDefs = [
    { label: '<-$10', min: -Infinity, max: -1000 },
    { label: '-$10 to -$5', min: -1000, max: -500 },
    { label: '-$5 to -$2', min: -500, max: -200 },
    { label: '-$2 to -$1', min: -200, max: -100 },
    { label: '-$1 to -$0.50', min: -100, max: -50 },
    { label: '-$0.50 to $0', min: -50, max: 0 },
    { label: '$0 to $0.50', min: 0, max: 50 },
    { label: '$0.50 to $1', min: 50, max: 100 },
    { label: '$1 to $2', min: 100, max: 200 },
    { label: '$2 to $5', min: 200, max: 500 },
    { label: '$5 to $10', min: 500, max: 1000 },
    { label: '>$10', min: 1000, max: Infinity },
  ];
  
  const buckets: Bucket[] = bucketDefs.map(def => ({
    ...def,
    count: 0,
    isPositive: def.min >= 0,
  }));
  
  // Count trades in each bucket
  for (const pnl of pnls) {
    for (const bucket of buckets) {
      if (pnl >= bucket.min && pnl < bucket.max) {
        bucket.count++;
        break;
      }
    }
  }
  
  // Filter out empty buckets
  return buckets.filter(b => b.count > 0);
}

export function ReturnDistributionChart({ 
  trades, 
  width = 400, 
  height = 200,
  showLabels = true
}: ReturnDistributionChartProps) {
  const { buckets, stats } = useMemo(() => {
    const pnls = trades
      .map(calculateTradePnl)
      .filter((p): p is number => p !== null);
    
    if (pnls.length === 0) {
      return { buckets: [], stats: null };
    }
    
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    
    return {
      buckets: createBuckets(pnls),
      stats: {
        totalTrades: pnls.length,
        avgReturn: pnls.reduce((a, b) => a + b, 0) / pnls.length,
        maxWin: wins.length > 0 ? Math.max(...wins) : 0,
        maxLoss: losses.length > 0 ? Math.min(...losses) : 0,
        medianReturn: [...pnls].sort((a, b) => a - b)[Math.floor(pnls.length / 2)],
      }
    };
  }, [trades]);
  
  if (buckets.length === 0 || !stats) {
    return (
      <div 
        className="flex items-center justify-center bg-slate-800/50 rounded-lg border border-slate-700"
        style={{ width, height }}
      >
        <p className="text-slate-500 text-sm">No trade data for histogram</p>
      </div>
    );
  }
  
  const maxCount = Math.max(...buckets.map(b => b.count));
  const padding = { top: 20, right: 20, bottom: showLabels ? 60 : 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = Math.max(20, (chartWidth / buckets.length) - 4);
  const barGap = 4;
  
  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-200">Return Distribution</h3>
        <div className="flex gap-4 text-xs">
          <span className="text-slate-400">
            Avg: <span className={stats.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
              {stats.avgReturn >= 0 ? '+' : ''}${(stats.avgReturn / 100).toFixed(2)}
            </span>
          </span>
          <span className="text-slate-400">
            Median: <span className={stats.medianReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
              {stats.medianReturn >= 0 ? '+' : ''}${(stats.medianReturn / 100).toFixed(2)}
            </span>
          </span>
        </div>
      </div>
      
      {/* Chart */}
      <svg width={width} height={height} className="overflow-visible">
        {/* Y-axis gridlines */}
        {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={padding.top + chartHeight * (1 - ratio)}
              x2={width - padding.right}
              y2={padding.top + chartHeight * (1 - ratio)}
              stroke="rgb(51 65 85 / 0.5)"
              strokeDasharray="4,4"
            />
            <text
              x={padding.left - 8}
              y={padding.top + chartHeight * (1 - ratio)}
              fill="rgb(148 163 184)"
              fontSize="10"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {Math.round(maxCount * ratio)}
            </text>
          </g>
        ))}
        
        {/* Bars */}
        {buckets.map((bucket, i) => {
          const barHeight = (bucket.count / maxCount) * chartHeight;
          const x = padding.left + i * (barWidth + barGap);
          const y = padding.top + chartHeight - barHeight;
          
          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={2}
                fill={bucket.isPositive ? 'rgb(34 197 94)' : 'rgb(239 68 68)'}
                opacity={0.8}
                className="hover:opacity-100 transition-opacity cursor-pointer"
              />
              
              {/* Count label on bar */}
              {bucket.count > 0 && barHeight > 15 && (
                <text
                  x={x + barWidth / 2}
                  y={y + barHeight / 2}
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {bucket.count}
                </text>
              )}
              
              {/* Count above bar if bar is too short */}
              {bucket.count > 0 && barHeight <= 15 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  fill="rgb(148 163 184)"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {bucket.count}
                </text>
              )}
              
              {/* X-axis label */}
              {showLabels && (
                <text
                  x={x + barWidth / 2}
                  y={padding.top + chartHeight + 12}
                  fill="rgb(148 163 184)"
                  fontSize="9"
                  textAnchor="middle"
                  transform={`rotate(-45, ${x + barWidth / 2}, ${padding.top + chartHeight + 12})`}
                >
                  {bucket.label}
                </text>
              )}
            </g>
          );
        })}
        
        {/* X-axis line */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={width - padding.right}
          y2={padding.top + chartHeight}
          stroke="rgb(71 85 105)"
          strokeWidth={1}
        />
        
        {/* Y-axis line */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="rgb(71 85 105)"
          strokeWidth={1}
        />
      </svg>
      
      {/* Legend */}
      <div className="flex justify-center gap-6 mt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-500 rounded-sm opacity-80" />
          <span className="text-slate-400">Losses ({trades.filter(t => t.result_status === 'lost').length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-500 rounded-sm opacity-80" />
          <span className="text-slate-400">Wins ({trades.filter(t => t.result_status === 'won').length})</span>
        </div>
      </div>
      
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700">
        <div className="text-center">
          <div className="text-xs text-slate-500">Max Win</div>
          <div className="text-sm font-medium text-green-400">
            +${(stats.maxWin / 100).toFixed(2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500">Max Loss</div>
          <div className="text-sm font-medium text-red-400">
            -${(Math.abs(stats.maxLoss) / 100).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate mock data for demo
export function generateMockTrades(count: number = 50): Trade[] {
  const trades: Trade[] = [];
  
  for (let i = 0; i < count; i++) {
    const isWin = Math.random() > 0.45; // Slight edge
    const price = Math.floor(Math.random() * 60) + 20; // 20-80 cents
    const contracts = Math.floor(Math.random() * 3) + 1;
    
    trades.push({
      result_status: isWin ? 'won' : 'lost',
      price_cents: price,
      contracts: contracts,
      side: Math.random() > 0.5 ? 'yes' : 'no'
    });
  }
  
  return trades;
}
