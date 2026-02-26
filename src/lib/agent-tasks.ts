// Agent Tasks management for task queue system
// Uses Cloudflare D1 for persistent storage
// Supports multi-agent coordination between onde.surf and FreeRiverFlow

// Extended task types for all agents
export type TaskType =
  // Social/PR tasks (OndePR)
  | 'post_feedback' | 'post_edit' | 'post_create' | 'post_approve' | 'post_schedule'
  // Book/Editorial tasks (Gianni, Pina)
  | 'book_edit' | 'book_create' | 'book_review' | 'book_translate'
  // Image tasks (Pina)
  | 'image_generate' | 'image_edit' | 'image_upscale'
  // Content tasks (general)
  | 'content_create' | 'content_review' | 'content_translate'
  // Engineering tasks
  | 'code_review' | 'code_fix' | 'code_deploy' | 'code_test'
  // QA tasks
  | 'qa_test' | 'qa_report' | 'qa_validate'
  // Automation tasks
  | 'automation_run' | 'automation_schedule' | 'automation_monitor'
  // General agent tasks
  | 'agent_message' | 'agent_request' | 'agent_response'

export type TaskTargetType = 'post' | 'book' | 'image' | 'code' | 'test' | 'deployment' | 'message' | 'general'
export type TaskStatus = 'pending' | 'claimed' | 'in_progress' | 'done' | 'failed' | 'cancelled'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type SourceDashboard = 'onde.surf' | 'freeriverflow' | 'telegram' | 'cli'

export interface AgentTask {
  id: string
  type: TaskType
  target_id?: string
  target_type?: TaskTargetType
  description: string
  payload?: string  // JSON payload for task-specific data
  status: TaskStatus
  assigned_to?: string
  source_agent?: string  // Agent that created the task
  source_dashboard?: SourceDashboard
  priority: TaskPriority
  created_by: string
  created_at: string
  claimed_at?: string
  started_at?: string
  completed_at?: string
  due_at?: string  // Optional deadline
  result?: string
  error?: string
  metadata?: string  // JSON for additional data
}

export interface Agent {
  id: string
  name: string
  type: 'social' | 'editorial' | 'engineering' | 'qa' | 'automation' | 'orchestrator' | 'creative' | 'ai'
  description?: string
  capabilities?: string  // JSON array of task types
  status: 'active' | 'paused' | 'offline'
  last_seen?: string
  created_at: string
  // Gamification fields
  xp?: number
  level?: number
  total_tasks_done?: number
  current_streak?: number
  longest_streak?: number
  badges?: string  // JSON array of badge IDs
  last_task_at?: string
}

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[]
  assigned_to?: string
  source_agent?: string
  source_dashboard?: SourceDashboard
  type?: TaskType
  priority?: TaskPriority
  limit?: number
}

// Valid task types for API validation
export const VALID_TASK_TYPES: TaskType[] = [
  'post_feedback', 'post_edit', 'post_create', 'post_approve', 'post_schedule',
  'book_edit', 'book_create', 'book_review', 'book_translate',
  'image_generate', 'image_edit', 'image_upscale',
  'content_create', 'content_review', 'content_translate',
  'code_review', 'code_fix', 'code_deploy', 'code_test',
  'qa_test', 'qa_report', 'qa_validate',
  'automation_run', 'automation_schedule', 'automation_monitor',
  'agent_message', 'agent_request', 'agent_response'
]

export const VALID_TARGET_TYPES: TaskTargetType[] = ['post', 'book', 'image', 'code', 'test', 'deployment', 'message', 'general']
export const VALID_PRIORITIES: TaskPriority[] = ['low', 'normal', 'high', 'urgent']
export const VALID_SOURCE_DASHBOARDS: SourceDashboard[] = ['onde.surf', 'freeriverflow', 'telegram', 'cli']

