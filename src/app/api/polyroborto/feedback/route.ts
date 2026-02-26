import { NextResponse } from 'next/server'
import { addTechFeedback } from '@/lib/polyroborto'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { feedback } = await request.json()

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback text required' }, { status: 400 })
    }

    const result = addTechFeedback(feedback)

    return NextResponse.json({
      success: true,
      message: 'Feedback sent to Tech Support agent for PolyRoborto optimization',
      feedbackId: result.id
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
