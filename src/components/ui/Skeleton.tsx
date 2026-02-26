"use client"

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

/**
 * Skeleton loading placeholder
 * 
 * Usage:
 * - <Skeleton /> - Default text line
 * - <Skeleton variant="circular" className="w-10 h-10" /> - Avatar
 * - <Skeleton variant="rectangular" className="h-32 w-full" /> - Card
 */
export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const baseClasses = 'bg-white/5 rounded'
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  }

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
      aria-hidden="true"
      role="presentation"
    />
  )
}

/**
 * Pre-built skeleton for a panel/card
 */
export function SkeletonPanel({ rows = 3 }: { rows?: number }) {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="w-8 h-8" />
        <Skeleton className="w-32 h-5" />
      </div>
      {/* Content rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-3/4 h-4" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Pre-built skeleton for a list
 */
export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton variant="circular" className="w-6 h-6 flex-shrink-0" />
          <Skeleton className="flex-1 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
      ))}
    </div>
  )
}

/**
 * Pre-built skeleton for stats/metrics
 */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 rounded-xl bg-white/5 space-y-2">
          <Skeleton className="w-12 h-3" />
          <Skeleton className="w-20 h-6" />
        </div>
      ))}
    </div>
  )
}

/**
 * Pre-built skeleton for chart area
 */
export function SkeletonChart({ height = 200 }: { height?: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-white/5" style={{ height }}>
      <div className="absolute inset-0 flex items-end justify-around p-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton 
            key={i} 
            variant="rectangular"
            className="flex-1"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent" />
    </div>
  )
}