// Type for D1 database binding
type D1Database = {
  prepare: (query: string) => D1PreparedStatement
  batch: <T = unknown>(statements: D1PreparedStatement[]) => Promise<D1Result<T>[]>
  exec: (query: string) => Promise<D1ExecResult>
}

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement
  first: <T = unknown>(colName?: string) => Promise<T | null>
  run: <T = unknown>() => Promise<D1Result<T>>
  all: <T = unknown>() => Promise<D1Result<T>>
}

type D1Result<T> = {
  results: T[]
  success: boolean
  meta: Record<string, unknown>
}

type D1ExecResult = {
  count: number
  duration: number
}

// === Database Functions ===

/**
 * Get agent tasks with optional filters
 */
export async function getAgentTasksFromD1(
  db: D1Database,
  filters: TaskFilters = {}
): Promise<AgentTask[]> {
  try {
    let query = 'SELECT * FROM agent_tasks WHERE 1=1'
    const params: unknown[] = []

    // Status filter (can be single or array)
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        const placeholders = filters.status.map(() => '?').join(', ')
        query += ` AND status IN (${placeholders})`
        params.push(...filters.status)
      } else {
        query += ' AND status = ?'
        params.push(filters.status)
      }
    }

    // Assigned to filter
    if (filters.assigned_to) {
      query += ' AND assigned_to = ?'
      params.push(filters.assigned_to)
    }

    // Type filter
    if (filters.type) {
      query += ' AND type = ?'
      params.push(filters.type)
    }

    // Priority filter
    if (filters.priority) {
      query += ' AND priority = ?'
      params.push(filters.priority)
    }

    // Order by priority (urgent first) then by created_at
    query += ` ORDER BY
      CASE priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
      END,
      created_at DESC`

    // Limit
    if (filters.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
    } else {
      query += ' LIMIT 100'
    }

    let stmt = db.prepare(query)
    if (params.length > 0) {
      stmt = stmt.bind(...params)
    }

    const result = await stmt.all<AgentTask>()
    return result.results
  } catch (error) {
    console.error('D1 getAgentTasks error:', error)
    return []
  }
}

/**
 * Get a single task by ID
 */
export async function getAgentTaskByIdFromD1(
  db: D1Database,
  id: string
): Promise<AgentTask | null> {
  try {
    const result = await db.prepare(
      'SELECT * FROM agent_tasks WHERE id = ?'
    ).bind(id).first<AgentTask>()

    return result
  } catch (error) {
    console.error('D1 getAgentTaskById error:', error)
    return null
  }
}

/**
 * Create a new agent task
 */
