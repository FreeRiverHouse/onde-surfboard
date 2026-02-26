'use client'

export const runtime = 'edge'

import { useState, useEffect } from 'react'
import TaskManagementPanel from '@/components/TaskManagementPanel'
import { AgentsMonitoringWidget } from '@/components/AgentsMonitoringWidget'
import { SystemMonitoringWidget } from '@/components/SystemMonitoringWidget'

interface Agent {
  id: string
  name: string
  type: string
  description: string
  status: string
  last_seen: string | null
}

interface Task {
  id: string
  type: string
  description: string
  status: string
  assigned_to: string | null
  priority: string
  created_at: string
  result: string | null
}

// Agent status from Gist (push-agent-status-to-gist.py)
interface AgentStatusData {
  timestamp: string
  tasks: { total: number; done: number; in_progress: number; todo: number; completion_rate: number }
  memory: { entries_today: number; file_exists: boolean; size_bytes: number }
  git: { clawdinho: { hash: string; message: string; ago: string } | null; ondinho: { hash: string; message: string; ago: string } | null; total_commits_today: number }
  autotrader: { running: boolean; pid: string | null; circuit_breaker: boolean; consecutive_losses: number; uptime_hours?: number | null }
  gpu: { radeon_connected: boolean; type: string | null; vram_gb: number | null }
  ollama: { running: boolean; location: string; models: string[] }
  alerts_pending: number
  agents: {
    clawdinho: { host: string; model: string; status: string; current_task?: { id: string; title: string } | null }
    ondinho: { host: string; model: string; status: string; current_task?: { id: string; title: string } | null }
  }
}

export default function FRHDashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [agentStatus, setAgentStatus] = useState<AgentStatusData | null>(null)
  const [agentStatusLoading, setAgentStatusLoading] = useState(true)

  const fetchAgentStatus = async () => {
    try {
      const res = await fetch('/api/agents/status')
      if (res.ok) {
        const data = await res.json()
        setAgentStatus(data)
      }
    } catch (err) {
      console.error('Failed to fetch agent status:', err)
    } finally {
      setAgentStatusLoading(false)
    }
  }

  const fetchData = async () => {
    try {
      const headers = {
        'Authorization': 'Bearer onde-sync-2026',
        'Content-Type': 'application/json'
      }

      const [agentsRes, tasksRes] = await Promise.all([
        fetch('/api/sync', {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'get_agents' })
        }),
        fetch('/api/sync', {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'get_tasks' })
        })
      ])

      const agentsData = await agentsRes.json()
      const tasksData = await tasksRes.json()

      if (agentsData.success) setAgents(agentsData.agents)
      if (tasksData.success) setTasks(tasksData.tasks)

      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchAgentStatus()
    const dataInterval = setInterval(fetchData, 10000) // Refresh every 10s
    const statusInterval = setInterval(fetchAgentStatus, 60000) // Refresh agent status every 60s
    return () => {
      clearInterval(dataInterval)
      clearInterval(statusInterval)
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'done': return 'bg-blue-500'
      case 'claimed': return 'bg-yellow-500'
      case 'in_progress': return 'bg-orange-500'
      case 'pending': return 'bg-gray-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'orchestrator': return '👔'
      case 'engineering': return '⚙️'
      case 'qa': return '🧪'
      case 'automation': return '🤖'
      case 'editorial': return '✍️'
      case 'creative': return '🎨'
      case 'social': return '📱'
      default: return '🔧'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-600 text-white'
      case 'normal': return 'bg-gray-600 text-white'
      case 'low': return 'bg-gray-400 text-gray-800'
      default: return 'bg-gray-500 text-white'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading FRH Dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              🏠 FreeRiverHouse Dashboard
            </h1>
            <p className="text-purple-300 mt-1">Agent Coordination System</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">
              Last update: {lastUpdate?.toLocaleTimeString() || '-'}
            </div>
            <button
              onClick={fetchData}
              className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Real-Time Monitoring Widgets (T935 + T936) */}
      <div className="max-w-7xl mx-auto mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgentsMonitoringWidget 
          agents={agentStatus?.agents}
          git={agentStatus?.git}
          loading={agentStatusLoading}
        />
        <SystemMonitoringWidget 
          systemHealth={{
            cpu_percent: 15, // TODO: Add real CPU metrics
            memory_percent: 65, // TODO: Add real memory metrics
            gpu_temp: agentStatus?.gpu?.radeon_connected ? 45 : null
          }}
          autotrader={agentStatus?.autotrader}
          ollama={agentStatus?.ollama}
          gpu={agentStatus?.gpu}
          alerts_pending={agentStatus?.alerts_pending}
          loading={agentStatusLoading}
        />
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agents Section */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            🤖 Agents <span className="text-sm text-purple-400">({agents.length})</span>
          </h2>
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getAgentIcon(agent.type)}</span>
                    <div>
                      <div className="font-medium text-white">{agent.name}</div>
                      <div className="text-sm text-gray-400">{agent.description}</div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)} text-white`}>
                    {agent.status}
                  </div>
                </div>
                {agent.last_seen && (
                  <div className="mt-2 text-xs text-gray-500">
                    Last seen: {new Date(agent.last_seen).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tasks Section */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            📋 Tasks <span className="text-sm text-purple-400">({tasks.length})</span>
          </h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {tasks.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No tasks yet</div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{task.description}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        {task.assigned_to ? `→ ${task.assigned_to}` : 'Unassigned'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)} text-white`}>
                        {task.status}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${getPriorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  {task.result && (
                    <div className="mt-3 p-2 bg-green-900/30 rounded text-sm text-green-300 border border-green-800">
                      Result: {task.result}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(task.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="max-w-7xl mx-auto mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700">
          <div className="text-3xl font-bold text-green-400">{agents.filter(a => a.status === 'active').length}</div>
          <div className="text-sm text-gray-400">Active Agents</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700">
          <div className="text-3xl font-bold text-yellow-400">{tasks.filter(t => t.status === 'pending').length}</div>
          <div className="text-sm text-gray-400">Pending Tasks</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700">
          <div className="text-3xl font-bold text-orange-400">{tasks.filter(t => t.status === 'in_progress' || t.status === 'claimed').length}</div>
          <div className="text-sm text-gray-400">In Progress</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700">
          <div className="text-3xl font-bold text-blue-400">{tasks.filter(t => t.status === 'done').length}</div>
          <div className="text-sm text-gray-400">Completed</div>
        </div>
      </div>

      {/* TASKS.md Management Panel */}
      <div className="max-w-7xl mx-auto mt-6">
        <TaskManagementPanel />
      </div>
    </div>
  )
}
