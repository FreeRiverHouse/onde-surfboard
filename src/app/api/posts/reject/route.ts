import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { rejectPostInD1, rejectPost } from '@/lib/posts'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
    }

    const { env } = getRequestContext()
    const db = env.DB

    let success: boolean

    if (db) {
      // Use D1 database
      success = await rejectPostInD1(db, id)
    } else {
      // Fallback to in-memory for local dev
      success = rejectPost(id)
    }

    if (success) {
      return NextResponse.json({ success: true, message: 'Post rejected' })
    } else {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error rejecting post:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