export async function createAgentTaskInD1(
  db: D1Database,
  task: Omit<AgentTask, 'id' | 'created_at' | 'status'> & { status?: TaskStatus }
): Promise<AgentTask | null> {
  try {
    const newTask: AgentTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: task.status || 'pending',
      created_at: new Date().toISOString()
    }

    await db.prepare(
      `INSERT INTO agent_tasks (
        id, type, target_id, target_type, description, payload, status,
        assigned_to, source_agent, source_dashboard, priority, created_by,
        created_at, due_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newTask.id,
      newTask.type,
      newTask.target_id || null,
      newTask.target_type || null,
      newTask.description,
      newTask.payload || null,
      newTask.status,
      newTask.assigned_to || null,
      newTask.source_agent || null,
      newTask.source_dashboard || null,
      newTask.priority || 'normal',
      newTask.created_by || 'dashboard',
      newTask.created_at,
      newTask.due_at || null,
      newTask.metadata || null
    ).run()

    // Log activity (non-critical - don't fail if logging fails)
    try {
      await db.prepare(
        'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)'
      ).bind(
        0, // System user
        'task_created',
        JSON.stringify({
          task_id: newTask.id,
          task_type: newTask.type,
          description: newTask.description.substring(0, 100),
          priority: newTask.priority,
          source_dashboard: newTask.source_dashboard
        })
      ).run()
    } catch (logError) {
      console.warn('Failed to log activity:', logError)
    }

    return newTask
  } catch (error) {
    console.error('D1 createAgentTask error:', error)
    return null
  }
}

/**
 * Claim a task for an agent
 */
export async function claimAgentTaskInD1(
  db: D1Database,
  id: string,
  agentName: string
): Promise<boolean> {
  try {
    const result = await db.prepare(
      `UPDATE agent_tasks
       SET status = 'claimed', assigned_to = ?, claimed_at = ?
       WHERE id = ? AND status = 'pending'`
    ).bind(agentName, new Date().toISOString(), id).run()

    if (result.success) {
      // Log activity (non-critical)
      try {
        await db.prepare(
          'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)'
        ).bind(0, 'task_claimed', JSON.stringify({ task_id: id, agent: agentName })).run()
      } catch { /* ignore */ }
    }

    return result.success
  } catch (error) {
    console.error('D1 claimAgentTask error:', error)
    return false
  }
}

/**
 * Start working on a task (move from claimed to in_progress)
 */
export async function startAgentTaskInD1(
  db: D1Database,
  id: string
): Promise<boolean> {
  try {
    const result = await db.prepare(
      `UPDATE agent_tasks
       SET status = 'in_progress'
       WHERE id = ? AND status = 'claimed'`
    ).bind(id).run()

    return result.success
  } catch (error) {
    console.error('D1 startAgentTask error:', error)
    return false
  }
}

/**
 * Award XP to an agent and update their stats
 */
export async function awardAgentXPInD1(
  db: D1Database,
  agentId: string,
  xpAmount: number = 10
): Promise<boolean> {
  try {
    const now = new Date().toISOString()
    const today = now.split('T')[0]
    
    // Get current agent stats to calculate streak
    const agent = await db.prepare(
      'SELECT xp, level, total_tasks_done, current_streak, longest_streak, last_task_at, badges FROM agents WHERE id = ?'
    ).bind(agentId).first<{
      xp: number | null
      level: number | null
      total_tasks_done: number | null
      current_streak: number | null
      longest_streak: number | null
      last_task_at: string | null
      badges: string | null
    }>()

    if (!agent) return false

    const currentXP = agent.xp || 0
    const currentTasksDone = agent.total_tasks_done || 0
    let currentStreak = agent.current_streak || 0
    let longestStreak = agent.longest_streak || 0
    const lastTaskAt = agent.last_task_at
    let badges: string[] = []
    try {
      badges = agent.badges ? JSON.parse(agent.badges) : []
    } catch { badges = [] }

    // Calculate streak
    if (lastTaskAt) {
      const lastTaskDay = lastTaskAt.split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      
      if (lastTaskDay === today) {
        // Same day - keep streak
      } else if (lastTaskDay === yesterday) {
        // Consecutive day - increment streak
        currentStreak++
      } else {
        // Streak broken - reset to 1
        currentStreak = 1
      }
    } else {
      currentStreak = 1
    }
    
    // Update longest streak
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak
    }

    // Calculate new XP and level
    const newXP = currentXP + xpAmount
    const newLevel = Math.floor(newXP / 100) + 1
    const newTasksDone = currentTasksDone + 1

    // Check for new badges
    const newBadges = [...badges]
    
    // Task count badges
    if (newTasksDone >= 1 && !badges.includes('first-task')) newBadges.push('first-task')
    if (newTasksDone >= 10 && !badges.includes('task-10')) newBadges.push('task-10')
    if (newTasksDone >= 50 && !badges.includes('task-50')) newBadges.push('task-50')
    if (newTasksDone >= 100 && !badges.includes('task-100')) newBadges.push('task-100')
    if (newTasksDone >= 500 && !badges.includes('task-500')) newBadges.push('task-500')
    
    // Level badges
    if (newLevel >= 5 && !badges.includes('level-5')) newBadges.push('level-5')
    if (newLevel >= 10 && !badges.includes('level-10')) newBadges.push('level-10')
    if (newLevel >= 25 && !badges.includes('level-25')) newBadges.push('level-25')
    
    // Streak badges
    if (currentStreak >= 7 && !badges.includes('streak-7')) newBadges.push('streak-7')
    if (currentStreak >= 30 && !badges.includes('streak-30')) newBadges.push('streak-30')
    
    // Time-based badges
    const hour = new Date().getHours()
    if (hour >= 0 && hour < 5 && !badges.includes('night-owl')) newBadges.push('night-owl')
    if (hour >= 0 && hour < 6 && !badges.includes('early-bird')) newBadges.push('early-bird')

    // Update agent with new XP and stats
    const result = await db.prepare(
      `UPDATE agents 
       SET xp = ?, level = ?, total_tasks_done = ?, current_streak = ?, longest_streak = ?, 
           badges = ?, last_task_at = ?
       WHERE id = ?`
    ).bind(
      newXP,
      newLevel,
      newTasksDone,
      currentStreak,
      longestStreak,
      JSON.stringify(newBadges),
      now,
      agentId
    ).run()

    return result.success
  } catch (error) {
    console.error('D1 awardAgentXP error:', error)
    return false
  }
}

/**
 * Complete a task with result
 */
export async function completeAgentTaskInD1(
  db: D1Database,
  id: string,
  result: string
): Promise<boolean> {
  try {
    // Get task info for logging and XP award
    const task = await getAgentTaskByIdFromD1(db, id)

    const updateResult = await db.prepare(
      `UPDATE agent_tasks
       SET status = 'done', completed_at = ?, result = ?
       WHERE id = ? AND status IN ('claimed', 'in_progress')`
    ).bind(new Date().toISOString(), result, id).run()

    if (updateResult.success && task) {
      // Award XP to the agent who completed the task
      if (task.assigned_to) {
        await awardAgentXPInD1(db, task.assigned_to, 10)
      }

      // Log activity (non-critical)
      try {
        await db.prepare(
          'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)'
        ).bind(0, 'task_completed', JSON.stringify({ task_id: id, task_type: task.type, agent: task.assigned_to })).run()
      } catch { /* ignore */ }
    }

    return updateResult.success
  } catch (error) {
    console.error('D1 completeAgentTask error:', error)
    return false
  }
}

/**
 * Fail a task with error message
 */
export async function failAgentTaskInD1(
  db: D1Database,
  id: string,
  errorMessage: string
): Promise<boolean> {
  try {
    // Get task info for logging
    const task = await getAgentTaskByIdFromD1(db, id)

    const result = await db.prepare(
      `UPDATE agent_tasks
       SET status = 'failed', completed_at = ?, error = ?
       WHERE id = ? AND status IN ('pending', 'claimed', 'in_progress')`
    ).bind(new Date().toISOString(), errorMessage, id).run()

    if (result.success && task) {
      // Log activity - using correct schema (user_id, action, details)
      try {
        await db.prepare(
          'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)'
        ).bind(
          0,
          'task_failed',
          JSON.stringify({ task_id: id, type: task.type, error: errorMessage, assigned_to: task.assigned_to })
        ).run()
      } catch {
        // Ignore activity log errors
      }
    }

    return result.success
  } catch (error) {
    console.error('D1 failAgentTask error:', error)
    return false
  }
}

/**
 * Get task statistics
 */
export async function getAgentTaskStatsFromD1(db: D1Database): Promise<{
  total: number
  pending: number
  in_progress: number
  done: number
  failed: number
}> {
  try {
    const result = await db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status IN ('claimed', 'in_progress') THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM agent_tasks
    `).first<{
      total: number
      pending: number
      in_progress: number
      done: number
      failed: number
    }>()

    return result || { total: 0, pending: 0, in_progress: 0, done: 0, failed: 0 }
  } catch (error) {
    console.error('D1 getAgentTaskStats error:', error)
    return { total: 0, pending: 0, in_progress: 0, done: 0, failed: 0 }
  }
}

