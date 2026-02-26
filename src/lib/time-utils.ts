/**
 * Time utilities for formatting and staleness detection
 */

/**
 * Format a date as relative time string (e.g., "2m ago", "1h ago")
 */
export function getTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  
  if (seconds < 0) return 'just now'; // Handle future dates
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return d.toLocaleDateString();
}

/**
 * Check if data is stale (older than threshold)
 * @param date - Last update time
 * @param thresholdSeconds - Staleness threshold in seconds (default: 5 minutes)
 * @returns Staleness level: 'fresh' | 'stale' | 'very-stale'
 */
export function getStalenessLevel(
  date: Date | string | null,
  thresholdSeconds = 300 // 5 minutes default
): 'fresh' | 'stale' | 'very-stale' {
  if (!date) return 'very-stale';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  const ageSeconds = Math.floor((Date.now() - d.getTime()) / 1000);
  
  if (ageSeconds < thresholdSeconds) return 'fresh';
  if (ageSeconds < thresholdSeconds * 3) return 'stale';
  return 'very-stale';
}

/**
 * Format age with staleness indicator
 * Returns both the time string and a color class
 */
export function formatAgeWithStaleness(
  date: Date | string | null,
  thresholdSeconds = 300
): { text: string; colorClass: string; isStale: boolean; level: string } {
  if (!date) {
    return {
      text: 'unknown',
      colorClass: 'text-red-400',
      isStale: true,
      level: 'very-stale'
    };
  }
  
  const d = typeof date === 'string' ? new Date(date) : date;
  const level = getStalenessLevel(d, thresholdSeconds);
  const text = getTimeAgo(d);
  
  const colorClasses = {
    'fresh': 'text-emerald-400',
    'stale': 'text-yellow-400',
    'very-stale': 'text-red-400'
  };
  
  return {
    text,
    colorClass: colorClasses[level],
    isStale: level !== 'fresh',
    level
  };
}
