import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

interface Post {
  id: string
  account: string
  content: string
  status: string
  auto_post: number
  media_files?: string
}

// POST /api/pr/posts/[id]/approve - Approve post and trigger auto-posting
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

    // Get the post first
    const post = await db.prepare(
      'SELECT * FROM posts WHERE id = ?'
    ).bind(id).first<Post>()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.status !== 'pending') {
      return NextResponse.json({ error: 'Post is not pending' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Update post to approved
    await db.prepare(`
      UPDATE posts
      SET status = 'approved', approved_at = ?, auto_post = 1
      WHERE id = ?
    `).bind(now, id).run()

    // Log activity
    try {
      await db.prepare(`
        INSERT INTO activity_log (type, title, description, actor, created_at)
        VALUES ('post_approved', ?, ?, 'dashboard', ?)
      `).bind(
        `Post approved for @${post.account}`,
        post.content.substring(0, 100),
        now
      ).run()
    } catch { /* ignore activity log errors */ }

    // Try to post immediately via the auto-post endpoint
    // This is done asynchronously - the response returns immediately
    const autoPostUrl = new URL('/api/pr/auto-post', request.url)
    fetch(autoPostUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: id })
    }).catch(() => { /* fire and forget */ })

    return NextResponse.json({
      success: true,
      message: 'Post approved and queued for auto-posting',
      post: {
        id: post.id,
        account: post.account,
        status: 'approved',
        approved_at: now
      }
    })
  } catch (error) {
    console.error('Approve post error:', error)
    return NextResponse.json({ error: 'Failed to approve post' }, { status: 500 })
  }
}