/**
 * Get next available task for an agent to claim
 * Returns highest priority pending task
 */
export async function getNextAvailableTaskFromD1(
  db: D1Database,
  agentName?: string,
  taskType?: TaskType
): Promise<AgentTask | null> {
  try {
    let query = `
      SELECT * FROM agent_tasks
      WHERE status = 'pending'
    `
    const params: unknown[] = []

    if (taskType) {
      query += ' AND type = ?'
      params.push(taskType)
    }

    query += `
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        created_at ASC
      LIMIT 1
    `

    let stmt = db.prepare(query)
    if (params.length > 0) {
      stmt = stmt.bind(...params)
    }

    return await stmt.first<AgentTask>()
  } catch (error) {
    console.error('D1 getNextAvailableTask error:', error)
    return null
  }
}

// === Agent Registry Functions ===

/**
 * Get all registered agents
 */
export async function getAgentsFromD1(db: D1Database): Promise<Agent[]> {
  try {
    const result = await db.prepare('SELECT * FROM agents ORDER BY name').all<Agent>()
    return result.results
  } catch (error) {
    console.error('D1 getAgents error:', error)
    return []
  }
}

/**
 * Get agent by ID
 */
export async function getAgentByIdFromD1(db: D1Database, id: string): Promise<Agent | null> {
  try {
    return await db.prepare('SELECT * FROM agents WHERE id = ?').bind(id).first<Agent>()
  } catch (error) {
    console.error('D1 getAgentById error:', error)
    return null
  }
}

