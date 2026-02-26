'use client';

import { useMemo } from 'react';

type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

interface TaskPriorityBadgeProps {
  priority: Priority | string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

interface PriorityConfig {
  label: string;
  emoji: string;
  bgGradient: string;
  textColor: string;
  borderColor: string;
  glowColor: string;
  pulseColor: string;
  description: string;
}

const priorityConfig: Record<Priority, PriorityConfig> = {
  P0: {
    label: 'CRITICAL',
    emoji: '🔥',
    bgGradient: 'bg-gradient-to-r from-red-600 via-orange-500 to-red-600',
    textColor: 'text-white',
    borderColor: 'border-red-400',
    glowColor: 'shadow-red-500/50',
    pulseColor: 'bg-red-500',
    description: 'Drop everything',
  },
  P1: {
    label: 'HIGH',
    emoji: '🟠',
    bgGradient: 'bg-gradient-to-r from-orange-500 to-amber-500',
    textColor: 'text-white',
    borderColor: 'border-orange-400',
    glowColor: 'shadow-orange-500/40',
    pulseColor: 'bg-orange-500',
    description: 'Do today',
  },
  P2: {
    label: 'MEDIUM',
    emoji: '🟡',
    bgGradient: 'bg-gradient-to-r from-yellow-400 to-amber-400',
    textColor: 'text-yellow-900',
    borderColor: 'border-yellow-400',
    glowColor: 'shadow-yellow-400/30',
    pulseColor: 'bg-yellow-400',
    description: 'This week',
  },
  P3: {
    label: 'LOW',
    emoji: '🟢',
    bgGradient: 'bg-gradient-to-r from-emerald-500 to-green-500',
    textColor: 'text-white',
    borderColor: 'border-emerald-400',
    glowColor: 'shadow-emerald-400/25',
    pulseColor: 'bg-emerald-400',
    description: 'When possible',
  },
  P4: {
    label: 'BACKLOG',
    emoji: '⚪',
    bgGradient: 'bg-gradient-to-r from-gray-500 to-slate-500',
    textColor: 'text-white',
    borderColor: 'border-gray-400',
    glowColor: 'shadow-gray-400/20',
    pulseColor: 'bg-gray-400',
    description: 'Eventually',
  },
};

const sizeClasses = {
  sm: {
    badge: 'px-1.5 py-0.5 text-xs',
    emoji: 'text-xs',
    pulse: 'w-1.5 h-1.5',
  },
  md: {
    badge: 'px-2 py-1 text-sm',
    emoji: 'text-sm',
    pulse: 'w-2 h-2',
  },
  lg: {
    badge: 'px-3 py-1.5 text-base',
    emoji: 'text-base',
    pulse: 'w-2.5 h-2.5',
  },
};

export default function TaskPriorityBadge({
  priority,
  size = 'md',
  showLabel = false,
  animate = true,
  className = '',
}: TaskPriorityBadgeProps) {
  const normalizedPriority = (priority?.toUpperCase() || 'P3') as Priority;
  const config = priorityConfig[normalizedPriority] || priorityConfig.P3;
  const sizeClass = sizeClasses[size];

  const isUrgent = normalizedPriority === 'P0' || normalizedPriority === 'P1';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold
        border ${config.borderColor}
        ${config.bgGradient} ${config.textColor}
        ${animate && isUrgent ? `shadow-lg ${config.glowColor}` : ''}
        ${sizeClass.badge}
        transition-all duration-200
        hover:scale-105 hover:shadow-lg
        ${className}
      `}
      title={`${normalizedPriority}: ${config.description}`}
    >
      {/* Pulse indicator for urgent items */}
      {animate && isUrgent && (
        <span className="relative flex">
          <span
            className={`
              animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
              ${config.pulseColor}
            `}
          />
          <span
            className={`
              relative inline-flex rounded-full
              ${sizeClass.pulse}
              ${config.pulseColor}
            `}
          />
        </span>
      )}

      {/* Priority emoji */}
      <span className={sizeClass.emoji}>{config.emoji}</span>

      {/* Priority code */}
      <span className="font-mono">{normalizedPriority}</span>

      {/* Optional label */}
      {showLabel && (
        <span className="font-medium opacity-90">{config.label}</span>
      )}
    </span>
  );
}

/**
 * Compact heat bar showing priority as colored segment
 */
export function PriorityHeatBar({
  priority,
  className = '',
}: {
  priority: Priority | string;
  className?: string;
}) {
  const normalizedPriority = (priority?.toUpperCase() || 'P3') as Priority;
  const heatLevel = { P0: 5, P1: 4, P2: 3, P3: 2, P4: 1 }[normalizedPriority] || 2;

  return (
    <div
      className={`flex gap-0.5 items-center ${className}`}
      title={`Priority: ${normalizedPriority}`}
    >
      {[5, 4, 3, 2, 1].map((level) => (
        <div
          key={level}
          className={`
            w-1.5 h-3 rounded-sm transition-all duration-300
            ${level <= heatLevel 
              ? level === 5 ? 'bg-red-500 shadow-sm shadow-red-500/50'
                : level === 4 ? 'bg-orange-500'
                : level === 3 ? 'bg-yellow-400'
                : level === 2 ? 'bg-emerald-400'
                : 'bg-gray-400'
              : 'bg-white/10'
            }
          `}
        />
      ))}
    </div>
  );
}

/**
 * Priority summary showing distribution across all priority levels
 */
export function PriorityHeatmapSummary({
  distribution,
  className = '',
}: {
  distribution: Record<string, number>;
  className?: string;
}) {
  const total = useMemo(() => 
    Object.values(distribution).reduce((sum, count) => sum + count, 0),
    [distribution]
  );

  if (total === 0) return null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {(['P0', 'P1', 'P2', 'P3', 'P4'] as Priority[]).map((p) => {
        const count = distribution[p] || 0;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        const config = priorityConfig[p];

        return (
          <div
            key={p}
            className="flex items-center gap-1.5 text-xs"
            title={`${p}: ${count} tasks (${percentage}%)`}
          >
            <span
              className={`w-3 h-3 rounded-full ${config.bgGradient} ${
                p === 'P0' ? 'animate-pulse' : ''
              }`}
            />
            <span className="text-white/70 font-mono">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Priority indicator dot (minimal version)
 */
export function PriorityDot({
  priority,
  size = 'md',
  animate = true,
  className = '',
}: {
  priority: Priority | string;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  className?: string;
}) {
  const normalizedPriority = (priority?.toUpperCase() || 'P3') as Priority;
  const config = priorityConfig[normalizedPriority];
  const isUrgent = normalizedPriority === 'P0' || normalizedPriority === 'P1';

  const dotSize = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={`
        relative inline-flex
        ${className}
      `}
      title={`${normalizedPriority}: ${config.description}`}
    >
      {animate && isUrgent && (
        <span
          className={`
            animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
            ${config.pulseColor}
          `}
        />
      )}
      <span
        className={`
          relative inline-flex rounded-full
          ${dotSize}
          ${config.bgGradient}
          ${isUrgent ? `shadow-md ${config.glowColor}` : ''}
        `}
      />
    </span>
  );
}
