import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

interface Post {
  id: string
  account: string
  content: string
  status: string
  scheduled_for?: string
  created_at: string
  approved_at?: string
  posted_at?: string
  post_url?: string
  auto_post?: number
  twitter_post_id?: string
  feedback?: string
  media_files?: string
  source?: string
  error?: string
}

// GET /api/pr/posts - Get posts with optional filters
export async function GET(request: Request) {
  try {
    const { env } = getRequestContext()
    const db = env.DB

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') // pending,approved,posted
    const account = url.searchParams.get('account') // onde,frh,magmatic
    const limit = parseInt(url.searchParams.get('limit') || '50')

    let query = 'SELECT * FROM posts WHERE 1=1'
    const params: (string | number)[] = []

    if (status) {
      const statuses = status.split(',')
      query += ` AND status IN (${statuses.map(() => '?').join(',')})`
      params.push(...statuses)
    }

    if (account) {
      const accounts = account.split(',')
      query += ` AND account IN (${accounts.map(() => '?').join(',')})`
      params.push(...accounts)
    }

    query += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)

    const result = await db.prepare(query).bind(...params).all<Post>()

    const posts = (result.results || []).map(post => ({
      ...post,
      feedback: post.feedback ? JSON.parse(post.feedback) : [],
      media_files: post.media_files ? JSON.parse(post.media_files) : []
    }))

    return NextResponse.json({
      success: true,
      posts,
      count: posts.length
    })
  } catch (error) {
    console.error('PR posts GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

// POST /api/pr/posts - Create new post
export async function POST(request: Request) {
  try {
    const { env } = getRequestContext()
    const db = env.DB

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const body = await request.json()
    const { account, content, scheduled_for, media_files, source = 'dashboard' } = body

    if (!account || !content) {
      return NextResponse.json({ error: 'account and content are required' }, { status: 400 })
    }

    const id = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    await db.prepare(`
      INSERT INTO posts (id, account, content, scheduled_for, status, media_files, created_at, source, auto_post)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, 1)
    `).bind(
      id,
      account,
      content,
      scheduled_for || null,
      media_files ? JSON.stringify(media_files) : null,
      now,
      source
    ).run()

    return NextResponse.json({
      success: true,
      post: {
        id,
        account,
        content,
        scheduled_for,
        status: 'pending',
        created_at: now,
        auto_post: 1
      }
    })
  } catch (error) {
    console.error('PR posts POST error:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
