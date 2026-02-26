import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

// Get house dashboard data: agents, tasks, books, stats
export async function GET() {
  try {
    const { env } = getRequestContext()
    const db = env.DB

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Fetch agents
    const agentsResult = await db.prepare(
      'SELECT * FROM agents ORDER BY name'
    ).all()

    // Fetch task counts by status
    const taskStats = await db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM agent_tasks
      GROUP BY status
    `).all()

    // Fetch recent tasks
    const recentTasks = await db.prepare(`
      SELECT * FROM agent_tasks
      WHERE status IN ('pending', 'claimed', 'in_progress')
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        created_at DESC
      LIMIT 20
    `).all()

    // Fetch books pipeline
    const booksResult = await db.prepare(
      'SELECT * FROM books ORDER BY created_at DESC'
    ).all()

    // Calculate stats
    const stats = {
      agents: agentsResult.results?.length || 0,
      tasks: {
        pending: 0,
        in_progress: 0,
        done: 0,
        total: 0
      },
      books: {
        planning: 0,
        writing: 0,
        illustrating: 0,
        reviewing: 0,
        published: 0
      }
    }

    // Process task stats
    for (const row of (taskStats.results || []) as Array<{ status: string; count: number }>) {
      if (row.status === 'pending' || row.status === 'claimed') {
        stats.tasks.pending += row.count
      } else if (row.status === 'in_progress') {
        stats.tasks.in_progress += row.count
      } else if (row.status === 'done') {
        stats.tasks.done += row.count
      }
      stats.tasks.total += row.count
    }

    // Process book stats
    for (const book of (booksResult.results || []) as Array<{ status: string }>) {
      const status = book.status as keyof typeof stats.books
      if (stats.books[status] !== undefined) {
        stats.books[status]++
      }
    }

    return NextResponse.json({
      success: true,
      agents: agentsResult.results || [],
      tasks: recentTasks.results || [],
      books: booksResult.results || [],
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('House API error:', error)
    return NextResponse.json({ error: 'Failed to fetch house data' }, { status: 500 })
  }
}
