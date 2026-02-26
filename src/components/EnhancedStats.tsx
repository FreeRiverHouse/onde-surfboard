"use client"

import { useEffect, useState } from 'react'
import { StatsCard } from './StatsCard'
import type { DashboardStats } from '@/lib/data'

interface EnhancedStatsProps {
  stats?: DashboardStats
}

interface MetricsData {
  publishing: {
    booksPublished: number | null
    audiobooks: number | null
    podcasts: number | null
    videos: number | null
    history: { date: string; value: number }[]
  }
  social: {
    xFollowers: number | null
    igFollowers: number | null
    tiktokFollowers: number | null
    youtubeSubscribers: number | null
    postsThisWeek: number | null
  }
  analytics: {
    pageviews: number | null
    users: number | null
    sessions: number | null
    bounceRate: number | null
    history: { date: string; value: number }[]
  }
  hasData: boolean
  lastUpdated: string | null
}

export function EnhancedStats({ stats: _stats }: EnhancedStatsProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/metrics')
        if (!response.ok) throw new Error('Failed to fetch metrics')
        const data = await response.json()
        setMetrics(data)
      } catch {
        // Error fetching metrics - show no data state
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [])

  // No data state
  const noData = !metrics?.hasData

  // Extract history as sparkline data
  const booksHistory = metrics?.publishing?.history?.map(h => h.value) || []
  const analyticsHistory = metrics?.analytics?.history?.map(h => h.value) || []

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      <StatsCard
        title="Books Published"
        value={metrics?.publishing?.booksPublished ?? null}
        sparklineData={booksHistory.length > 0 ? booksHistory : undefined}
        chartType="bars"
        color="cyan"
        trend={booksHistory.length > 1 ? "up" : undefined}
        loading={loading}
        noData={noData || metrics?.publishing?.booksPublished === null}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        }
      />

      <StatsCard
        title="Daily Visitors"
        value={metrics?.analytics?.users ?? null}
        sparklineData={analyticsHistory.length > 0 ? analyticsHistory : undefined}
        chartType="sparkline"
        color="emerald"
        loading={loading}
        noData={noData || metrics?.analytics?.users === null}
        subtitle="from Google Analytics"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        }
      />

      <StatsCard
        title="Social Followers"
        value={
          metrics?.social?.xFollowers !== null || metrics?.social?.igFollowers !== null
            ? (metrics?.social?.xFollowers || 0) + (metrics?.social?.igFollowers || 0) + (metrics?.social?.tiktokFollowers || 0)
            : null
        }
        chartType="sparkline"
        color="amber"
        loading={loading}
        noData={noData || (metrics?.social?.xFollowers === null && metrics?.social?.igFollowers === null)}
        subtitle="X + IG + TikTok"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      />

      <StatsCard
        title="Page Views"
        value={metrics?.analytics?.pageviews ?? null}
        chartType="bars"
        color="purple"
        loading={loading}
        noData={noData || metrics?.analytics?.pageviews === null}
        subtitle="today"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
      />
    </div>
  )
}

// Weekly comparison stats
interface WeeklyComparisonProps {
  stats?: DashboardStats
}

export function WeeklyComparison({ stats: _stats }: WeeklyComparisonProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/metrics')
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [])

  const noData = !metrics?.hasData

  if (loading) {
    return (
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">Weekly Progress</h3>
        </div>
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-6 bg-white/10 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (noData) {
    return (
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">Weekly Progress</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-white/40 text-sm">No historical data yet</p>
          <p className="text-white/30 text-xs mt-1">Metrics will appear once data is collected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Weekly Progress</h3>
        <span className="text-xs text-white/40">vs last week</span>
      </div>

      <div className="space-y-3">
        <MetricRow 
          label="Books Published" 
          value={metrics?.publishing?.booksPublished} 
          history={metrics?.publishing?.history}
        />
        <MetricRow 
          label="Page Views" 
          value={metrics?.analytics?.pageviews} 
          history={metrics?.analytics?.history}
        />
        <MetricRow 
          label="X Followers" 
          value={metrics?.social?.xFollowers}
        />
      </div>

      {/* Last updated */}
      {metrics?.lastUpdated && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="text-xs text-white/30">
            Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricRow({ 
  label, 
  value, 
  history 
}: { 
  label: string
  value: number | null | undefined
  history?: { date: string; value: number }[]
}) {
  // Calculate change from history
  let change: number | null = null
  if (history && history.length > 7 && value !== null && value !== undefined) {
    const weekAgoValue = history[history.length - 8]?.value
    if (weekAgoValue !== undefined) {
      change = value - weekAgoValue
    }
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/60">{label}</span>
      <div className="flex items-center gap-2">
        {value !== null && value !== undefined ? (
          <>
            <span className="text-sm font-medium text-white">{value.toLocaleString()}</span>
            {change !== null && (
              <span className={`text-xs ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {change >= 0 ? '+' : ''}{change}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-white/30">—</span>
        )}
      </div>
    </div>
  )
}
