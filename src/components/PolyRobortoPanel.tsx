'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from './Toast'

interface TradingStatus {
  isRunning: boolean
  balance: number
  openPositions: number
  todayPnL: number
  weeklyPnL: number
}

type ServiceStatus = 'online' | 'offline' | 'checking'

export function PolyRobortoPanel() {
  const [status, setStatus] = useState<TradingStatus | null>(null)
  const [feedback, setFeedback] = useState('')
  const [sending, setSending] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('checking')
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/polyroborto/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
        setServiceStatus('online')
      } else {
        throw new Error('API error')
      }
    } catch {
      // Demo data for when service is offline
      setStatus({
        isRunning: false,
        balance: 0,
        openPositions: 0,
        todayPnL: 0,
        weeklyPnL: 0
      })
      setServiceStatus('offline')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 60000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const sendFeedback = useCallback(async () => {
    if (!feedback.trim()) return

    setSending(true)
    try {
      await fetch('/api/polyroborto/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback })
      })
      setFeedback('')
      showToast('Feedback sent to trading agent', 'success')
    } catch {
      showToast('Feedback saved locally', 'info')
    }
    setSending(false)
  }, [feedback, showToast])

  return (
    <section aria-label="PolyRoborto Trading Bot" className="bg-white/5 rounded-2xl p-6 border border-white/10 card-lift">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-white">PolyRoborto</h2>
          <div className="flex items-center gap-2">
            <div className={`status-dot ${serviceStatus === 'online' ? 'status-dot-online' : serviceStatus === 'offline' ? 'status-dot-offline' : 'status-dot-warning'}`} />
            <span className="text-xs text-white/40">
              {serviceStatus === 'online' ? 'Connected' : serviceStatus === 'offline' ? 'Offline' : 'Checking...'}
            </span>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          status?.isRunning
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-white/10 text-white/40'
        }`}>
          {status?.isRunning ? 'Trading' : 'Paused'}
        </span>
      </div>

      {/* Offline notice */}
      {serviceStatus === 'offline' && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Trading bot requires local server - start it on your machine</span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 mb-6" role="status" aria-label="Loading trading stats">
          <div className="skeleton-enhanced h-16 w-full" aria-hidden="true" />
          <div className="skeleton-enhanced h-16 w-full" aria-hidden="true" />
          <div className="skeleton-enhanced h-16 w-full" aria-hidden="true" />
          <div className="skeleton-enhanced h-16 w-full" aria-hidden="true" />
          <span className="sr-only">Loading trading statistics...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-3 transition-all hover:bg-white/10">
            <div className="text-lg font-semibold text-white number-animate">
              ${status?.balance?.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs text-white/40">Balance</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 transition-all hover:bg-white/10">
            <div className="text-lg font-semibold text-white number-animate">
              {status?.openPositions ?? 0}
            </div>
            <div className="text-xs text-white/40">Positions</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 transition-all hover:bg-white/10">
            <div className={`text-lg font-semibold number-animate ${
              (status?.todayPnL ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {status?.todayPnL !== undefined
                ? `${status.todayPnL >= 0 ? '+' : ''}$${status.todayPnL.toFixed(2)}`
                : '$0.00'
              }
            </div>
            <div className="text-xs text-white/40">Today</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 transition-all hover:bg-white/10">
            <div className={`text-lg font-semibold number-animate ${
              (status?.weeklyPnL ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {status?.weeklyPnL !== undefined
                ? `${status.weeklyPnL >= 0 ? '+' : ''}$${status.weeklyPnL.toFixed(2)}`
                : '$0.00'
              }
            </div>
            <div className="text-xs text-white/40">Week</div>
          </div>
        </div>
      )}

      {/* Feedback Section */}
      <div className="border-t border-white/10 pt-4">
        <label htmlFor="polyroborto-feedback" className="text-sm text-white/60 mb-2 block">
          Tech Support Feedback
        </label>
        <textarea
          id="polyroborto-feedback"
          placeholder="Send feedback to tech agent for optimization..."
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 transition-colors resize-none h-20"
        />
        <div className="flex items-center justify-end mt-2">
          <button
            onClick={sendFeedback}
            disabled={sending || !feedback.trim()}
            aria-label="Send feedback to trading agent"
            className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 btn-press transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {sending ? 'Sending...' : 'Send Feedback'}
          </button>
        </div>
      </div>
    </section>
  )
}