/**
 * Update agent last seen timestamp (heartbeat)
 */
export async function updateAgentHeartbeatInD1(db: D1Database, agentId: string): Promise<boolean> {
  try {
    const result = await db.prepare(
      'UPDATE agents SET last_seen = ?, status = ? WHERE id = ?'
    ).bind(new Date().toISOString(), 'active', agentId).run()
    return result.success
  } catch (error) {
    console.error('D1 updateAgentHeartbeat error:', error)
    return false
  }
}

/**
 * Register or update an agent
 */
export async function registerAgentInD1(
  db: D1Database,
  agent: Omit<Agent, 'created_at'> & { created_at?: string }
): Promise<Agent | null> {
  try {
    const now = new Date().toISOString()
    const agentData = {
      ...agent,
      created_at: agent.created_at || now,
      last_seen: now
    }

    await db.prepare(
      `INSERT INTO agents (id, name, type, description, capabilities, status, last_seen, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         type = excluded.type,
         description = excluded.description,
         capabilities = excluded.capabilities,
         status = excluded.status,
         last_seen = excluded.last_seen`
    ).bind(
      agentData.id,
      agentData.name,
      agentData.type,
      agentData.description || null,
      agentData.capabilities || null,
      agentData.status || 'active',
      agentData.last_seen,
      agentData.created_at
    ).run()

    return agentData as Agent
  } catch (error) {
    console.error('D1 registerAgent error:', error)
    return null
  }
}

/**
 * Get tasks assigned to a specific agent
 */
export async function getAgentTasksByAssigneeFromD1(
  db: D1Database,
  agentId: string,
  statusFilter?: TaskStatus | TaskStatus[]
): Promise<AgentTask[]> {
  try {
    let query = 'SELECT * FROM agent_tasks WHERE assigned_to = ?'
    const params: unknown[] = [agentId]

    if (statusFilter) {
      if (Array.isArray(statusFilter)) {
        const placeholders = statusFilter.map(() => '?').join(', ')
        query += ` AND status IN (${placeholders})`
        params.push(...statusFilter)
      } else {
        query += ' AND status = ?'
        params.push(statusFilter)
      }
    }

    query += ' ORDER BY created_at DESC LIMIT 50'

    const result = await db.prepare(query).bind(...params).all<AgentTask>()
    return result.results
  } catch (error) {
    console.error('D1 getAgentTasksByAssignee error:', error)
    return []
  }
}

/**
 * Cancel a task
 */
export async function cancelAgentTaskInD1(db: D1Database, id: string): Promise<boolean> {
  try {
    const result = await db.prepare(
      `UPDATE agent_tasks
       SET status = 'cancelled', completed_at = ?
       WHERE id = ? AND status IN ('pending', 'claimed')`
    ).bind(new Date().toISOString(), id).run()
    return result.success
  } catch (error) {
    console.error('D1 cancelAgentTask error:', error)
    return false
  }
}
