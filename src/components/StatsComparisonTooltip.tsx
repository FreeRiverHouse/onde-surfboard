'use client'

import { useState, useEffect, useRef, ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus, CalendarDays, Clock } from 'lucide-react';

interface ComparisonData {
  current: number;
  previous: number;
  previousPeriod: string; // e.g., "7d ago", "yesterday", "last week"
}

interface StatsComparisonTooltipProps {
  children: ReactNode;
  data?: ComparisonData;
  type?: 'pnl' | 'rate' | 'count' | 'currency';
  enabled?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * A hover tooltip that shows comparison between current and previous period values.
 * Wraps any stat card element and shows a floating tooltip on hover.
 */
export function StatsComparisonTooltip({
  children,
  data,
  type = 'pnl',
  enabled = true,
  position = 'top',
  className = ''
}: StatsComparisonTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate tooltip position on hover
  useEffect(() => {
    if (isHovered && containerRef.current && tooltipRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let x = rect.width / 2;
      let y = 0;

      switch (position) {
        case 'top':
          y = -tooltipRect.height - 8;
          break;
        case 'bottom':
          y = rect.height + 8;
          break;
        case 'left':
          x = -tooltipRect.width - 8;
          y = (rect.height - tooltipRect.height) / 2;
          break;
        case 'right':
          x = rect.width + 8;
          y = (rect.height - tooltipRect.height) / 2;
          break;
      }

      setTooltipPos({ x, y });
    }
  }, [isHovered, position]);

  // If disabled or no data, just render children
  if (!enabled || !data) {
    return <>{children}</>;
  }

  const { current, previous, previousPeriod } = data;

  // Calculate change
  const changeAbsolute = current - previous;
  const changePercent = previous !== 0 
    ? ((current - previous) / Math.abs(previous)) * 100 
    : (current > 0 ? 100 : current < 0 ? -100 : 0);

  const isPositive = changeAbsolute > 0;
  const isNegative = changeAbsolute < 0;
  const isNeutral = changeAbsolute === 0;

  // Format values based on type
  const formatValue = (value: number): string => {
    switch (type) {
      case 'currency':
      case 'pnl':
        return `$${(value / 100).toFixed(2)}`;
      case 'rate':
        return `${value.toFixed(1)}%`;
      case 'count':
        return value.toFixed(0);
      default:
        return value.toFixed(2);
    }
  };

  const formatChange = (): string => {
    const sign = changeAbsolute >= 0 ? '+' : '';
    switch (type) {
      case 'currency':
      case 'pnl':
        return `${sign}$${(changeAbsolute / 100).toFixed(2)}`;
      case 'rate':
        return `${sign}${changeAbsolute.toFixed(1)}pp`;
      case 'count':
        return `${sign}${changeAbsolute.toFixed(0)}`;
      default:
        return `${sign}${changeAbsolute.toFixed(2)}`;
    }
  };

  const colorClass = isPositive 
    ? 'text-emerald-400' 
    : isNegative 
    ? 'text-red-400' 
    : 'text-gray-400';

  const bgColorClass = isPositive 
    ? 'bg-emerald-500/20' 
    : isNegative 
    ? 'bg-red-500/20' 
    : 'bg-gray-500/20';

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`
          absolute z-50 pointer-events-none
          transition-all duration-200 ease-out
          ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}
        style={{
          left: position === 'top' || position === 'bottom' ? '50%' : tooltipPos.x,
          top: position === 'left' || position === 'right' ? tooltipPos.y : 
               position === 'top' ? 'auto' : '100%',
          bottom: position === 'top' ? '100%' : 'auto',
          transform: position === 'top' || position === 'bottom' 
            ? 'translateX(-50%)' 
            : 'none',
          marginBottom: position === 'top' ? '8px' : 0,
          marginTop: position === 'bottom' ? '8px' : 0,
          marginLeft: position === 'right' ? '8px' : 0,
          marginRight: position === 'left' ? '8px' : 0,
        }}
      >
        <div className="
          bg-gray-900/95 backdrop-blur-xl
          border border-white/10
          rounded-xl shadow-2xl
          p-3 min-w-[180px]
          text-sm
        ">
          {/* Header with period */}
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2 pb-2 border-b border-white/10">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>vs {previousPeriod}</span>
          </div>
          
          {/* Current vs Previous */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Now</span>
              <span className="font-mono font-medium text-white">{formatValue(current)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Then</span>
              <span className="font-mono text-gray-400">{formatValue(previous)}</span>
            </div>
          </div>
          
          {/* Change indicator */}
          <div className={`
            mt-3 pt-2 border-t border-white/10
            flex items-center justify-between
          `}>
            <div className={`flex items-center gap-1.5 ${colorClass}`}>
              <Icon className="w-4 h-4" />
              <span className="font-medium">{formatChange()}</span>
            </div>
            {!isNeutral && (
              <span className={`
                px-1.5 py-0.5 rounded text-[10px] font-medium
                ${bgColorClass} ${colorClass}
              `}>
                {isPositive ? '+' : ''}{changePercent.toFixed(0)}%
              </span>
            )}
          </div>
          
          {/* Arrow pointer */}
          <div className={`
            absolute w-2 h-2 bg-gray-900/95 border-white/10
            transform rotate-45
            ${position === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b' : ''}
            ${position === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-l border-t' : ''}
            ${position === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-t border-r' : ''}
            ${position === 'right' ? 'left-[-5px] top-1/2 -translate-y-1/2 border-b border-l' : ''}
          `} />
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage comparison tooltip enabled state with localStorage persistence
 */
export function useComparisonTooltip() {
  const [enabled, setEnabled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('statsComparisonTooltip');
    if (stored !== null) {
      setEnabled(stored === 'true');
    }
    setIsLoaded(true);
  }, []);

  const toggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    localStorage.setItem('statsComparisonTooltip', String(newValue));
  };

  return { enabled, toggle, isLoaded };
}

/**
 * Toggle button for comparison tooltip feature
 */
export function ComparisonTooltipToggle({ 
  enabled, 
  onToggle,
  className = ''
}: { 
  enabled: boolean; 
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg
        text-xs font-medium transition-all
        ${enabled 
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
          : 'bg-gray-800/50 text-gray-500 border border-gray-700/50 hover:bg-gray-700/50'}
        ${className}
      `}
      title={enabled ? 'Disable stat comparison tooltips' : 'Enable stat comparison tooltips'}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>Compare</span>
      <div className={`
        w-8 h-4 rounded-full relative transition-colors
        ${enabled ? 'bg-cyan-500/40' : 'bg-gray-600'}
      `}>
        <div className={`
          absolute top-0.5 w-3 h-3 rounded-full transition-all
          ${enabled ? 'left-4 bg-cyan-400' : 'left-0.5 bg-gray-400'}
        `} />
      </div>
    </button>
  );
}

export default StatsComparisonTooltip;
