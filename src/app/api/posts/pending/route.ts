import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getPendingPostsFromD1, getPendingPosts } from '@/lib/posts'

export const runtime = 'edge'

export async function GET() {
  try {
    const { env } = getRequestContext()
    const db = env.DB

    if (db) {
      // Use D1 database
      const posts = await getPendingPostsFromD1(db)
      return NextResponse.json({ posts, source: 'd1' })
    } else {
      // Fallback to in-memory for local dev
      const posts = getPendingPosts()
      return NextResponse.json({ posts, source: 'memory' })
    }
  } catch (error) {
    console.error('Error fetching pending posts:', error)
    // Fallback to in-memory on error
    const posts = getPendingPosts()
    return NextResponse.json({ posts, source: 'memory-fallback' })
  }
}
