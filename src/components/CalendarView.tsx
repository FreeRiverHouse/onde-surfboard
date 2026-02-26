"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'

interface ScheduledTask {
  id: string
  name: string
  schedule: string
  cronExpr?: string
  category: 'trading' | 'monitoring' | 'maintenance' | 'content' | 'agent'
  emoji: string
  nextRun?: string
  lastRun?: string
  enabled: boolean
  agent?: string
  description?: string
}

interface HourSlot {
  hour: number
  label: string
  tasks: ScheduledTask[]
}

type ViewMode = 'timeline' | 'list'
type CategoryFilter = 'all' | 'trading' | 'monitoring' | 'maintenance' | 'content' | 'agent'

const categoryConfig: Record<string, { emoji: string; label: string; color: string; bgColor: string; borderColor: string }> = {
  trading: { emoji: '💰', label: 'Trading', color: 'text-amber-400', bgColor: 'bg-amber-400/10', borderColor: 'border-amber-400/20' },
  monitoring: { emoji: '📊', label: 'Monitoring', color: 'text-cyan-400', bgColor: 'bg-cyan-400/10', borderColor: 'border-cyan-400/20' },
  maintenance: { emoji: '🔧', label: 'Maintenance', color: 'text-violet-400', bgColor: 'bg-violet-400/10', borderColor: 'border-violet-400/20' },
  content: { emoji: '📝', label: 'Content', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10', borderColor: 'border-emerald-400/20' },
  agent: { emoji: '🤖', label: 'Agent', color: 'text-blue-400', bgColor: 'bg-blue-400/10', borderColor: 'border-blue-400/20' },
}

function getFrequencyMinutes(cronExpr?: string): number | null {
  if (!cronExpr) return null
  const parts = cronExpr.split(' ')
  const [minute, hour, dayOfMonth, , dayOfWeek] = parts

  if (minute.startsWith('*/')) return parseInt(minute.slice(2))
  if (hour === '*' && !minute.startsWith('*/')) return 60  // hourly
  if (hour !== '*' && dayOfWeek !== '*') return 60 * 24 * 7  // weekly
  if (hour !== '*' && dayOfMonth !== '*' && dayOfMonth !== '1') return 60 * 24 * 30 // monthly
  if (hour !== '*') return 60 * 24  // daily
  return null
}

function getTaskHours(task: ScheduledTask): number[] {
  if (!task.cronExpr) return []
  const parts = task.cronExpr.split(' ')
  const [minute, hour] = parts
  const hours: number[] = []

  // Every N minutes → runs every hour
  if (minute.startsWith('*/')) {
    for (let h = 0; h < 24; h++) hours.push(h)
    return hours
  }

  // Multiple hours (e.g., "0 17,5 * * *")
  if (hour.includes(',')) {
    return hour.split(',').map(h => parseInt(h))
  }

  // Every N hours (e.g., "0 */6 * * *")
  if (hour.startsWith('*/')) {
    const interval = parseInt(hour.slice(2))
    for (let h = 0; h < 24; h += interval) hours.push(h)
    return hours
  }

  // Specific hour
  if (hour !== '*') {
    return [parseInt(hour)]
  }

  // Wildcard hour → every hour
  for (let h = 0; h < 24; h++) hours.push(h)
  return hours
}

function formatHourShort(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`
}

function TaskPill({ task }: { task: ScheduledTask }) {
  const cat = categoryConfig[task.category] || categoryConfig.monitoring
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${cat.bgColor} ${cat.borderColor} border cursor-default transition-all hover:scale-105`}>
        <span>{task.emoji}</span>
        <span className={`${cat.color} truncate max-w-[120px]`}>{task.name}</span>
      </div>
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-1 w-56 p-3 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl text-xs">
          <div className="font-medium text-white mb-1 flex items-center gap-1.5">
            <span>{task.emoji}</span>
            {task.name}
          </div>
          {task.description && <p className="text-white/50 mb-2">{task.description}</p>}
          <div className="flex items-center gap-2 text-white/40">
            <span>⏱️ {task.schedule}</span>
          </div>
          {task.agent && (
            <div className="text-white/40 mt-1">👤 {task.agent}</div>
          )}
        </div>
      )}
    </div>
  )
}

