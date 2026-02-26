'use client'

export const runtime = 'edge'


import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import SystemAlertsFeedWidget from '@/components/SystemAlertsFeedWidget'
import UptimeHistoryChart from '@/components/UptimeHistoryChart'

// Uptime history data URL (internal API)
const UPTIME_HISTORY_URL = '/api/uptime'

interface ServiceHealth {
  name: string
  url: string
  status: 'healthy' | 'degraded' | 'down' | 'checking'
  latency?: number
  lastCheck: string
  details?: Record<string, unknown>
  error?: string
}

interface HealthData {
  overall: 'healthy' | 'degraded' | 'down'
  timestamp: string
  services: ServiceHealth[]
  checks: {
    total: number
    healthy: number
    degraded: number
    down: number
  }
}

const STATUS_CONFIG = {
  healthy: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
    icon: '✓',
    label: 'Healthy'
  },
  degraded: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    icon: '⚠',
    label: 'Degraded'
  },
  down: {
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/20',
    icon: '✕',
    label: 'Down'
  },
  checking: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20',
    icon: '◌',
    label: 'Checking...'
  }
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  const config = STATUS_CONFIG[service.status]
  
  return (
    <div className={`
      relative p-6 rounded-2xl border backdrop-blur-xl
      ${config.bg} ${config.border}
      hover:scale-[1.02] transition-all duration-300
      group
    `}>
      {/* Glow effect */}
      <div className={`
        absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
        transition-opacity duration-300 blur-xl -z-10
        ${config.bg}
      `} />
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {service.name}
          </h3>
          <a 
            href={service.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-white/50 hover:text-white/70 transition-colors"
          >
            {service.url.replace('https://', '')}
          </a>
        </div>
        
        {/* Status Badge */}
        <div className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full
          ${config.bg} ${config.border} border
        `}>
          <span className={`text-lg ${service.status === 'checking' ? 'animate-spin' : ''}`}>
            {config.icon}
          </span>
          <span className={`text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-xs text-white/40 mb-1">Latency</div>
          <div className="text-xl font-mono text-white">
            {service.latency ? `${service.latency}ms` : '—'}
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-xs text-white/40 mb-1">Status Code</div>
          <div className="text-xl font-mono text-white">
            {service.details?.statusCode || '—'}
          </div>
        </div>
      </div>
      
      {/* Error message if any */}
      {service.error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="text-xs text-red-400/70 mb-1">Error</div>
          <div className="text-sm text-red-300 font-mono truncate">
            {service.error}
          </div>
        </div>
      )}
      
      {/* Last check */}
      <div className="mt-4 text-xs text-white/30">
        Last checked: {new Date(service.lastCheck).toLocaleTimeString()}
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function StorageCard({ 
  label, 
  icon, 
  getSize, 
  getCount 
}: { 
  label: string
  icon: string
  getSize: () => number
  getCount: () => number
}) {
  const [size, setSize] = useState(0)
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    try {
      setSize(getSize())
      setCount(getCount())
    } catch {
      // Storage may not be available
    }
  }, [getSize, getCount])
  
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-white/60">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-xl font-mono text-white">{formatBytes(size * 2)}</div>
        <div className="text-xs text-white/40">{count} items</div>
      </div>
    </div>
  )
}

