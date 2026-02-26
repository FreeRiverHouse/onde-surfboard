'use client';

import { Flame, Snowflake, Minus, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

// ============== TYPES ==============
interface StreakIndicatorProps {
  currentStreak: number;
  currentStreakType: 'win' | 'loss' | 'none';
  longestWinStreak?: number;
  longestLossStreak?: number;
  className?: string;
  compact?: boolean;
}

// ============== COMPONENT ==============
export function StreakIndicator({
  currentStreak,
  currentStreakType,
  longestWinStreak = 0,
  longestLossStreak = 0,
  className = '',
  compact = false
}: StreakIndicatorProps) {
  // Determine streak status
  const isWinning = currentStreakType === 'win' && currentStreak > 0;
  const isLosing = currentStreakType === 'loss' && currentStreak > 0;
  const isNeutral = !isWinning && !isLosing;

  // Streak magnitude (for intensity styling)
  const getIntensity = (streak: number): 'low' | 'medium' | 'high' | 'extreme' => {
    if (streak <= 2) return 'low';
    if (streak <= 5) return 'medium';
    if (streak <= 10) return 'high';
    return 'extreme';
  };

  const intensity = getIntensity(currentStreak);

  // Get recommendation based on streak pattern
  const getRecommendation = (): { text: string; type: 'continue' | 'caution' | 'neutral' } => {
    if (isNeutral) {
      return { text: 'Fresh start', type: 'neutral' };
    }
    
    if (isWinning) {
      if (currentStreak >= 5) {
        return { text: 'Consider locking profits', type: 'caution' };
      }
      if (currentStreak >= 3) {
        return { text: 'Hot streak — stay focused', type: 'continue' };
      }
      return { text: 'Momentum building', type: 'continue' };
    }
    
    // Losing
    if (currentStreak >= 5) {
      return { text: 'Tilt risk — reduce size', type: 'caution' };
    }
    if (currentStreak >= 3) {
      return { text: 'Review strategy', type: 'caution' };
    }
    return { text: 'Normal variance', type: 'neutral' };
  };

  const recommendation = getRecommendation();

  // Styling
  const bgStyles = {
    win: {
      low: 'bg-emerald-500/10 border-emerald-500/20',
      medium: 'bg-emerald-500/15 border-emerald-500/30',
      high: 'bg-emerald-500/20 border-emerald-500/40',
      extreme: 'bg-emerald-500/25 border-emerald-500/50 animate-pulse'
    },
    loss: {
      low: 'bg-red-500/10 border-red-500/20',
      medium: 'bg-red-500/15 border-red-500/30',
      high: 'bg-red-500/20 border-red-500/40',
      extreme: 'bg-red-500/25 border-red-500/50'
    },
    none: {
      low: 'bg-gray-500/10 border-gray-500/20',
      medium: 'bg-gray-500/10 border-gray-500/20',
      high: 'bg-gray-500/10 border-gray-500/20',
      extreme: 'bg-gray-500/10 border-gray-500/20'
    }
  };

  const textStyles = {
    win: 'text-emerald-400',
    loss: 'text-red-400',
    none: 'text-gray-400'
  };

  const streakStyle = bgStyles[currentStreakType][intensity];
  const textStyle = textStyles[currentStreakType];

  // Icon
  const StreakIcon = isWinning ? Flame : isLosing ? Snowflake : Minus;

  // Compact version (for header/badges)
  if (compact) {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${streakStyle} ${className}`}
        title={`Current streak: ${currentStreak} ${currentStreakType}${currentStreak !== 1 ? 's' : ''}`}
      >
        <StreakIcon className={`w-3.5 h-3.5 ${textStyle}`} />
        <span className={`text-xs font-bold ${textStyle}`}>
          {currentStreak}{isWinning ? 'W' : isLosing ? 'L' : ''}
        </span>
      </div>
    );
  }

  // Full version (card)
  return (
    <div className={`rounded-xl border p-4 ${streakStyle} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isWinning ? 'bg-emerald-500/20' : isLosing ? 'bg-red-500/20' : 'bg-gray-500/20'
          }`}>
            <StreakIcon className={`w-4 h-4 ${textStyle}`} />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Current Streak</h3>
            <p className={`text-xs ${textStyle}`}>
              {isWinning ? 'Winning' : isLosing ? 'Losing' : 'No streak'}
            </p>
          </div>
        </div>
        
        {/* Big number */}
        <div className={`text-3xl font-bold ${textStyle}`}>
          {currentStreak}
          <span className="text-lg ml-0.5">
            {isWinning ? 'W' : isLosing ? 'L' : ''}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span className="text-gray-400">Best: </span>
          <span className="text-emerald-400 font-medium">{longestWinStreak}W</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown className="w-3 h-3 text-red-400" />
          <span className="text-gray-400">Worst: </span>
          <span className="text-red-400 font-medium">{longestLossStreak}L</span>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        recommendation.type === 'caution' 
          ? 'bg-yellow-500/10 border border-yellow-500/20' 
          : recommendation.type === 'continue'
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : 'bg-white/5 border border-white/10'
      }`}>
        {recommendation.type === 'caution' && (
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
        )}
        <span className={`text-xs font-medium ${
          recommendation.type === 'caution' 
            ? 'text-yellow-400' 
            : recommendation.type === 'continue'
              ? 'text-emerald-400'
              : 'text-gray-400'
        }`}>
          {recommendation.text}
        </span>
      </div>
    </div>
  );
}

// ============== EXPORTS ==============
export default StreakIndicator;
