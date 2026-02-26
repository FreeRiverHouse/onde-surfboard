import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { addFeedbackInD1, addFeedback } from '@/lib/posts'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { id, feedback } = await request.json()

    if (!id || !feedback) {
      return NextResponse.json({ error: 'Post ID and feedback required' }, { status: 400 })
    }

    const { env } = getRequestContext()
    const db = env.DB

    let success: boolean

    if (db) {
      // Use D1 database
      success = await addFeedbackInD1(db, id, feedback)
    } else {
      // Fallback to in-memory for local dev
      success = addFeedback(id, feedback)
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Feedback sent to OndePR agent for content regeneration'
      })
    } else {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error adding feedback:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
