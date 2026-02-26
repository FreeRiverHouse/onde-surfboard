import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import {
  getAgentTaskByIdFromD1,
  claimAgentTaskInD1,
  startAgentTaskInD1,
  completeAgentTaskInD1,
  failAgentTaskInD1
} from '@/lib/agent-tasks'

export const runtime = 'edge'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/agent-tasks/[id] - Get task details
 */
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { env } = getRequestContext()
    const db = env.DB
    const { id } = await context.params

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const task = await getAgentTaskByIdFromD1(db, id)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      task
    })
  } catch (error) {
    console.error('Agent task GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

/**
 * PATCH /api/agent-tasks/[id] - Update task status
 *
 * Body:
 * - action: 'claim' | 'start' | 'complete' | 'fail' (required)
 * - agent_name?: string (required for 'claim')
 * - result?: string (required for 'complete')
 * - error?: string (required for 'fail')
 */
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { env } = getRequestContext()
    const db = env.DB
    const { id } = await context.params

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const body = await request.json()

    if (!body.action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      )
    }

    let success = false
    let message = ''

    switch (body.action) {
      case 'claim': {
        if (!body.agent_name) {
          return NextResponse.json(
            { error: 'agent_name is required for claim action' },
            { status: 400 }
          )
        }
        success = await claimAgentTaskInD1(db, id, body.agent_name)
        message = success ? `Task claimed by ${body.agent_name}` : 'Failed to claim task (may already be claimed or not exist)'
        break
      }

      case 'start': {
        success = await startAgentTaskInD1(db, id)
        message = success ? 'Task started' : 'Failed to start task (must be claimed first)'
        break
      }

      case 'complete': {
        if (!body.result) {
          return NextResponse.json(
            { error: 'result is required for complete action' },
            { status: 400 }
          )
        }
        success = await completeAgentTaskInD1(db, id, body.result)
        message = success ? 'Task completed' : 'Failed to complete task'
        break
      }

      case 'fail': {
        if (!body.error) {
          return NextResponse.json(
            { error: 'error is required for fail action' },
            { status: 400 }
          )
        }
        success = await failAgentTaskInD1(db, id, body.error)
        message = success ? 'Task marked as failed' : 'Failed to update task'
        break
      }

      default:
        return NextResponse.json(
          { error: `Invalid action. Must be one of: claim, start, complete, fail` },
          { status: 400 }
        )
    }

    if (!success) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // Fetch updated task
    const task = await getAgentTaskByIdFromD1(db, id)

    return NextResponse.json({
      success: true,
      message,
      task
    })
  } catch (error) {
    console.error('Agent task PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}
