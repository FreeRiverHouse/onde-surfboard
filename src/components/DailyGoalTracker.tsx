'use client'

import { useState, useEffect, useCallback } from 'react';
import { Target, Edit3, Check, X, Trophy, AlertTriangle, TrendingUp } from 'lucide-react';

interface DailyGoalTrackerProps {
  todayPnlCents: number;
  className?: string;
}

interface GoalHistory {
  date: string;
  goal: number;
  achieved: number;
  hit: boolean;
}

const STORAGE_KEY = 'trading-daily-goal';
const HISTORY_KEY = 'trading-goal-history';
const DEFAULT_GOAL = 50; // $0.50 default for small account

export function DailyGoalTracker({ todayPnlCents, className = '' }: DailyGoalTrackerProps) {
  const [goalCents, setGoalCents] = useState<number>(DEFAULT_GOAL);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [goalHistory, setGoalHistory] = useState<GoalHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load goal from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setGoalCents(parseInt(saved, 10));
      }
      const history = localStorage.getItem(HISTORY_KEY);
      if (history) {
        try {
          setGoalHistory(JSON.parse(history));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, []);

  // Save goal to localStorage when changed
  const saveGoal = useCallback((newGoal: number) => {
    setGoalCents(newGoal);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newGoal.toString());
    }
  }, []);

  // Track goal hit rate - update history at end of day
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const today = new Date().toISOString().split('T')[0];
    const lastEntry = goalHistory[goalHistory.length - 1];
    
    // Only update if we have a different day or values changed significantly
    if (!lastEntry || lastEntry.date !== today) {
      // New day - record yesterday if exists
      if (lastEntry && lastEntry.date !== today) {
        // Yesterday's record is final
      }
    } else if (lastEntry.date === today) {
      // Update today's entry
      const updatedHistory = [...goalHistory.slice(0, -1), {
        date: today,
        goal: goalCents,
        achieved: todayPnlCents,
        hit: todayPnlCents >= goalCents
      }];
      setGoalHistory(updatedHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory.slice(-30))); // Keep last 30 days
    }
  }, [todayPnlCents, goalCents, goalHistory]);

  // Calculate progress
  const progress = goalCents > 0 ? Math.min(100, Math.max(-100, (todayPnlCents / goalCents) * 100)) : 0;
  const isGoalMet = todayPnlCents >= goalCents;
  const isBehind = todayPnlCents < 0;

  // Calculate goal hit rate
  const completedDays = goalHistory.filter(h => h.date !== new Date().toISOString().split('T')[0]);
  const hitCount = completedDays.filter(h => h.hit).length;
  const hitRate = completedDays.length > 0 ? (hitCount / completedDays.length) * 100 : 0;

  // Handle edit
  const startEdit = () => {
    setEditValue((goalCents / 100).toFixed(2));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const confirmEdit = () => {
    const newGoal = Math.round(parseFloat(editValue) * 100);
    if (!isNaN(newGoal) && newGoal > 0) {
      saveGoal(newGoal);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') confirmEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  // Determine status color and icon
  const getStatusInfo = () => {
    if (isGoalMet) {
      return { color: 'green', icon: Trophy, text: 'Goal Met! 🎉', bgGlow: 'rgba(34, 197, 94, 0.2)' };
    }
    if (isBehind) {
      return { color: 'red', icon: AlertTriangle, text: 'Behind', bgGlow: 'rgba(239, 68, 68, 0.1)' };
    }
    return { color: 'yellow', icon: TrendingUp, text: 'On Track', bgGlow: 'rgba(234, 179, 8, 0.1)' };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  return (
    <div 
      className={`rounded-xl border border-white/10 p-3 sm:p-4 transition-all ${className}`}
      style={{ 
        background: `linear-gradient(135deg, rgba(30, 30, 40, 0.8), rgba(20, 20, 30, 0.9))`,
        boxShadow: `0 0 20px ${status.bgGlow}`
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-gray-300">Daily Goal</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${
            status.color === 'green' ? 'text-green-400' : 
            status.color === 'red' ? 'text-red-400' : 'text-yellow-400'
          }`} />
          <span className={`text-xs font-medium ${
            status.color === 'green' ? 'text-green-400' : 
            status.color === 'red' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {status.text}
          </span>
        </div>
      </div>

      {/* Goal amount */}
      <div className="flex items-center gap-2 mb-3">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">$</span>
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-20 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-cyan-400"
              step="0.01"
              min="0.01"
              autoFocus
            />
            <button onClick={confirmEdit} className="p-1 hover:bg-white/10 rounded">
              <Check className="w-4 h-4 text-green-400" />
            </button>
            <button onClick={cancelEdit} className="p-1 hover:bg-white/10 rounded">
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        ) : (
          <>
            <span className="text-2xl font-bold text-white">
              ${(goalCents / 100).toFixed(2)}
            </span>
            <button 
              onClick={startEdit} 
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Edit goal"
            >
              <Edit3 className="w-3.5 h-3.5 text-gray-400 hover:text-cyan-400" />
            </button>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden mb-2">
        {/* Negative progress (red, from center) */}
        {todayPnlCents < 0 && (
          <div 
            className="absolute top-0 right-1/2 h-full bg-gradient-to-l from-red-500/80 to-red-600/60 rounded-l-full transition-all duration-500"
            style={{ width: `${Math.min(50, Math.abs(progress) / 2)}%` }}
          />
        )}
        {/* Positive progress (green/cyan, from center) */}
        {todayPnlCents >= 0 && (
          <div 
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
              isGoalMet 
                ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        )}
        {/* Goal marker */}
        <div className="absolute top-0 right-0 w-1 h-full bg-white/50" />
      </div>

      {/* Progress text */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>
          {todayPnlCents >= 0 ? '+' : ''}${(todayPnlCents / 100).toFixed(2)}
        </span>
        <span>{progress.toFixed(0)}%</span>
      </div>

      {/* Goal hit rate */}
      {completedDays.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            <span>Hit Rate: <span className={hitRate >= 50 ? 'text-green-400' : 'text-orange-400'}>{hitRate.toFixed(0)}%</span> ({hitCount}/{completedDays.length} days)</span>
            <span className="text-[10px]">{showHistory ? '▲' : '▼'}</span>
          </button>
          
          {showHistory && completedDays.length > 0 && (
            <div className="mt-2 max-h-24 overflow-y-auto">
              {completedDays.slice(-7).reverse().map((h, i) => (
                <div key={i} className="flex justify-between text-[10px] text-gray-500 py-0.5">
                  <span>{h.date}</span>
                  <span className={h.hit ? 'text-green-400' : 'text-red-400'}>
                    ${(h.achieved / 100).toFixed(2)} / ${(h.goal / 100).toFixed(2)}
                    {h.hit ? ' ✓' : ' ✗'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
