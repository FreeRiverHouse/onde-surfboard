'use client'

import { useEffect, useState, useCallback } from 'react'

interface HealthAlert {
  id: string
  timestamp: string
  status: 'critical' | 'degraded' | 'healthy'
  affectedServices: string[]
  message: string
  resolvedAt?: string
  durationMs?: number
}

interface AlertsResponse {
  alerts: HealthAlert[]
  summary: {
    total: number
    byService: Record<string, number>
    avgResolutionTime?: number
    lastAlertTime?: string
  }
  source?: 'kv' | 'gist'
}

const SEVERITY_CONFIG = {
  critical: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: '🚨',
    label: 'Critical'
  },
  degraded: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: '⚠️',
    label: 'Warning'
  },
  healthy: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: '✅',
    label: 'Resolved'
  }
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)
  
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(ms / 3600000)
  
  if (minutes < 60) return `${minutes}m`
  return `${hours}h ${minutes % 60}m`
}

function AlertItem({ alert }: { alert: HealthAlert }) {
  const isResolved = !!alert.resolvedAt
  const severity = isResolved ? 'healthy' : alert.status
  const config = SEVERITY_CONFIG[severity]
  
  return (
    <div className={`
      relative flex items-start gap-3 p-3 rounded-xl
      ${config.bg} ${config.border} border
      hover:scale-[1.01] transition-transform duration-200
    `}>
      {/* Severity Icon */}
      <div className="text-xl flex-shrink-0 mt-0.5">
        {config.icon}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Message */}
        <div className={`text-sm font-medium ${config.color} truncate`}>
          {alert.message}
        </div>
        
        {/* Services affected */}
        <div className="flex flex-wrap gap-1 mt-1">
          {alert.affectedServices.map((service) => (
            <span 
              key={service}
              className="text-xs px-1.5 py-0.5 bg-white/5 rounded text-white/60"
            >
              {service}
            </span>
          ))}
        </div>
        
        {/* Timestamp and resolution */}
        <div className="flex items-center gap-2 mt-1 text-xs text-white/40">
          <span>{formatTimeAgo(alert.timestamp)}</span>
          {isResolved && alert.durationMs && (
            <>
              <span>•</span>
              <span className="text-emerald-400/70">
                Resolved in {formatDuration(alert.durationMs)}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Time badge */}
      <div className="text-xs text-white/30 flex-shrink-0 mt-0.5">
        {new Date(alert.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </div>
    </div>
  )
}

function AlertsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div 
          key={i} 
          className="p-3 rounded-xl bg-white/5 border border-white/10 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-3">🎉</div>
      <div className="text-white/60 text-sm">No recent alerts</div>
      <div className="text-white/40 text-xs mt-1">All systems operating normally</div>
    </div>
  )
}

export default function SystemAlertsFeedWidget() {
  const [data, setData] = useState<AlertsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/health/alerts-history?limit=10&days=7', {
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('Failed to fetch alerts')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Initial fetch
  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])
  
  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [fetchAlerts])
  
  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>📢</span> System Alerts
        </h3>
        
        {/* Summary badges */}
        {data && data.alerts.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Critical count */}
            {data.alerts.filter(a => a.status === 'critical' && !a.resolvedAt).length > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                {data.alerts.filter(a => a.status === 'critical' && !a.resolvedAt).length} active
              </span>
            )}
            
            {/* Total */}
            <span className="text-xs text-white/40">
              {data.summary.total} total
            </span>
          </div>
        )}
      </div>
      
      {/* Content */}
      {loading ? (
        <AlertsSkeleton />
      ) : error ? (
        <div className="text-center py-6">
          <div className="text-amber-400 text-sm">{error}</div>
          <button 
            onClick={fetchAlerts}
            className="mt-2 text-xs text-white/50 hover:text-white underline"
          >
            Retry
          </button>
        </div>
      ) : !data || data.alerts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {data.alerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      )}
      
      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/30">
        <span>Last 7 days</span>
        {data?.source && (
          <span className="flex items-center gap-1">
            <span className={data.source === 'kv' ? 'text-emerald-400' : 'text-amber-400'}>●</span>
            {data.source === 'kv' ? 'Live data' : 'Cached'}
          </span>
        )}
      </div>
    </div>
  )
}
