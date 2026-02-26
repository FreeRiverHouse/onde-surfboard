/**
 * POST /api/bot-configs/heartbeat
 * Receives status push from each Mac's ClawdBot instance.
 * Public endpoint secured by shared secret header.
 * Stores in WEBHOOKS_KV under bot-status:{macId}
 * Returns any pending command for that Mac.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

const SHARED_SECRET = 'FRH-BOTS-2026'

export interface NvidiaUsage {
  todayTokens: number
  todayCalls: number
  totalTokens: number
  totalCalls: number
  lastUpdated: string | null
}

export interface BotStatus {
  macId: string
  hostname: string
  botName: string
  primaryModel: string
  fallbacks: string[]
  account: string
  tokenEnd: string
  tier: string
  cooldown: number | null
  errorCount: number
  gatewayStatus: 'running' | 'stopped' | 'unknown'
  rateLimitStatus: {
    fiveH: string
    sevenD: string
    sevenDUtilization: number
    sevenDSonnetStatus: string
  }
  nvidiaUsage?: NvidiaUsage
  lastHeartbeat: string
}

export async function POST(request: NextRequest) {
  // Verify shared secret
  const secret = request.headers.get('x-frh-secret')
  if (secret !== SHARED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: BotStatus = await request.json()

    if (!body.macId) {
      return NextResponse.json({ error: 'macId required' }, { status: 400 })
    }

    const { env } = getRequestContext()
    const kv = env.WEBHOOKS_KV

    if (!kv) {
      return NextResponse.json({ error: 'KV not available' }, { status: 500 })
    }

    // Store status with TTL of 10 minutes (if Mac dies, status shows as stale)
    const status: BotStatus = {
      ...body,
      lastHeartbeat: new Date().toISOString(),
    }
    await kv.put(`bot-status:${body.macId}`, JSON.stringify(status), { expirationTtl: 600 })

    // Check for pending command
    const cmdRaw = await kv.get(`bot-cmd:${body.macId}`)
    let pendingCommand = null
    if (cmdRaw) {
      pendingCommand = JSON.parse(cmdRaw)
      // Clear command after reading (one-shot)
      await kv.delete(`bot-cmd:${body.macId}`)
    }

    return NextResponse.json({
      ok: true,
      pendingCommand,
    })
  } catch (err) {
    console.error('Heartbeat error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
