'use client'

export const runtime = 'edge'

import { useState, useEffect, useCallback } from 'react'
import { ActivityFeed } from '@/components/ActivityFeed'
import { CalendarView } from '@/components/CalendarView'
import { GlobalSearch } from '@/components/GlobalSearch'

// ── Types matching the /api/agents/status response ──────────────────

interface TaskStats {
  total: number
  done: number
  in_progress: number
  todo: number
  completion_rate: number
}

interface GitCommit {
  hash: string
  message: string
  date?: string
  ago: string
}

interface AgentInfo {
  host: string
  model: string
  status: 'active' | 'idle' | 'offline'
  current_task?: { id: string; title: string } | null
}

interface AgentStatusResponse {
  timestamp: string
  tasks: TaskStats
  memory: { entries_today: number; file_exists: boolean; size_bytes: number }
  git: { clawdinho: GitCommit | null; ondinho: GitCommit | null; total_commits_today: number }
  autotrader: { running: boolean; pid: string | null; circuit_breaker: boolean }
  gpu: { radeon_connected: boolean; type?: string | null; vram_gb?: number | null }
  ollama: { running: boolean; location: string | null; models: string[] }
  alerts_pending: number
  agents: { clawdinho: AgentInfo; ondinho: AgentInfo }
  _note?: string
}

// ── UI types ──────────────────────────────────────────────────────────

interface AgentCardData {
  name: string
  emoji: string
  status: 'active' | 'idle' | 'offline'
  host: string
  model: string
  lastAction?: string
  lastActionTime?: string
  tasksCompleted: number
  currentTask?: string
}

// ── Components ────────────────────────────────────────────────────────

function StatCard({ label, value, emoji }: { label: string; value: number | string; emoji: string }) {
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
        <span>{emoji}</span>
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  )
}

function StatusPill({ running, label }: { running: boolean; label: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
      running
        ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
        : 'bg-white/5 text-white/30 border border-white/10'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-emerald-400' : 'bg-white/20'}`} />
      {label}
    </div>
  )
}

function AgentCard({ agent }: { agent: AgentCardData }) {
  const statusColors = {
    active: 'bg-emerald-400',
    idle: 'bg-amber-400',
    offline: 'bg-red-400',
  }

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl">{agent.emoji}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{agent.name}</span>
            <span className={`w-2 h-2 rounded-full ${statusColors[agent.status]} ${agent.status === 'active' ? 'animate-pulse' : ''}`} />
          </div>
          <span className="text-xs text-white/40 capitalize">{agent.status} • {agent.host}</span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-white">{agent.tasksCompleted}</div>
          <div className="text-xs text-white/40">tasks</div>
        </div>
      </div>
      <div className="text-[10px] text-white/25 mb-2 font-mono">{agent.model}</div>
      {agent.currentTask && (
        <div className="text-xs text-cyan-400/80 bg-cyan-400/5 border border-cyan-400/10 rounded-lg px-3 py-1.5 truncate">
          🔨 {agent.currentTask}
        </div>
      )}
      {agent.lastAction && (
        <div className="text-xs text-white/30 mt-2 truncate">
          Last: {agent.lastAction} {agent.lastActionTime && `• ${agent.lastActionTime}`}
        </div>
      )}
    </div>
  )
}

type FilterType = 'all' | 'agent' | 'content' | 'infra'

const filterCategories: Record<FilterType, string[]> = {
  all: [],
  agent: ['agent_action', 'task_completed', 'task_started', 'heartbeat', 'memory_update', 'cron_job'],
  content: ['post_approved', 'post_rejected', 'post_created', 'post_posted', 'image_generated', 'book_updated', 'translation'],
  infra: ['deploy', 'git_commit', 'monitor', 'error', 'alert', 'game_tested'],
}

// ── Main page ─────────────────────────────────────────────────────────

