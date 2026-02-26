'use client'

import { useState, useEffect } from 'react'
import { GlowCard } from './ui/GlowCard'
import { LastUpdatedIndicator } from './LastUpdatedIndicator'

interface TestResult {
  name: string
  category: string
  passed: boolean
  details: string
  duration_ms: number
  timestamp: string
}

interface TestReport {
  timestamp: string
  run_type: string
  tests: TestResult[]
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
  }
  alerts: string[]
  error?: string
}

const categoryIcons: Record<string, string> = {
  http: '🌐',
  ssl: '🔒',
  auth: '🔐',
  performance: '⚡',
  content: '📝',
  api: '🔌',
}

const categoryColors: Record<string, string> = {
  http: 'text-blue-400',
  ssl: 'text-green-400',
  auth: 'text-purple-400',
  performance: 'text-yellow-400',
  content: 'text-cyan-400',
  api: 'text-orange-400',
}

export function TestStatusPanel() {
  const [report, setReport] = useState<TestReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetchReport()
    // Refresh every 5 minutes
    const interval = setInterval(fetchReport, 300000)
    return () => clearInterval(interval)
  }, [])

  async function fetchReport() {
    try {
      const res = await fetch('/api/test-status')
      const data = await res.json()
      setReport(data)
    } catch (error) {
      console.error('Failed to fetch test status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <GlowCard glowColor="cyan">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <span className="text-xl">🧪</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Test Status</h2>
              <p className="text-sm text-white/50">Loading...</p>
            </div>
          </div>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-1/2" />
          </div>
        </div>
      </GlowCard>
    )
  }

  if (!report || report.error) {
    return (
      <GlowCard glowColor="yellow">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <span className="text-xl">⚠️</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Test Status</h2>
              <p className="text-sm text-yellow-400">{report?.error || 'No data available'}</p>
            </div>
          </div>
        </div>
      </GlowCard>
    )
  }

  const allPassed = report.summary.failed === 0
  const passRate = report.summary.total > 0 
    ? Math.round((report.summary.passed / report.summary.total) * 100)
    : 0

  return (
    <GlowCard glowColor={allPassed ? 'green' : 'red'}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              allPassed ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              <span className="text-xl">{allPassed ? '✅' : '❌'}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Test Status</h2>
              <p className="text-sm text-white/50">Daily automated tests</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${allPassed ? 'text-green-400' : 'text-red-400'}`}>
              {passRate}%
            </div>
            <div className="text-xs text-white/40">{report.summary.passed}/{report.summary.total} passed</div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-white">{report.summary.total}</div>
            <div className="text-xs text-white/40">Total</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-green-400">{report.summary.passed}</div>
            <div className="text-xs text-white/40">Passed</div>
          </div>
          <div className={`rounded-lg p-3 text-center ${report.summary.failed > 0 ? 'bg-red-500/10' : 'bg-white/5'}`}>
            <div className={`text-lg font-semibold ${report.summary.failed > 0 ? 'text-red-400' : 'text-white/30'}`}>
              {report.summary.failed}
            </div>
            <div className="text-xs text-white/40">Failed</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-white/30">{report.summary.skipped}</div>
            <div className="text-xs text-white/40">Skipped</div>
          </div>
        </div>

        {/* Last Run - using shared time utilities */}
        <div className="flex items-center justify-between text-sm mb-4">
          <span className="text-white/40">Last run:</span>
          <LastUpdatedIndicator 
            lastUpdated={report.timestamp}
            thresholdSeconds={3600} // 1 hour threshold for test reports
            compact={true}
            onRequestRefresh={fetchReport}
          />
        </div>

        {/* Alerts */}
        {report.alerts.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <div className="text-sm font-medium text-red-400 mb-2">⚠️ Alerts</div>
            {report.alerts.map((alert, i) => (
              <div key={i} className="text-sm text-red-300/80">{alert}</div>
            ))}
          </div>
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-sm text-white/50 hover:text-white/70 transition-colors flex items-center justify-center gap-2"
        >
          {expanded ? '▲ Hide details' : '▼ Show all tests'}
        </button>

        {/* Expanded Test List */}
        {expanded && (
          <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
            {report.tests.map((test, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  test.passed ? 'bg-white/5' : 'bg-red-500/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={categoryColors[test.category] || 'text-white/60'}>
                    {categoryIcons[test.category] || '•'}
                  </span>
                  <span className="text-sm text-white/80">{test.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40">{test.duration_ms}ms</span>
                  <span className={test.passed ? 'text-green-400' : 'text-red-400'}>
                    {test.passed ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlowCard>
  )
}

// Using shared time utilities from LastUpdatedIndicator component
