/**
 * GET /api/bot-configs/status
 * Returns all bot statuses from KV.
 * Protected by cookie frh_bots_auth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

const AUTH_TOKEN = 'FRH-BOTS-OK-2026'

// Known Mac IDs - we poll these from KV
const KNOWN_MACS = ['m1', 'bubble', 'm4']

export async function GET(request: NextRequest) {
  // Check auth cookie
  const cookie = request.cookies.get('frh_bots_auth')?.value
  if (cookie !== AUTH_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { env } = getRequestContext()
    const kv = env.WEBHOOKS_KV

    if (!kv) {
      return NextResponse.json({ error: 'KV not available' }, { status: 500 })
    }

    const statuses = await Promise.all(
      KNOWN_MACS.map(async (macId) => {
        const raw = await kv.get(`bot-status:${macId}`)
        if (!raw) return null
        return JSON.parse(raw)
      })
    )

    return NextResponse.json({
      bots: statuses.filter(Boolean),
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Status error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