function OverallStatus({ data }: { data: HealthData | null }) {
  const status = data?.overall || 'checking'
  const config = STATUS_CONFIG[status]
  
  return (
    <div className={`
      relative p-8 rounded-3xl border backdrop-blur-xl mb-8
      ${config.bg} ${config.border}
      overflow-hidden
    `}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className={`
          absolute -top-1/2 -left-1/2 w-full h-full
          bg-gradient-radial from-current to-transparent
          ${config.color} animate-pulse
        `} style={{ animationDuration: '3s' }} />
      </div>
      
      <div className="relative flex items-center justify-between">
        <div>
          <div className="text-sm text-white/50 mb-2 uppercase tracking-wider">
            System Status
          </div>
          <div className={`text-4xl font-bold ${config.color} flex items-center gap-4`}>
            <span className={`text-5xl ${status === 'checking' ? 'animate-spin' : 'animate-pulse'}`}>
              {config.icon}
            </span>
            {config.label}
          </div>
          {data && (
            <div className="mt-4 text-sm text-white/40">
              {data.checks.healthy}/{data.checks.total} services operational
            </div>
          )}
        </div>
        
        {/* Quick stats */}
        {data && (
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">
                {data.checks.healthy}
              </div>
              <div className="text-xs text-white/40 mt-1">Healthy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-400">
                {data.checks.degraded}
              </div>
              <div className="text-xs text-white/40 mt-1">Degraded</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">
                {data.checks.down}
              </div>
              <div className="text-xs text-white/40 mt-1">Down</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Hook to manage alert sounds (T741)
function useAlertSound() {
  const [enabled, setEnabled] = useState(false)
  const [muted, setMuted] = useState(false)
  const audioContextRef = { current: null as AudioContext | null }
  
  useEffect(() => {
    // Load preference from localStorage
    if (typeof window !== 'undefined') {
      const savedPref = localStorage.getItem('healthSoundEnabled')
      setEnabled(savedPref === 'true')
      const savedMuted = localStorage.getItem('healthSoundMuted')
      setMuted(savedMuted === 'true')
    }
  }, [])
  
  const toggleEnabled = (value: boolean) => {
    setEnabled(value)
    localStorage.setItem('healthSoundEnabled', value ? 'true' : 'false')
  }
  
  const toggleMuted = (value: boolean) => {
    setMuted(value)
    localStorage.setItem('healthSoundMuted', value ? 'true' : 'false')
  }
  
  const playAlertTone = useCallback((type: 'warning' | 'critical' = 'critical') => {
    if (!enabled || muted) return
    
    try {
      // Create audio context on demand (browser requires user interaction first)
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      const ctx = audioContextRef.current
      
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume()
      }
      
      // Create oscillator for alert tone
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      // Different tones for warning vs critical
      if (type === 'critical') {
        // Critical: Two-tone siren effect (like an emergency alert)
        oscillator.type = 'square'
        oscillator.frequency.setValueAtTime(880, ctx.currentTime) // A5
        oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.2) // E5
        oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.4) // A5
        oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.6) // E5
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.8)
      } else {
        // Warning: Single softer beep
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(523, ctx.currentTime) // C5
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.3)
      }
    } catch (e) {
      console.warn('Failed to play alert sound:', e)
    }
  }, [enabled, muted])
  
  return { enabled, muted, toggleEnabled, toggleMuted, playAlertTone }
}

