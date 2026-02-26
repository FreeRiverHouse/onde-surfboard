import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

// Valid activity types - expanded for Mission Control
const VALID_TYPES = [
  'post_approved', 'post_rejected', 'post_created', 'post_posted',
  'deploy', 'book_updated', 'agent_action', 'image_generated',
  'task_completed', 'task_started', 'git_commit', 'heartbeat',
  'alert', 'game_tested', 'translation', 'memory_update',
  'cron_job', 'monitor', 'error', 'chat_message'
]

// Fallback mock activities for development
const mockActivities = [
  { id: 1, type: 'deploy', title: 'onde.surf deployed', description: 'Production build v1.2.0', actor: 'CI/CD', created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
  { id: 2, type: 'task_completed', title: 'GAM-FIX-001 completed', description: 'All 44 games tested and working', actor: 'Clawdinho', created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
  { id: 3, type: 'git_commit', title: 'fix: 2048 empty grid + jigsaw navbar', description: '3 files changed', actor: 'Clawdinho', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  { id: 4, type: 'heartbeat', title: 'Heartbeat check OK', description: 'Autotrader running, no alerts', actor: 'Clawdinho', created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: 5, type: 'agent_action', title: 'QA tests completed', description: 'All 19 tests passed', actor: 'QA Agent', created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const type = searchParams.get('type') // Filter by type
    const actor = searchParams.get('actor') // Filter by actor

    const { env } = getRequestContext()
    const db = env.DB

    if (db) {
      // Use D1 database with optional filters
      let query = 'SELECT * FROM activity_log'
      const params: (string | number)[] = []
      const conditions: string[] = []

      if (type) {
        conditions.push('type = ?')
        params.push(type)
      }
      if (actor) {
        conditions.push('actor = ?')
        params.push(actor)
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }
      query += ' ORDER BY created_at DESC LIMIT ?'
      params.push(limit)

      const result = await db.prepare(query).bind(...params).all()
      const activities = result.results.map((row: Record<string, unknown>) => ({
        id: row.id as number,
        type: row.type as string,
        title: row.title as string,
        description: row.description as string | undefined,
        actor: row.actor as string | undefined,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
        created_at: row.created_at as string,
      }))
      return NextResponse.json({ activities, source: 'd1' })
    } else {
      // Fallback to mock data for local dev
      let filtered = mockActivities
      if (type) filtered = filtered.filter(a => a.type === type)
      return NextResponse.json({ activities: filtered.slice(0, limit), source: 'mock' })
    }
  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json({ activities: mockActivities, source: 'mock-fallback' })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, title, description, actor, metadata } = body

    // Validate required fields
    if (!type || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title' },
        { status: 400 }
      )
    }

    // Validate type (allow any type for forward compatibility, but warn on unknown)
    const isKnownType = VALID_TYPES.includes(type)

    const { env } = getRequestContext()
    const db = env.DB

    if (db) {
      const result = await db.prepare(
        'INSERT INTO activity_log (type, title, description, actor, metadata) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        type,
        title,
        description || null,
        actor || 'system',
        metadata ? JSON.stringify(metadata) : null
      ).run()

      return NextResponse.json({
        ok: true,
        id: result.meta?.last_row_id,
        knownType: isKnownType,
      })
    } else {
      // Dev mode: just acknowledge
      return NextResponse.json({
        ok: true,
        id: Date.now(),
        source: 'mock',
        knownType: isKnownType,
      })
    }
  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}