function TimelineView({ tasks, filter }: { tasks: ScheduledTask[]; filter: CategoryFilter }) {
  const currentHour = new Date().getHours()

  const hourSlots: HourSlot[] = useMemo(() => {
    const slots: HourSlot[] = []
    for (let h = 0; h < 24; h++) {
      const tasksInHour = tasks.filter(t => {
        if (filter !== 'all' && t.category !== filter) return false
        const taskHours = getTaskHours(t)
        return taskHours.includes(h)
      })
      // Only show hours that have tasks, or always show current hour
      if (tasksInHour.length > 0 || h === currentHour) {
        slots.push({ hour: h, label: formatHourShort(h), tasks: tasksInHour })
      }
    }
    return slots
  }, [tasks, filter, currentHour])

  return (
    <div className="space-y-0">
      {hourSlots.map(slot => {
        const isCurrent = slot.hour === currentHour
        const isPast = slot.hour < currentHour

        return (
          <div
            key={slot.hour}
            className={`flex gap-3 py-2 px-3 border-l-2 transition-colors ${
              isCurrent
                ? 'border-l-cyan-400 bg-cyan-400/5'
                : isPast
                  ? 'border-l-white/5 opacity-50'
                  : 'border-l-white/10'
            }`}
          >
            {/* Time column */}
            <div className={`w-14 flex-shrink-0 text-xs font-mono ${isCurrent ? 'text-cyan-400 font-bold' : 'text-white/30'}`}>
              {slot.label}
              {isCurrent && <span className="block text-[10px] text-cyan-400/70">← now</span>}
            </div>

            {/* Tasks */}
            <div className="flex flex-wrap gap-1.5 min-h-[24px] items-center">
              {slot.tasks.length > 0 ? (
                slot.tasks.map(task => <TaskPill key={task.id} task={task} />)
              ) : (
                isCurrent && <span className="text-xs text-white/20 italic">No tasks this hour</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ListView({ tasks, filter }: { tasks: ScheduledTask[]; filter: CategoryFilter }) {
  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.category === filter)

  // Group by category
  const grouped = filtered.reduce<Record<string, ScheduledTask[]>>((acc, task) => {
    if (!acc[task.category]) acc[task.category] = []
    acc[task.category].push(task)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, catTasks]) => {
        const cat = categoryConfig[category] || categoryConfig.monitoring
        return (
          <div key={category}>
            <div className={`flex items-center gap-2 mb-2 text-xs font-medium ${cat.color}`}>
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              <span className="text-white/30 font-normal">({catTasks.length})</span>
            </div>
            <div className="space-y-1">
              {catTasks.map(task => {
                const freq = getFrequencyMinutes(task.cronExpr)
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${cat.bgColor} border ${cat.borderColor} hover:bg-white/[0.06] transition-colors`}
                  >
                    <span className="text-base">{task.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{task.name}</div>
                      {task.description && (
                        <div className="text-xs text-white/40 truncate">{task.description}</div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-xs ${cat.color}`}>{task.schedule}</div>
                      {freq && freq <= 60 && (
                        <div className="text-[10px] text-white/30">
                          {freq < 60 ? `${Math.floor(1440 / freq)}/day` : '24/day'}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface CalendarViewProps {
  className?: string
}

export function CalendarView({ className = '' }: CalendarViewProps) {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [filter, setFilter] = useState<CategoryFilter>('all')

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduled-tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching scheduled tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 60000)
    return () => clearInterval(interval)
  }, [fetchTasks])

  // Stats
  const stats = useMemo(() => {
    const enabledTasks = tasks.filter(t => t.enabled)
    const highFreq = enabledTasks.filter(t => {
      const freq = getFrequencyMinutes(t.cronExpr)
      return freq !== null && freq <= 5
    })
    const dailyRuns = enabledTasks.reduce((acc, t) => {
      const freq = getFrequencyMinutes(t.cronExpr)
      if (freq === null) return acc + 1
      return acc + Math.floor(1440 / freq)
    }, 0)

    return {
      total: enabledTasks.length,
      highFreq: highFreq.length,
      dailyRuns,
      categories: Object.keys(
        enabledTasks.reduce<Record<string, boolean>>((a, t) => { a[t.category] = true; return a }, {})
      ).length,
    }
  }, [tasks])

  if (isLoading) {
    return (
      <div className={`bg-white/5 rounded-xl border border-white/10 overflow-hidden ${className}`}>
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
          <span>📅</span>
          <span className="text-sm font-medium text-white">Schedule Calendar</span>
        </div>
        <div className="p-8 flex justify-center">
          <div className="w-5 h-5 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white/5 rounded-xl border border-white/10 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span className="text-sm font-medium text-white">Schedule Calendar</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-white/5 text-white/40 rounded-full border border-white/10">
              {stats.total} tasks • ~{stats.dailyRuns} runs/day
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-2.5 py-1 text-xs transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-cyan-400/20 text-cyan-400'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                ⏰ Timeline
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 text-xs transition-all ${
                  viewMode === 'list'
                    ? 'bg-cyan-400/20 text-cyan-400'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                📋 List
              </button>
            </div>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
              filter === 'all'
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-white/5 text-white/40 border border-white/5 hover:text-white/60'
            }`}
          >
            🌐 All ({stats.total})
          </button>
          {Object.entries(categoryConfig).map(([key, conf]) => {
            const count = tasks.filter(t => t.category === key).length
            if (count === 0) return null
            return (
              <button
                key={key}
                onClick={() => setFilter(key as CategoryFilter)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                  filter === key
                    ? `${conf.bgColor} ${conf.color} border ${conf.borderColor}`
                    : 'bg-white/5 text-white/40 border border-white/5 hover:text-white/60'
                }`}
              >
                {conf.emoji} {conf.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
        {viewMode === 'timeline' ? (
          <TimelineView tasks={tasks} filter={filter} />
        ) : (
          <div className="p-4">
            <ListView tasks={tasks} filter={filter} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-white/20">
          {stats.highFreq} high-freq (≤5min) • {stats.categories} categories
        </span>
        <button
          onClick={fetchTasks}
          className="text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