// Hook to manage browser notifications
function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [enabled, setEnabled] = useState(false)
  
  useEffect(() => {
    // Check if notifications are supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
      // Load preference from localStorage
      const savedPref = localStorage.getItem('healthNotificationsEnabled')
      if (savedPref === 'true' && Notification.permission === 'granted') {
        setEnabled(true)
      }
    }
  }, [])
  
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return false
    }
    
    const result = await Notification.requestPermission()
    setPermission(result)
    
    if (result === 'granted') {
      setEnabled(true)
      localStorage.setItem('healthNotificationsEnabled', 'true')
      return true
    }
    return false
  }
  
  const toggleEnabled = (value: boolean) => {
    setEnabled(value)
    localStorage.setItem('healthNotificationsEnabled', value ? 'true' : 'false')
  }
  
  const notify = (title: string, options?: NotificationOptions) => {
    if (enabled && permission === 'granted') {
      try {
        const notification = new Notification(title, {
          icon: '/icon.svg',
          badge: '/icon.svg',
          ...options
        })
        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000)
        return notification
      } catch (e) {
        console.warn('Failed to show notification:', e)
      }
    }
    return null
  }
  
  return { permission, enabled, requestPermission, toggleEnabled, notify }
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [previousStatus, setPreviousStatus] = useState<string | null>(null)
  const [uptimeHistory, setUptimeHistory] = useState<any>(null)
  
  const { permission, enabled: notificationsEnabled, requestPermission, toggleEnabled, notify } = useNotifications()
  const { enabled: soundEnabled, toggleEnabled: toggleSoundEnabled, playAlertTone } = useAlertSound()
  
  // Load autoRefresh preference from localStorage
  useEffect(() => {
    const savedAutoRefresh = localStorage.getItem('healthAutoRefresh')
    if (savedAutoRefresh !== null) {
      setAutoRefresh(savedAutoRefresh === 'true')
    }
  }, [])

  // Fetch uptime history [T817]
  useEffect(() => {
    const fetchUptimeHistory = async () => {
      try {
        const res = await fetch(UPTIME_HISTORY_URL)
        if (res.ok) {
          const json = await res.json()
          setUptimeHistory(json)
        }
      } catch (err) {
        console.error('Failed to fetch uptime history:', err)
      }
    }
    fetchUptimeHistory()
    // Refresh every 5 minutes
    const interval = setInterval(fetchUptimeHistory, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])
  
  // Check for status changes and notify
  useEffect(() => {
    if (!data || !previousStatus) return
    
    const currentStatus = data.overall
    if (currentStatus !== previousStatus) {
      // Status changed - send notification
      const statusEmoji = {
        healthy: '✅',
        degraded: '⚠️',
        down: '🚨'
      }[currentStatus] || '📊'
      
      const statusLabel = STATUS_CONFIG[currentStatus]?.label || currentStatus
      const prevLabel = STATUS_CONFIG[previousStatus as keyof typeof STATUS_CONFIG]?.label || previousStatus
      
      notify(`${statusEmoji} System Status Changed`, {
        body: `Status changed from ${prevLabel} to ${statusLabel}\n${data.checks.healthy}/${data.checks.total} services operational`,
        tag: 'health-status-change', // Prevents duplicate notifications
        requireInteraction: currentStatus === 'down' // Keep down notifications visible
      })
      
      // Play alert sound on status transition TO degraded/down (T741)
      if (currentStatus === 'down') {
        playAlertTone('critical')
      } else if (currentStatus === 'degraded' && previousStatus === 'healthy') {
        playAlertTone('warning')
      }
    }
  }, [data, previousStatus, notify, playAlertTone])
  
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' })
      const json = await res.json()
      
      // Store previous status before updating
      if (data?.overall) {
        setPreviousStatus(data.overall)
      }
      
      setData(json)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch health data:', error)
    } finally {
      setLoading(false)
    }
  }, [data?.overall])
  
  useEffect(() => {
    fetchHealth()
    
    // Auto-refresh every 30 seconds if enabled
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000)
      return () => clearInterval(interval)
    }
  }, [fetchHealth, autoRefresh])
  
  // Keyboard shortcut: R to refresh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) {
        setLoading(true)
        fetchHealth()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fetchHealth])
  
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <Link 
              href="/"
              className="text-white/50 hover:text-white transition-colors text-sm mb-2 block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              System Health
            </h1>
            <p className="text-white/50 mt-2">
              Real-time monitoring of production services
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Notifications toggle */}
            <button
              onClick={async () => {
                if (permission !== 'granted') {
                  await requestPermission()
                } else {
                  toggleEnabled(!notificationsEnabled)
                }
              }}
              className={`
                px-4 py-2 rounded-xl border transition-all flex items-center gap-2
                ${notificationsEnabled && permission === 'granted'
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' 
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}
              `}
              title={
                permission === 'denied' 
                  ? 'Notifications blocked - enable in browser settings' 
                  : permission === 'granted' 
                    ? (notificationsEnabled ? 'Click to disable notifications' : 'Click to enable notifications')
                    : 'Click to enable browser notifications'
              }
            >
              <span className="text-lg">
                {permission === 'denied' ? '🔕' : notificationsEnabled ? '🔔' : '🔕'}
              </span>
              <span className="hidden sm:inline">
                {permission === 'denied' 
                  ? 'Blocked' 
                  : notificationsEnabled 
                    ? 'Alerts ON' 
                    : 'Alerts OFF'}
              </span>
            </button>
            
            {/* Sound toggle (T741) */}
            <button
              onClick={() => toggleSoundEnabled(!soundEnabled)}
              className={`
                px-4 py-2 rounded-xl border transition-all flex items-center gap-2
                ${soundEnabled
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' 
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}
              `}
              title={soundEnabled ? 'Click to disable alert sounds' : 'Click to enable alert sounds'}
            >
              <span className="text-lg">{soundEnabled ? '🔊' : '🔇'}</span>
              <span className="hidden sm:inline">
                {soundEnabled ? 'Sound ON' : 'Sound OFF'}
              </span>
            </button>
            
            {/* Auto-refresh toggle */}
            <button
              onClick={() => {
                const newValue = !autoRefresh
                setAutoRefresh(newValue)
                localStorage.setItem('healthAutoRefresh', newValue ? 'true' : 'false')
              }}
              className={`
                px-4 py-2 rounded-xl border transition-all
                ${autoRefresh 
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                  : 'bg-white/5 border-white/10 text-white/50'}
              `}
            >
              {autoRefresh ? '⟳ Auto-refresh ON' : '⟳ Auto-refresh OFF'}
            </button>
            
            {/* Manual refresh with keyboard hint */}
            <button
              onClick={() => {
                setLoading(true)
                fetchHealth()
              }}
              disabled={loading}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-all disabled:opacity-50 flex items-center gap-2"
              title="Press R to refresh"
            >
              {loading ? 'Checking...' : 'Refresh Now'}
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-xs bg-white/10 rounded border border-white/20">R</kbd>
            </button>
          </div>
        </div>
        
        {/* Overall Status */}
        <OverallStatus data={data} />
        
        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading && !data ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, i) => (
              <div 
                key={i}
                className="p-6 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
              >
                <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
                <div className="h-4 bg-white/10 rounded w-1/2 mb-6" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-16 bg-white/10 rounded-xl" />
                  <div className="h-16 bg-white/10 rounded-xl" />
                </div>
              </div>
            ))
          ) : data?.services.map((service, i) => (
            <ServiceCard key={i} service={service} />
          ))}
        </div>
        
        {/* System Alerts Feed */}
        <div className="mt-8">
          <SystemAlertsFeedWidget />
        </div>

        {/* Uptime History [T817] */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            📊 Uptime History
          </h2>
          <UptimeHistoryChart data={uptimeHistory} />
        </div>

        {/* Browser Storage Section */}
        <div className="mt-8 p-6 rounded-2xl border border-white/10 bg-white/5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            💾 Browser Storage
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StorageCard 
              label="LocalStorage" 
              icon="📦"
              getSize={() => {
                let size = 0
                for (const key in localStorage) {
                  if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
                    size += localStorage.getItem(key)?.length || 0
                  }
                }
                return size
              }}
              getCount={() => Object.keys(localStorage).length}
            />
            <StorageCard 
              label="SessionStorage" 
              icon="⏱️"
              getSize={() => {
                let size = 0
                for (const key in sessionStorage) {
                  if (Object.prototype.hasOwnProperty.call(sessionStorage, key)) {
                    size += sessionStorage.getItem(key)?.length || 0
                  }
                }
                return size
              }}
              getCount={() => Object.keys(sessionStorage).length}
            />
            <StorageCard 
              label="Cookies" 
              icon="🍪"
              getSize={() => document.cookie.length}
              getCount={() => document.cookie ? document.cookie.split(';').length : 0}
            />
          </div>
        </div>

        {/* Timezone Info Section */}
        <div className="mt-8 p-4 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-white/40 text-sm">⏰ Cron Timezone</div>
              <div className="text-emerald-400 font-mono text-sm font-bold">UTC</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-white/40 text-sm">🌍 Your Timezone</div>
              <div className="text-white font-mono text-sm">
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-white/40 text-sm">🕐 UTC Now</div>
              <div className="text-cyan-400 font-mono text-sm">
                {new Date().toISOString().slice(11, 19)} UTC
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-white/40 text-sm">📍 Local Time</div>
              <div className="text-white font-mono text-sm">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-white/30 text-sm">
          {lastUpdate && (
            <p>Last updated: {lastUpdate.toLocaleString()}</p>
          )}
          <p className="mt-2">
            Health checks run every 30 seconds 
            {notificationsEnabled && ' • 🔔 Alerts enabled'}
            {' • Powered by Onde.surf'}
          </p>
        </div>
      </div>
    </div>
  )
}
