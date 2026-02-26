'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonIndicatorProps {
  current: number;
  previous: number;
  type?: 'pnl' | 'rate' | 'count';
  showValue?: boolean;
  className?: string;
}

/**
 * Shows a comparison indicator (+X% / -X%) comparing current vs previous value.
 * For 'pnl' type, also shows absolute change in dollars.
 * For 'rate' type, shows percentage point change.
 * For 'count' type, shows count difference.
 */
export function ComparisonIndicator({ 
  current, 
  previous, 
  type = 'pnl',
  showValue = true,
  className = '' 
}: ComparisonIndicatorProps) {
  // Handle edge cases
  if (previous === 0 && current === 0) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] text-gray-500 ${className}`}>
        <Minus className="w-3 h-3" />
        <span>—</span>
      </span>
    );
  }

  // Calculate change
  let changePercent: number;
  let changeAbsolute: number;
  let displayValue: string;

  if (type === 'pnl') {
    // PnL: show absolute dollar change and percentage
    changeAbsolute = current - previous;
    changePercent = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : (current > 0 ? 100 : -100);
    displayValue = showValue 
      ? `${changeAbsolute >= 0 ? '+' : ''}$${(changeAbsolute / 100).toFixed(2)}`
      : `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(0)}%`;
  } else if (type === 'rate') {
    // Win rate: show percentage point change
    changeAbsolute = current - previous;
    changePercent = changeAbsolute; // pp change
    displayValue = `${changeAbsolute >= 0 ? '+' : ''}${changeAbsolute.toFixed(1)}pp`;
  } else {
    // Count: show count difference and percentage
    changeAbsolute = current - previous;
    changePercent = previous !== 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);
    displayValue = showValue 
      ? `${changeAbsolute >= 0 ? '+' : ''}${changeAbsolute}`
      : `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(0)}%`;
  }

  // Determine color and icon
  const isPositive = changeAbsolute > 0;
  const isNegative = changeAbsolute < 0;

  // For PnL, positive is good. For rates, higher is usually better.
  const colorClass = isPositive 
    ? 'text-emerald-400' 
    : isNegative 
    ? 'text-red-400' 
    : 'text-gray-500';

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <span 
      className={`inline-flex items-center gap-0.5 text-[10px] ${colorClass} ${className}`}
      title={`vs previous: ${type === 'pnl' ? `$${(previous / 100).toFixed(2)}` : type === 'rate' ? `${previous.toFixed(1)}%` : previous}`}
    >
      <Icon className="w-3 h-3" />
      <span>{displayValue}</span>
    </span>
  );
}

/**
 * Compact version showing just the trend arrow and percentage.
 */
export function ComparisonBadge({
  current,
  previous,
  className = ''
}: {
  current: number;
  previous: number;
  className?: string;
}) {
  if (previous === 0 && current === 0) return null;
  
  const change = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;
  const isPositive = change > 0;
  const isNegative = change < 0;
  
  if (Math.abs(change) < 1) return null; // Don't show tiny changes
  
  return (
    <span 
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
        isPositive 
          ? 'bg-emerald-500/20 text-emerald-400' 
          : isNegative
          ? 'bg-red-500/20 text-red-400'
          : 'bg-gray-500/20 text-gray-400'
      } ${className}`}
    >
      {isPositive ? '↑' : isNegative ? '↓' : '='} {Math.abs(change).toFixed(0)}%
    </span>
  );
}
