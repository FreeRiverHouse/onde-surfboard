'use client'

import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { formatAgeWithStaleness } from '@/lib/time-utils';

interface LastUpdatedIndicatorProps {
  /** The last update timestamp */
  lastUpdated: Date | string | null;
  /** Whether data came from cache */
  fromCache?: boolean;
  /** Threshold in seconds before data is considered stale (default: 5 min) */
  thresholdSeconds?: number;
  /** Compact mode for mobile */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when user requests refresh due to stale data */
  onRequestRefresh?: () => void;
}

/**
 * Shows last updated time with staleness indicator
 * Features:
 * - Relative time display (e.g., "2m ago")
 * - Color-coded staleness (green=fresh, yellow=stale, red=very stale)
 * - Cache indicator when serving cached data
 * - Auto-updates every second to keep time current
 */
export function LastUpdatedIndicator({
  lastUpdated,
  fromCache = false,
  thresholdSeconds = 300,
  compact = false,
  className = '',
  onRequestRefresh
}: LastUpdatedIndicatorProps) {
  const [ageInfo, setAgeInfo] = useState(() => formatAgeWithStaleness(lastUpdated, thresholdSeconds));
  
  // Update the display every 10 seconds to keep relative time current
  useEffect(() => {
    const updateAge = () => {
      setAgeInfo(formatAgeWithStaleness(lastUpdated, thresholdSeconds));
    };
    
    updateAge();
    const interval = setInterval(updateAge, 10000);
    return () => clearInterval(interval);
  }, [lastUpdated, thresholdSeconds]);
  
  const showCacheWarning = fromCache || ageInfo.isStale;
  
  if (compact) {
    return (
      <span 
        className={`text-[10px] sm:text-xs font-mono flex items-center gap-1 ${ageInfo.colorClass} ${className}`}
        title={showCacheWarning ? 'Data may be stale - click refresh' : 'Data is fresh'}
      >
        {showCacheWarning && <AlertCircle className="w-3 h-3" />}
        {ageInfo.text}
      </span>
    );
  }
  
  return (
    <div 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
        ageInfo.level === 'fresh' 
          ? 'bg-emerald-500/10 border border-emerald-500/20'
          : ageInfo.level === 'stale'
            ? 'bg-yellow-500/10 border border-yellow-500/20'
            : 'bg-red-500/10 border border-red-500/20'
      } ${className}`}
    >
      {ageInfo.level === 'fresh' ? (
        <Clock className={`w-3.5 h-3.5 ${ageInfo.colorClass}`} />
      ) : (
        <AlertCircle className={`w-3.5 h-3.5 ${ageInfo.colorClass}`} />
      )}
      
      <div className="flex flex-col">
        <span className={`text-xs font-mono ${ageInfo.colorClass}`}>
          {fromCache ? 'Cached: ' : ''}{ageInfo.text}
        </span>
        {ageInfo.isStale && (
          <span className="text-[9px] text-gray-500">
            Data may be outdated
          </span>
        )}
      </div>
      
      {ageInfo.isStale && onRequestRefresh && (
        <button
          onClick={onRequestRefresh}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="w-3 h-3 text-gray-400 hover:text-cyan-400" />
        </button>
      )}
    </div>
  );
}
