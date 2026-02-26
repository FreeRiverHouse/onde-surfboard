import { NextResponse, NextRequest } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

const TOKENS: Record<string, string> = {
  [process.env.HOUSE_TOKEN_MATTIA || 'mattia-house-token']: 'Mattia',
  [process.env.HOUSE_TOKEN_CLAWDINHO || 'clawdinho-house-token']: 'Clawdinho',
  [process.env.HOUSE_TOKEN_ONDINHO || 'ondinho-house-token']: 'Ondinho',
  [process.env.HOUSE_TOKEN_BUBBLE || 'bubble-house-token']: 'Bubble',
}

const BOT_EMOJIS: Record<string, string> = {
  Bubble: '🫧',
  Ondinho: '🌊',
  Clawdinho: '🦞',
  Mattia: '👑',
}

// POST /api/house/chat/status — heartbeat
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const sender = TOKENS[token]
  if (!sender) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { env } = getRequestContext()
  const db = env.DB
  if (!db) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 })

  // Upsert heartbeat
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS house_heartbeats (
      sender TEXT PRIMARY KEY,
      last_seen TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run()

  await db.prepare(
    `INSERT INTO house_heartbeats (sender, last_seen) VALUES (?, datetime('now'))
     ON CONFLICT(sender) DO UPDATE SET last_seen = datetime('now')`
  ).bind(sender).run()

  return NextResponse.json({ ok: true, sender })
}

// GET /api/house/chat/status — get all statuses
export async function GET() {
  const { env } = getRequestContext()
  const db = env.DB
  if (!db) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 })

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS house_heartbeats (
      sender TEXT PRIMARY KEY,
      last_seen TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run()

  const result = await db.prepare('SELECT * FROM house_heartbeats').all()
  const heartbeats = result.results || []

  const now = Date.now()
  const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

  const bots = ['Bubble', 'Ondinho', 'Clawdinho', 'Mattia'].map(name => {
    const hb = heartbeats.find((h: any) => h.sender === name) as any
    const lastSeen = hb ? new Date(hb.last_seen + 'Z').getTime() : 0
    return {
      name,
      emoji: BOT_EMOJIS[name] || '🤖',
      online: lastSeen > 0 && (now - lastSeen) < OFFLINE_THRESHOLD_MS,
      lastSeen: hb?.last_seen || null,
    }
  })

  return NextResponse.json({ ok: true, bots, serverTime: Date.now() })
}
