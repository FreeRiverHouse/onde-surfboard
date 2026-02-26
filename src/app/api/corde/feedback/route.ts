import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { to, message } = await request.json()

    if (!to || !message) {
      return NextResponse.json({ error: 'Author ID and message required' }, { status: 400 })
    }

    // In Edge runtime, we just acknowledge the feedback
    // In production, this would go to a database or KV store
    const feedback = {
      id: `feedback-${Date.now()}`,
      to,
      message,
      createdAt: new Date().toISOString(),
      status: 'pending'
    }

    return NextResponse.json({
      success: true,
      message: `Feedback sent to ${to}`,
      feedbackId: feedback.id
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
