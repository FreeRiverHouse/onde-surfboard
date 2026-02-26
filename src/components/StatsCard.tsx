"use client"

import { Sparkline, MiniBarChart } from './Sparkline'
import { AnimatedNumber, AnimatedPercentage } from './AnimatedNumber'

interface StatsCardProps {
  title: string
  value: number | null
  prefix?: string
  suffix?: string
  decimals?: number
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  sparklineData?: number[]
  chartType?: 'sparkline' | 'bars' | 'percentage' | 'none'
  color?: 'cyan' | 'gold' | 'emerald' | 'purple' | 'amber'
  icon?: React.ReactNode
  subtitle?: string
  comparison?: {
    label: string
    value: string
    trend: 'up' | 'down' | 'neutral'
  }
  className?: string
  loading?: boolean
  noData?: boolean
}

const colorMap = {
  cyan: {
    text: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/20',
    gradient: 'from-cyan-400 to-cyan-500',
    hex: '#06b6d4'
  },
  gold: {
    text: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    gradient: 'from-amber-400 to-orange-500',
    hex: '#fbbf24'
  },
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    gradient: 'from-emerald-400 to-emerald-500',
    hex: '#10b981'
  },
  purple: {
    text: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
    gradient: 'from-purple-400 to-purple-500',
    hex: '#a855f7'
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    gradient: 'from-amber-400 to-amber-500',
    hex: '#f59e0b'
  }
}

export function StatsCard({
  title,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  trend,
  trendValue,
  sparklineData = [],
  chartType = 'sparkline',
  color = 'cyan',
  icon,
  subtitle,
  comparison,
  className = '',
  loading = false,
  noData = false
}: StatsCardProps) {
  const colors = colorMap[color]

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white/5 rounded-xl p-4 border border-white/10 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg" />
            <div className="w-24 h-3 bg-white/10 rounded" />
          </div>
          <div className="w-20 h-8 bg-white/10 rounded" />
        </div>
      </div>
    )
  }

  // No data state
  if (noData || value === null) {
    return (
      <div className={`bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all group ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon && (
              <div className={`p-1.5 rounded-lg bg-white/5 text-white/30`}>
                {icon}
              </div>
            )}
            <span className="text-xs text-white/50 uppercase tracking-wider">{title}</span>
          </div>
        </div>
        <div className="flex items-center justify-center py-2">
          <div className="text-center">
            <div className="text-2xl text-white/20">—</div>
            <p className="text-xs text-white/30 mt-1">No data yet</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all group ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={`p-1.5 rounded-lg ${colors.bg} ${colors.text}`}>
              {icon}
            </div>
          )}
          <span className="text-xs text-white/50 uppercase tracking-wider">{title}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${
            trend === 'up' ? 'text-emerald-400' :
            trend === 'down' ? 'text-red-400' :
            'text-white/40'
          }`}>
            {trend === 'up' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
            {trend === 'down' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className={`text-3xl font-bold bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent`}>
            <AnimatedNumber
              value={value}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
              duration={1200}
            />
          </div>
          {subtitle && (
            <p className="text-xs text-white/40 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Chart */}
        {chartType === 'sparkline' && sparklineData.length > 0 && (
          <Sparkline
            data={sparklineData}
            width={80}
            height={32}
            color={colors.hex}
            showArea={true}
          />
        )}
        {chartType === 'bars' && sparklineData.length > 0 && (
          <MiniBarChart
            data={sparklineData}
            width={80}
            height={32}
            color={colors.hex}
          />
        )}
        {chartType === 'percentage' && (
          <AnimatedPercentage
            value={value}
            size={48}
            strokeWidth={4}
            color={colors.hex}
          />
        )}
      </div>

      {/* Comparison */}
      {comparison && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-white/40">{comparison.label}</span>
          <span className={`text-xs ${
            comparison.trend === 'up' ? 'text-emerald-400' :
            comparison.trend === 'down' ? 'text-red-400' :
            'text-white/40'
          }`}>
            {comparison.value}
          </span>
        </div>
      )}
    </div>
  )
}

// Quick stats row component
interface QuickStatsProps {
  stats: {
    title: string
    value: number | null
    prefix?: string
    suffix?: string
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
    color?: 'cyan' | 'gold' | 'emerald' | 'purple' | 'amber'
    sparklineData?: number[]
    loading?: boolean
    noData?: boolean
  }[]
  className?: string
}

export function QuickStats({ stats, className = '' }: QuickStatsProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          prefix={stat.prefix}
          suffix={stat.suffix}
          trend={stat.trend}
          trendValue={stat.trendValue}
          color={stat.color || 'cyan'}
          sparklineData={stat.sparklineData}
          chartType={stat.sparklineData ? 'sparkline' : 'none'}
          loading={stat.loading}
          noData={stat.noData}
        />
      ))}
    </div>
  )
}