export default function MissionControlPage() {
  const [data, setData] = useState<AgentStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/status')
      if (res.ok) {
        const json: AgentStatusResponse = await res.json()
        setData(json)
        setLastRefresh(new Date())
      }
    } catch {
      // fetch failed silently — keep previous data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 60_000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  // ── Derive agent cards from API data ──
  const agents: AgentCardData[] = data
    ? Object.entries(data.agents).map(([key, info]) => {
        const git = data.git[key as keyof typeof data.git]
        const gitCommit = typeof git === 'object' && git !== null && 'message' in git ? git as GitCommit : null
        return {
          name: key === 'clawdinho' ? 'Clawdinho' : 'Ondinho',
          emoji: key === 'clawdinho' ? '🐾' : '🌊',
          status: info.status,
          host: info.host,
          model: info.model,
          tasksCompleted: data.tasks.done, // shared task count
          currentTask: info.current_task?.title ?? undefined,
          lastAction: gitCommit?.message ?? undefined,
          lastActionTime: gitCommit?.ago ?? undefined,
        }
      })
    : []

  const tasks = data?.tasks ?? { total: 0, done: 0, in_progress: 0, todo: 0, completion_rate: 0 }
  const activeAgents = agents.filter(a => a.status === 'active').length

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-3xl">🎛️</span>
              Mission Control
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Free River House Agent Operations Center
              {lastRefresh && (
                <span className="ml-2 text-white/20">
                  • updated {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <GlobalSearch />
            <a
              href="/house"
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              ← Dashboard
            </a>
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-400/10 border border-emerald-400/20 rounded-lg">
              <span className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
              <span className={`text-xs ${loading ? 'text-amber-400' : 'text-emerald-400'}`}>
                {loading ? 'Connecting…' : 'Systems Online'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard emoji="📋" label="Total Tasks" value={tasks.total} />
          <StatCard emoji="✅" label="Done" value={tasks.done} />
          <StatCard emoji="📈" label="Completion" value={`${tasks.completion_rate}%`} />
          <StatCard emoji="🤖" label="Active Agents" value={activeAgents} />
          <StatCard emoji="🔀" label="Commits Today" value={data?.git.total_commits_today ?? 0} />
          <StatCard emoji="🧠" label="Memory Entries" value={data?.memory.entries_today ?? 0} />
        </div>

        {/* Infrastructure Status Row */}
        <div className="flex flex-wrap gap-3 mb-8">
          <StatusPill running={data?.autotrader.running ?? false} label={`Autotrader${data?.autotrader.circuit_breaker ? ' ⚠️ CB' : ''}`} />
          <StatusPill running={data?.gpu.radeon_connected ?? false} label={`GPU${data?.gpu.radeon_connected ? ' (Radeon 7900 XTX)' : ''}`} />
          <StatusPill running={data?.ollama.running ?? false} label={`Ollama${data?.ollama.running ? ` (${data.ollama.location})` : ''}`} />
          {data?.ollama.running && data.ollama.models.length > 0 && (
            <span className="text-[10px] text-white/20 self-center font-mono">
              models: {data.ollama.models.join(', ')}
            </span>
          )}
          {(data?.alerts_pending ?? 0) > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-red-400/10 text-red-400 border border-red-400/20">
              🚨 {data?.alerts_pending} alert{data!.alerts_pending > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Agents */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🤖</span> Agents
          </h2>
          {agents.length === 0 && loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="bg-white/5 rounded-xl border border-white/10 p-4 animate-pulse h-32" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map(agent => (
                <AgentCard key={agent.name} agent={agent} />
              ))}
            </div>
          )}
        </div>

        {/* Calendar + Activity Feed - Side by Side on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Calendar View */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>📅</span> Scheduled Operations
            </h2>
            <CalendarView className="bg-white/[0.02]" />
          </div>

          {/* Activity Feed */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>⚡</span> Activity Timeline
              </h2>
            <div className="flex gap-2">
              {(Object.keys(filterCategories) as FilterType[]).map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    activeFilter === filter
                      ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30'
                      : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'
                  }`}
                >
                  {filter === 'all' && '🌐 All'}
                  {filter === 'agent' && '🤖 Agents'}
                  {filter === 'content' && '📝 Content'}
                  {filter === 'infra' && '🔧 Infra'}
                </button>
              ))}
            </div>
          </div>
          <ActivityFeed
            maxItems={20}
            showHeader={false}
            className="bg-white/[0.02]"
          />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-white/20 text-xs py-4">
          Mission Control v2.0 • Free River House • {new Date().toLocaleDateString()}
          {data?.timestamp && ` • API: ${new Date(data.timestamp).toLocaleTimeString()}`}
        </div>
      </div>
    </div>
  )
}
