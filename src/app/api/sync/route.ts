import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { addPostToD1, getAllPostsFromD1, markPostAsPostedInD1, approvePostInD1, rejectPostInD1 } from '@/lib/posts'
import {
  getAgentTasksFromD1,
  getNextAvailableTaskFromD1,
  claimAgentTaskInD1,
  startAgentTaskInD1,
  completeAgentTaskInD1,
  failAgentTaskInD1,
  createAgentTaskInD1,
  getAgentsFromD1,
  registerAgentInD1,
  updateAgentHeartbeatInD1,
  type TaskType,
  type TaskStatus,
  type SourceDashboard
} from '@/lib/agent-tasks'

export const runtime = 'edge'

// Secret key for sync API (should match in telegram bot)
const SYNC_SECRET = process.env.SYNC_SECRET || 'onde-sync-2026'

// Verify the sync request
function verifyRequest(request: Request): boolean {
  const authHeader = request.headers.get('Authorization')
  return authHeader === `Bearer ${SYNC_SECRET}`
}

/**
 * GET /api/sync - Get all posts from D1
 * Used by Telegram bot to sync pending posts
 */
export async function GET(request: Request) {
  if (!verifyRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { env } = getRequestContext()
    const db = env.DB

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const posts = await getAllPostsFromD1(db)

    return NextResponse.json({
      success: true,
      posts,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Sync GET error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

/**
 * POST /api/sync - Add or update posts from external source
 * Used by Telegram bot or agents to push new posts
 */
export async function POST(request: Request) {
  if (!verifyRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { env } = getRequestContext()
    const db = env.DB

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const body = await request.json()

    // Handle different sync actions
    switch (body.action) {
      case 'add_post': {
        const newPost = await addPostToD1(db, {
          account: body.account,
          content: body.content,
          status: body.status || 'pending',
          scheduled_for: body.scheduled_for,
          media_files: body.media_files,
          source: body.source || 'telegram'
        })

        return NextResponse.json({
          success: true,
          post: newPost
        })
      }

      case 'mark_posted': {
        const success = await markPostAsPostedInD1(db, body.post_id, body.post_url)

        return NextResponse.json({
          success,
          message: success ? 'Post marked as posted' : 'Failed to update post'
        })
      }

      case 'batch_sync': {
        // Sync multiple posts at once
        const results = []
        for (const post of body.posts) {
          const newPost = await addPostToD1(db, {
            account: post.account,
            content: post.content || post.text,
            status: post.status || 'pending',
            scheduled_for: post.scheduled_for,
            media_files: post.media_files || post.mediaFiles,
            source: post.source || 'telegram'
          })
          results.push(newPost)
        }

        return NextResponse.json({
          success: true,
          synced: results.length,
          posts: results
        })
      }

      case 'approve_post': {
        if (!body.post_id) {
          return NextResponse.json(
            { error: 'post_id is required' },
            { status: 400 }
          )
        }

        const success = await approvePostInD1(db, body.post_id)

        return NextResponse.json({
          success,
          message: success ? 'Post approved' : 'Failed to approve post'
        })
      }

      case 'reject_post': {
        if (!body.post_id) {
          return NextResponse.json(
            { error: 'post_id is required' },
            { status: 400 }
          )
        }

        const success = await rejectPostInD1(db, body.post_id)

        return NextResponse.json({
          success,
          message: success ? 'Post rejected' : 'Failed to reject post'
        })
      }

      // === Agent Task Actions ===

      case 'get_tasks': {
        // Agent requests available tasks
        // Optional filters: status, type, assigned_to
        const filters: {
          status?: TaskStatus | TaskStatus[]
          type?: TaskType
          assigned_to?: string
          limit?: number
        } = {}

        if (body.status) {
          filters.status = body.status
        } else {
          // Default: show pending and claimed tasks
          filters.status = ['pending', 'claimed', 'in_progress']
        }

        if (body.type) filters.type = body.type
        if (body.assigned_to) filters.assigned_to = body.assigned_to
        if (body.limit) filters.limit = body.limit

        const tasks = await getAgentTasksFromD1(db, filters)

        return NextResponse.json({
          success: true,
          tasks,
          count: tasks.length
        })
      }

      case 'get_next_task': {
        // Agent requests the next available task to work on
        const task = await getNextAvailableTaskFromD1(
          db,
          body.agent_name,
          body.type
        )

        return NextResponse.json({
          success: true,
          task
        })
      }

      case 'claim_task': {
        // Agent claims a specific task
        if (!body.task_id || !body.agent_name) {
          return NextResponse.json(
            { error: 'task_id and agent_name are required' },
            { status: 400 }
          )
        }

        const success = await claimAgentTaskInD1(db, body.task_id, body.agent_name)

        return NextResponse.json({
          success,
          message: success ? 'Task claimed' : 'Failed to claim task (may already be claimed)'
        })
      }

      case 'start_task': {
        // Agent starts working on a claimed task
        if (!body.task_id) {
          return NextResponse.json(
            { error: 'task_id is required' },
            { status: 400 }
          )
        }

        const success = await startAgentTaskInD1(db, body.task_id)

        return NextResponse.json({
          success,
          message: success ? 'Task started' : 'Failed to start task'
        })
      }

      case 'complete_task': {
        // Agent completes a task with result
        if (!body.task_id || !body.result) {
          return NextResponse.json(
            { error: 'task_id and result are required' },
            { status: 400 }
          )
        }

        const success = await completeAgentTaskInD1(db, body.task_id, body.result)

        return NextResponse.json({
          success,
          message: success ? 'Task completed' : 'Failed to complete task'
        })
      }

      case 'fail_task': {
        // Agent marks a task as failed
        if (!body.task_id || !body.error) {
          return NextResponse.json(
            { error: 'task_id and error are required' },
            { status: 400 }
          )
        }

        const success = await failAgentTaskInD1(db, body.task_id, body.error)

        return NextResponse.json({
          success,
          message: success ? 'Task marked as failed' : 'Failed to update task'
        })
      }

      case 'create_task': {
        // Agent or system creates a new task
        if (!body.type || !body.description) {
          return NextResponse.json(
            { error: 'type and description are required' },
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
          source_dashboard: body.source_dashboard as SourceDashboard,
          due_at: body.due_at,
          metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
          created_by: body.created_by || 'agent'
        })

        return NextResponse.json({
          success: !!task,
          task
        })
      }

      // === Agent Registry Actions ===

      case 'get_agents': {
        // Get all registered agents
        const agents = await getAgentsFromD1(db)

        return NextResponse.json({
          success: true,
          agents,
          count: agents.length
        })
      }

      case 'register_agent': {
        // Register or update an agent
        if (!body.agent_id || !body.agent_name || !body.agent_type) {
          return NextResponse.json(
            { error: 'agent_id, agent_name, and agent_type are required' },
            { status: 400 }
          )
        }

        const agent = await registerAgentInD1(db, {
          id: body.agent_id,
          name: body.agent_name,
          type: body.agent_type,
          description: body.description,
          capabilities: body.capabilities ? JSON.stringify(body.capabilities) : undefined,
          status: body.status || 'active'
        })

        return NextResponse.json({
          success: !!agent,
          agent
        })
      }

      case 'agent_heartbeat': {
        // Update agent last seen time
        if (!body.agent_id) {
          return NextResponse.json(
            { error: 'agent_id is required' },
            { status: 400 }
          )
        }

        const success = await updateAgentHeartbeatInD1(db, body.agent_id)

        return NextResponse.json({
          success,
          message: success ? 'Heartbeat recorded' : 'Agent not found'
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Sync POST error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
