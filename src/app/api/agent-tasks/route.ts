import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import {
  getAgentTasksFromD1,
  createAgentTaskInD1,
  getAgentTaskStatsFromD1,
  type TaskType,
  type TaskStatus,
  type TaskPriority,
  VALID_TASK_TYPES,
  VALID_TARGET_TYPES,
  VALID_PRIORITIES,
  VALID_SOURCE_DASHBOARDS
} from '@/lib/agent-tasks'

export const runtime = 'edge'

/**
 * GET /api/agent-tasks - List tasks with optional filters
 *
 * Query params:
 * - status: filter by status (can be comma-separated for multiple)
 * - assigned_to: filter by assigned agent
 * - type: filter by task type
 * - priority: filter by priority
 * - limit: max results (default 100)
 * - stats: if 'true', include statistics
 */
export async function GET(request: Request) {
  try {
    const { env } = getRequestContext()
    const db = env.DB

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const url = new URL(request.url)
    const statusParam = url.searchParams.get('status')
    const assignedTo = url.searchParams.get('assigned_to')
    const type = url.searchParams.get('type') as TaskType | null
    const priority = url.searchParams.get('priority') as TaskPriority | null
    const limitParam = url.searchParams.get('limit')
    const includeStats = url.searchParams.get('stats') === 'true'

    // Parse status (can be comma-separated)
    let status: TaskStatus | TaskStatus[] | undefined
    if (statusParam) {
      if (statusParam.includes(',')) {
        status = statusParam.split(',') as TaskStatus[]
      } else {
        status = statusParam as TaskStatus
      }
    }

    const filters = {
      status,
      assigned_to: assignedTo || undefined,
      type: type || undefined,
      priority: priority || undefined,
      limit: limitParam ? parseInt(limitParam, 10) : undefined
    }

    const tasks = await getAgentTasksFromD1(db, filters)

    const response: {
      success: boolean
      tasks: typeof tasks
      count: number
      stats?: Awaited<ReturnType<typeof getAgentTaskStatsFromD1>>
    } = {
      success: true,
      tasks,
      count: tasks.length
    }

    if (includeStats) {
      response.stats = await getAgentTaskStatsFromD1(db)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Agent tasks GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

/**
 * POST /api/agent-tasks - Create a new task
 *
 * Body:
 * - type: TaskType (required)
 * - description: string (required)
 * - target_id?: string
 * - target_type?: TaskTargetType
 * - priority?: TaskPriority (default: 'normal')
 * - assigned_to?: string (pre-assign to specific agent)
 * - created_by?: string (default: 'dashboard')
 */
export async function POST(request: Request) {
  try {
    const { env } = getRequestContext()
    const db = env.DB

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.type || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields: type and description are required' },
        { status: 400 }
      )
    }

    // Validate type
    if (!VALID_TASK_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TASK_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate target_type if provided
    if (body.target_type && !VALID_TARGET_TYPES.includes(body.target_type)) {
      return NextResponse.json(
        { error: `Invalid target_type. Must be one of: ${VALID_TARGET_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate priority if provided
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate source_dashboard if provided
    if (body.source_dashboard && !VALID_SOURCE_DASHBOARDS.includes(body.source_dashboard)) {
      return NextResponse.json(
        { error: `Invalid source_dashboard. Must be one of: ${VALID_SOURCE_DASHBOARDS.join(', ')}` },
        { status: 400 }
      )
    }

    const task = await createAgentTaskInD1(db, {
      type: body.type,
      description: body.description,
      target_id: body.target_id,
      target_type: body.target_type,
      payload: body.payload ? JSON.stringify(body.payload) : undefined,
      priority: body.priority || 'normal',
      assigned_to: body.assigned_to,
      source_agent: body.source_agent,
      source_dashboard: body.source_dashboard,
      due_at: body.due_at,
      metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
      created_by: body.created_by || 'dashboard'
    })

    if (!task) {
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      task
    })
  } catch (error) {
    console.error('Agent tasks POST error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
