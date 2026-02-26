'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from './Toast'

type TaskType = 'post_feedback' | 'post_edit' | 'book_edit' | 'image_generate' | 'content_create'
type TaskStatus = 'pending' | 'claimed' | 'in_progress' | 'done' | 'failed'
type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

interface AgentTask {
  id: string
  type: TaskType
  target_id?: string
  target_type?: string
  description: string
  status: TaskStatus
  assigned_to?: string
  priority: TaskPriority
  created_by: string
  created_at: string
  claimed_at?: string
  completed_at?: string
  result?: string
  error?: string
}

interface TaskStats {
  total: number
  pending: number
  in_progress: number
  done: number
  failed: number
}

const taskTypeConfig: Record<TaskType, { label: string; icon: JSX.Element; color: string }> = {
  post_feedback: {
    label: 'Post Feedback',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    color: 'text-blue-400'
  },
  post_edit: {
    label: 'Edit Post',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    color: 'text-amber-400'
  },
  book_edit: {
    label: 'Edit Book',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    color: 'text-purple-400'
  },
  image_generate: {
    label: 'Generate Image',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: 'text-pink-400'
  },
  content_create: {
    label: 'Create Content',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'text-cyan-400'
  }
}

const statusConfig: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-white/60', bg: 'bg-white/10' },
  claimed: { label: 'Claimed', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  in_progress: { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  done: { label: 'Done', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-400/10' }
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: 'text-white/40', bg: 'bg-white/5' },
  normal: { label: 'Normal', color: 'text-white/60', bg: 'bg-white/10' },
  high: { label: 'High', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  urgent: { label: 'Urgent', color: 'text-red-400', bg: 'bg-red-400/10' }
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function AgentTasksPanel() {
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active')
  const { showToast } = useToast()

  // Form state
  const [newTaskType, setNewTaskType] = useState<TaskType>('content_create')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('normal')
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchTasks = useCallback(async () => {
    try {
      let statusParam = ''
      if (statusFilter === 'active') {
        statusParam = 'status=pending,claimed,in_progress'
      } else if (statusFilter === 'completed') {
        statusParam = 'status=done,failed'
      }

      const res = await fetch(`/api/agent-tasks?${statusParam}&stats=true&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [fetchTasks])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskDescription.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/agent-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newTaskType,
          description: newTaskDescription,
          priority: newTaskPriority,
          assigned_to: newTaskAssignedTo || undefined,
          created_by: 'dashboard'
        })
      })

      if (res.ok) {
        showToast('Task created successfully', 'success')
        setNewTaskDescription('')
        setNewTaskPriority('normal')
        setNewTaskAssignedTo('')
        setShowCreateForm(false)
        fetchTasks()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to create task', 'error')
      }
    } catch {
      showToast('Failed to create task', 'error')
    } finally {
      setCreating(false)
    }
  }

  const activeCount = useMemo(() => (stats?.pending || 0) + (stats?.in_progress || 0), [stats])

  return (
    <section
      aria-label="Agent Tasks"
      className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h2 className="text-sm font-medium text-white">Agent Tasks</h2>
          </div>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-cyan-400/20 text-cyan-400 rounded-full">
              {activeCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex bg-white/5 rounded-lg p-0.5">
            {(['active', 'completed', 'all'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2 py-1 text-xs rounded-md transition-all ${
                  statusFilter === filter
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {/* Create button */}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 text-xs font-medium rounded-lg hover:bg-cyan-500/30 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 flex items-center gap-4 text-xs">
          <span className="text-white/40">
            Total: <span className="text-white/60">{stats.total}</span>
          </span>
          <span className="text-white/40">
            Pending: <span className="text-amber-400">{stats.pending}</span>
          </span>
          <span className="text-white/40">
            In Progress: <span className="text-blue-400">{stats.in_progress}</span>
          </span>
          <span className="text-white/40">
            Done: <span className="text-emerald-400">{stats.done}</span>
          </span>
          {stats.failed > 0 && (
            <span className="text-white/40">
              Failed: <span className="text-red-400">{stats.failed}</span>
            </span>
          )}
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <form onSubmit={handleCreateTask} className="p-4 bg-white/[0.02] border-b border-white/10">
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Task type */}
            <div>
              <label className="block text-xs text-white/40 mb-1">Task Type</label>
              <select
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value as TaskType)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
              >
                {Object.entries(taskTypeConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs text-white/40 mb-1">Priority</label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
              >
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="mb-3">
            <label className="block text-xs text-white/40 mb-1">Description</label>
            <textarea
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              placeholder="Describe the task for the agent..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 resize-none"
            />
          </div>

          {/* Assign to (optional) */}
          <div className="mb-3">
            <label className="block text-xs text-white/40 mb-1">Assign to (optional)</label>
            <input
              type="text"
              value={newTaskAssignedTo}
              onChange={(e) => setNewTaskAssignedTo(e.target.value)}
              placeholder="Agent name (e.g., gianni-parola, pina-pennello)"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTaskDescription.trim() || creating}
              className="px-4 py-2 bg-cyan-500/20 text-cyan-400 text-sm font-medium rounded-lg hover:bg-cyan-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Create Task
            </button>
          </div>
        </form>
      )}

      {/* Tasks list */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="p-4 flex justify-center">
            <div className="w-5 h-5 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-white/40 text-sm">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            No {statusFilter === 'all' ? '' : statusFilter} tasks
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tasks.map((task) => {
              const typeConfig = taskTypeConfig[task.type] || taskTypeConfig.content_create
              const status = statusConfig[task.status] || statusConfig.pending
              const priority = priorityConfig[task.priority] || priorityConfig.normal

              return (
                <div
                  key={task.id}
                  className="px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Type icon */}
                    <div className={`p-1.5 rounded-lg bg-white/5 ${typeConfig.color}`}>
                      {typeConfig.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-white font-medium truncate">
                          {task.description}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status badge */}
                        <span className={`px-1.5 py-0.5 text-xs rounded ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>

                        {/* Priority badge (only if not normal) */}
                        {task.priority !== 'normal' && (
                          <span className={`px-1.5 py-0.5 text-xs rounded ${priority.bg} ${priority.color}`}>
                            {priority.label}
                          </span>
                        )}

                        {/* Type */}
                        <span className="text-xs text-white/30">
                          {typeConfig.label}
                        </span>

                        {/* Assigned to */}
                        {task.assigned_to && (
                          <span className="text-xs text-white/30 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-white/30" />
                            {task.assigned_to}
                          </span>
                        )}

                        {/* Time */}
                        <span className="text-xs text-white/20">
                          {formatTimeAgo(task.created_at)}
                        </span>
                      </div>

                      {/* Result or error */}
                      {task.result && (
                        <p className="mt-1.5 text-xs text-emerald-400/80 truncate">
                          Result: {task.result}
                        </p>
                      )}
                      {task.error && (
                        <p className="mt-1.5 text-xs text-red-400/80 truncate">
                          Error: {task.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Refresh button */}
      <div className="px-4 py-2 border-t border-white/5">
        <button
          onClick={fetchTasks}
          className="text-xs text-white/40 hover:text-white/60 transition-colors w-full text-center"
        >
          Refresh tasks
        </button>
      </div>
    </section>
  )
}
