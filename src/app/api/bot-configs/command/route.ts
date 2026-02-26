/**
 * POST /api/bot-configs/command
 * Queues a switch command for a Mac.
 * Protected by cookie frh_bots_auth.
 * The Mac picks it up on next heartbeat.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

const AUTH_TOKEN = 'FRH-BOTS-OK-2026'

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get('frh_bots_auth')?.value
  if (cookie !== AUTH_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { macId, action, model } = body

    if (!macId || !action) {
      return NextResponse.json({ error: 'macId and action required' }, { status: 400 })
    }

    const { env } = getRequestContext()
    const kv = env.WEBHOOKS_KV

    if (!kv) {
      return NextResponse.json({ error: 'KV not available' }, { status: 500 })
    }

    const cmd = { action, model, queuedAt: new Date().toISOString() }
    // TTL 10 min - if Mac doesn't pick it up, discard
    await kv.put(`bot-cmd:${macId}`, JSON.stringify(cmd), { expirationTtl: 600 })

    return NextResponse.json({ ok: true, queued: cmd })
  } catch (err) {
    console.error('Command error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
