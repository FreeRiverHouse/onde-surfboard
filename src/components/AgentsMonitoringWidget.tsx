"use client"

import { useState, useEffect } from 'react'
import { Bot, Cpu, Zap, Clock, CheckCircle2, AlertCircle, GitCommit, Loader2 } from 'lucide-react'

interface AgentInfo {
  host: string
  model: string
  status: 'active' | 'idle' | 'offline'
  current_task?: {
    id: string
    title: string
    started?: string
  }
  last_commit?: {
    hash: string
    message: string
    ago: string
  }
}

interface AgentsMonitoringWidgetProps {
  agents?: {
    clawdinho?: AgentInfo
    ondinho?: AgentInfo
  }
  git?: {
    clawdinho: { hash: string; message: string; ago: string } | null
    ondinho: { hash: string; message: string; ago: string } | null
    total_commits_today: number
  }
  loading?: boolean
}

// Status indicator with animation
function StatusBadge({ status }: { status: string }) {
  const configs = {
    active: { 
      bg: 'bg-green-100 dark:bg-green-900/30', 
      text: 'text-green-700 dark:text-green-400',
      dot: 'bg-green-500',
      pulse: true,
      label: 'Active'
    },
    idle: { 
      bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
      text: 'text-yellow-700 dark:text-yellow-400',
      dot: 'bg-yellow-500',
      pulse: false,
      label: 'Idle'
    },
    offline: { 
      bg: 'bg-gray-100 dark:bg-gray-700', 
      text: 'text-gray-600 dark:text-gray-400',
      dot: 'bg-gray-400',
      pulse: false,
      label: 'Offline'
    },
  }
  const config = configs[status as keyof typeof configs] || configs.offline
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
      </span>
      {config.label}
    </span>
  )
}

// Agent card component
function AgentCard({ 
  name, 
  emoji,
  agent, 
  commit 
}: { 
  name: string
  emoji: string
  agent?: AgentInfo
  commit?: { hash: string; message: string; ago: string } | null
}) {
  if (!agent) return null
  
  const isActive = agent.status === 'active'
  
  return (
    <div className={`
      relative p-4 rounded-xl border transition-all duration-300
      ${isActive 
        ? 'border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20' 
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }
    `}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`
            h-10 w-10 rounded-xl flex items-center justify-center text-lg
            ${isActive 
              ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
              : 'bg-gray-200 dark:bg-gray-700'
            }
          `}>
            {emoji}
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {agent.host}
            </div>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      
      {/* Model */}
      <div className="mb-3 flex items-center gap-2 text-sm">
        <Zap className="h-4 w-4 text-purple-500" />
        <span className="text-gray-600 dark:text-gray-300 font-mono text-xs">
          {agent.model}
        </span>
      </div>
      
      {/* Current Task (if any) */}
      {agent.current_task && (
        <div className="mb-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Working on</span>
          </div>
          <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
            [{agent.current_task.id}] {agent.current_task.title}
          </div>
        </div>
      )}
      
      {/* Last Commit */}
      {commit && (
        <div className="flex items-start gap-2 text-xs">
          <GitCommit className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-gray-500 dark:text-gray-400 truncate">
              {commit.message}
            </div>
            <div className="text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {commit.ago}
            </div>
          </div>
        </div>
      )}
      
      {/* No recent activity indicator */}
      {!commit && (
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <AlertCircle className="h-3 w-3" />
          No recent commits
        </div>
      )}
    </div>
  )
}

export function AgentsMonitoringWidget({ 
  agents, 
  git,
  loading 
}: AgentsMonitoringWidgetProps) {
  // Update time every minute for relative times (triggers re-render)
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])
  
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    )
  }
  
  const clawdinho = agents?.clawdinho
  const ondinho = agents?.ondinho
  
  // Count active agents
  const activeCount = [clawdinho, ondinho].filter(a => a?.status === 'active').length
  const totalCommits = git?.total_commits_today || 0
  
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-500" />
          Agent Monitoring
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {activeCount}/2 active
          </span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30">
            <GitCommit className="h-3 w-3 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
              {totalCommits} today
            </span>
          </div>
        </div>
      </div>
      
      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AgentCard 
          name="Clawdinho" 
          emoji="🤖"
          agent={clawdinho}
          commit={git?.clawdinho}
        />
        <AgentCard 
          name="Ondinho" 
          emoji="🌊"
          agent={ondinho}
          commit={git?.ondinho}
        />
      </div>
      
      {/* Quick Stats Bar */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Both on {git?.clawdinho?.hash ? 'same branch' : 'main'}</span>
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Auto-refresh every 60s
          </div>
        </div>
      </div>
    </div>
  )
}
