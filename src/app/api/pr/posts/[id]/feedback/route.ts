import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

// POST /api/pr/posts/[id]/feedback - Send feedback for post revision
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = getRequestContext()
    const db = env.DB
    const { id } = await params

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const body = await request.json()
    const { feedback } = body

    if (!feedback?.trim()) {
      return NextResponse.json({ error: 'feedback is required' }, { status: 400 })
    }

    // Get current post
    const post = await db.prepare(
      'SELECT id, account, content, feedback FROM posts WHERE id = ?'
    ).bind(id).first<{ id: string; account: string; content: string; feedback: string }>()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Append feedback
    let feedbackArray: string[] = []
    if (post.feedback) {
      try {
        feedbackArray = JSON.parse(post.feedback)
      } catch {
        feedbackArray = []
      }
    }
    feedbackArray.push(`[${new Date().toISOString()}] ${feedback}`)

    // Update post with feedback
    await db.prepare(`
      UPDATE posts SET feedback = ? WHERE id = ?
    `).bind(JSON.stringify(feedbackArray), id).run()

    // Create agent task for PR agent to revise the post
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    await db.prepare(`
      INSERT INTO agent_tasks (id, type, target_id, target_type, description, status, assigned_to, priority, source_dashboard, created_at, payload)
      VALUES (?, 'post_edit', ?, 'post', ?, 'pending', 'onde-pr', 'high', 'onde.surf', ?, ?)
    `).bind(
      taskId,
      id,
      `Revise post based on feedback: ${feedback}`,
      now,
      JSON.stringify({ post_id: id, feedback, original_content: post.content })
    ).run()

    // Log activity
    try {
      await db.prepare(`
        INSERT INTO activity_log (type, title, description, actor, created_at)
        VALUES ('post_feedback', ?, ?, 'dashboard', ?)
      `).bind(
        `Feedback sent for @${post.account} post`,
        feedback.substring(0, 100),
        now
      ).run()
    } catch { /* ignore activity log errors */ }

    return NextResponse.json({
      success: true,
      message: 'Feedback sent to OndePR agent',
      task_id: taskId
    })
  } catch (error) {
    console.error('Feedback post error:', error)
    return NextResponse.json({ error: 'Failed to send feedback' }, { status: 500 })
  }
}
