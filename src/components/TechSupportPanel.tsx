'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from './Toast'

interface Procedure {
  id: string
  name: string
  category: 'core' | 'mod'
  status: 'ready' | 'running' | 'pending'
  lastRun?: string
}

interface Environment {
  name: string
  url: string
  status: 'online' | 'offline' | 'checking'
  lastDeploy?: string
}

interface TechStatus {
  procedures: Procedure[]
  environments: Environment[]
  currentTask?: {
    name: string
    progress: number
    startedAt: string
  }
  roadmap: {
    title: string
    status: 'done' | 'in_progress' | 'pending'
  }[]
}

export function TechSupportPanel() {
  const [status, setStatus] = useState<TechStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null)
  const { showToast } = useToast()

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/tech-support/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch {
      // Use demo data
      setStatus({
        procedures: [
          { id: 'SNAPSHOT', name: 'Backup Sito', category: 'core', status: 'ready' },
          { id: 'MODIFICA', name: 'Modifica Sito', category: 'core', status: 'ready' },
          { id: 'DEPLOY', name: 'Deploy', category: 'core', status: 'ready' },
          { id: 'ROLLBACK', name: 'Rollback', category: 'core', status: 'ready' },
          { id: 'MOD-001', name: 'Aggiungi Libro', category: 'mod', status: 'ready' },
          { id: 'MOD-002', name: 'Cambia Prezzo', category: 'mod', status: 'ready' }
        ],
        environments: [
          { name: 'TEST', url: 'localhost:8888', status: 'offline' },
          { name: 'PREPROD', url: 'onde.surf', status: 'online' },
          { name: 'PROD', url: 'onde.la', status: 'online' }
        ],
        roadmap: [
          { title: 'Dashboard HQ', status: 'in_progress' },
          { title: 'CORDE Integration', status: 'in_progress' },
          { title: 'Auto-posting X', status: 'done' },
          { title: 'PolyRoborto Link', status: 'done' },
          { title: 'Multi-language Support', status: 'pending' },
          { title: 'Analytics Dashboard', status: 'pending' }
        ]
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const checkEnvironment = useCallback((env: Environment) => {
    setSelectedEnv(env.name)
    showToast(`Checking ${env.name} environment...`, 'info')

    // Simulate check
    setTimeout(() => {
      setSelectedEnv(null)
      if (env.status === 'online') {
        showToast(`${env.name} is online`, 'success')
      } else {
        showToast(`${env.name} is offline`, 'warning')
      }
    }, 1500)
  }, [showToast])

  const readyProceduresCount = useMemo(() =>
    status?.procedures.filter(p => p.status === 'ready').length || 0,
    [status]
  )

  const coreProcedures = useMemo(() =>
    status?.procedures.filter(p => p.category === 'core') || [],
    [status]
  )

  return (
    <section aria-label="Tech Support Agent" className="bg-white/5 rounded-2xl p-6 border border-white/10 card-lift">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-white">Tech Support</h2>
          <span className="text-xs px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400">
            Agent
          </span>
        </div>
        {!loading && status && (
          <span className="text-xs text-white/40" aria-label={`${readyProceduresCount} procedures ready`}>
            {readyProceduresCount} procedure pronte
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-4" role="status" aria-label="Loading tech support status">
          <div className="skeleton-enhanced h-20 w-full" aria-hidden="true" />
          <div className="skeleton-enhanced h-16 w-full" aria-hidden="true" />
          <div className="skeleton-enhanced h-24 w-full" aria-hidden="true" />
          <span className="sr-only">Loading tech support data...</span>
        </div>
      ) : status && (
        <>
          {/* Current Task (if any) */}
          {status.currentTask && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-amber-400">{status.currentTask.name}</span>
                <span className="text-xs text-amber-400/60">{status.currentTask.progress}%</span>
              </div>
              <div className="h-1.5 bg-amber-500/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${status.currentTask.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Environments */}
          <div className="mb-6">
            <div className="text-sm text-white/60 mb-3">Ambienti</div>
            <div className="grid grid-cols-3 gap-2">
              {status.environments.map(env => (
                <button
                  key={env.name}
                  onClick={() => checkEnvironment(env)}
                  className={`p-3 rounded-xl border transition-all ${
                    selectedEnv === env.name
                      ? 'bg-cyan-500/20 border-cyan-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white">{env.name}</span>
                    <div className={`status-dot ${
                      env.status === 'online' ? 'status-dot-online' :
                      env.status === 'offline' ? 'status-dot-offline' :
                      'status-dot-warning'
                    }`} style={{ animation: selectedEnv === env.name ? 'none' : undefined }} />
                  </div>
                  <div className="text-xs text-white/40 truncate">{env.url}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Procedures */}
          <div className="mb-6" role="region" aria-label="Available procedures">
            <h3 className="text-sm text-white/60 mb-3">Procedure</h3>
            <div className="grid grid-cols-2 gap-2" role="list">
              {coreProcedures.map(proc => (
                <div
                  key={proc.id}
                  role="listitem"
                  className="p-2 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 hover:bg-white/10 transition-colors cursor-default"
                  aria-label={`${proc.name} - ${proc.status}`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      proc.status === 'ready' ? 'bg-emerald-400' :
                      proc.status === 'running' ? 'bg-amber-400 animate-pulse' :
                      'bg-white/30'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-white">{proc.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Roadmap */}
          <div className="border-t border-white/10 pt-4">
            <div className="text-sm text-white/60 mb-3">Roadmap</div>
            <div className="space-y-2">
              {status.roadmap.map((item, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <span className={`text-sm transition-transform group-hover:scale-110 ${
                    item.status === 'done' ? 'text-emerald-400' :
                    item.status === 'in_progress' ? 'text-amber-400' :
                    'text-white/30'
                  }`}>
                    {item.status === 'done' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : item.status === 'in_progress' ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="8" strokeWidth={2} />
                      </svg>
                    )}
                  </span>
                  <span className={`text-sm ${
                    item.status === 'done' ? 'text-white/60 line-through' :
                    item.status === 'in_progress' ? 'text-white' :
                    'text-white/40'
                  }`}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
