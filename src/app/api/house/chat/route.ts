import { NextResponse, NextRequest } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

// Auth tokens — one per bot + one for Mattia
const TOKENS: Record<string, string> = {
  [process.env.HOUSE_TOKEN_MATTIA || 'mattia-house-token']: 'Mattia',
  [process.env.HOUSE_TOKEN_CLAWDINHO || 'clawdinho-house-token']: 'Clawdinho',
  [process.env.HOUSE_TOKEN_ONDINHO || 'ondinho-house-token']: 'Ondinho',
  [process.env.HOUSE_TOKEN_BUBBLE || 'bubble-house-token']: 'Bubble',
}

function authenticate(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  return TOKENS[token] || null
}

// GET /api/house/chat — get messages
export async function GET(req: NextRequest) {
  const { env } = getRequestContext()
  const db = env.DB
  if (!db) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 })

  // Ensure table exists
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS house_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      reply_to INTEGER
    )
  `).run()

  const url = new URL(req.url)
  const afterId = url.searchParams.get('after_id')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 200)
  const mentioning = url.searchParams.get('mentioning')

  let query: string
  let params: (string | number)[]

  if (afterId) {
    if (mentioning) {
      query = 'SELECT * FROM house_messages WHERE id > ? AND content LIKE ? ORDER BY id ASC LIMIT ?'
      params = [parseInt(afterId), `%@${mentioning}%`, limit]
    } else {
      query = 'SELECT * FROM house_messages WHERE id > ? ORDER BY id ASC LIMIT ?'
      params = [parseInt(afterId), limit]
    }
  } else {
    if (mentioning) {
      query = 'SELECT * FROM (SELECT * FROM house_messages WHERE content LIKE ? ORDER BY id DESC LIMIT ?) sub ORDER BY id ASC'
      params = [`%@${mentioning}%`, limit]
    } else {
      query = 'SELECT * FROM (SELECT * FROM house_messages ORDER BY id DESC LIMIT ?) sub ORDER BY id ASC'
      params = [limit]
    }
  }

  const result = await db.prepare(query).bind(...params).all()

  return NextResponse.json({
    ok: true,
    messages: result.results || [],
    count: result.results?.length || 0,
    serverTime: Date.now(),
  })
}

// ── Rate Limiting (HOUSE-008) ──
// Sliding window via KV: 30 messages per minute per sender
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000
const RATE_TTL_S = 120 // KV TTL: window + margin

async function checkRateLimit(kv: any, sender: string): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  if (!kv) return { allowed: true, remaining: RATE_LIMIT, resetMs: 0 } // graceful fallback if KV unavailable

  const now = Date.now()
  const key = `rate_${sender}`
  const raw = await kv.get(key)
  let timestamps: number[] = raw ? JSON.parse(raw) : []

  // Filter to sliding window
  timestamps = timestamps.filter((ts: number) => now - ts < RATE_WINDOW_MS)

  if (timestamps.length >= RATE_LIMIT) {
    const oldestInWindow = Math.min(...timestamps)
    return { allowed: false, remaining: 0, resetMs: oldestInWindow + RATE_WINDOW_MS - now }
  }

  // Record this request
  timestamps.push(now)
  await kv.put(key, JSON.stringify(timestamps), { expirationTtl: RATE_TTL_S })

  return { allowed: true, remaining: RATE_LIMIT - timestamps.length, resetMs: 0 }
}

// POST /api/house/chat — send a message
export async function POST(req: NextRequest) {
  const sender = authenticate(req)
  if (!sender) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { env } = getRequestContext()
  const db = env.DB
  if (!db) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 })

  // Rate limit check
  const rateResult = await checkRateLimit(env.RATE_KV, sender)
  if (!rateResult.allowed) {
    const res = NextResponse.json(
      { error: 'Rate limit exceeded (30 msg/min)', retryAfterMs: rateResult.resetMs },
      { status: 429 }
    )
    res.headers.set('RateLimit-Limit', String(RATE_LIMIT))
    res.headers.set('RateLimit-Remaining', '0')
    res.headers.set('RateLimit-Reset', String(Math.ceil(rateResult.resetMs / 1000)))
    res.headers.set('Retry-After', String(Math.ceil(rateResult.resetMs / 1000)))
    return res
  }

  // Ensure table exists
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS house_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      reply_to INTEGER
    )
  `).run()

  // ── Input Validation (HOUSE-009) ──
  let body: { content?: string; reply_to?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.content || typeof body.content !== 'string') {
    return NextResponse.json({ error: 'Content required (string)', field: 'content' }, { status: 400 })
  }

  const content = body.content
    .trim()
    .replace(/<[^>]*>/g, '') // Strip HTML tags (basic XSS prevention)

  if (!content) {
    return NextResponse.json({ error: 'Content cannot be empty or only whitespace' }, { status: 400 })
  }

  const MAX_CONTENT_LENGTH = 2000
  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: 'Content too long', max: MAX_CONTENT_LENGTH, actual: content.length },
      { status: 400 }
    )
  }

  if (body.reply_to !== undefined && body.reply_to !== null) {
    if (typeof body.reply_to !== 'number' || body.reply_to < 1 || !Number.isInteger(body.reply_to)) {
      return NextResponse.json({ error: 'reply_to must be a positive integer', field: 'reply_to' }, { status: 400 })
    }
  }

  // ── Extract mentions (HOUSE-010 prep) ──
  const VALID_NAMES = ['Mattia', 'Clawdinho', 'Ondinho', 'Bubble']
  const mentionRegex = /@(Mattia|Clawdinho|Ondinho|Bubble)/gi
  const mentions = [...new Set(
    (content.match(mentionRegex) || []).map(m => {
      const name = m.slice(1)
      return VALID_NAMES.find(n => n.toLowerCase() === name.toLowerCase()) || name
    })
  )]

  const result = await db.prepare(
    'INSERT INTO house_messages (sender, content, reply_to) VALUES (?, ?, ?)'
  ).bind(sender, content, body.reply_to || null).run()

  // Fetch the inserted message
  const msg = await db.prepare(
    'SELECT * FROM house_messages WHERE id = ?'
  ).bind(result.meta.last_row_id).first()

  const res = NextResponse.json({ ok: true, message: { ...msg, mentions } })
  res.headers.set('RateLimit-Limit', String(RATE_LIMIT))
  res.headers.set('RateLimit-Remaining', String(rateResult.remaining))

  // ── Webhook dispatch (HOUSE-011) ─────────────────────────────────────────
  // Fire webhooks asynchronously to mentioned bots
  if (mentions.length > 0) {
    const ctx = getRequestContext()
    // @ts-ignore - Cloudflare waitUntil
    if (ctx?.waitUntil) {
      const webhookPromises = mentions
        .filter((name: string) => name !== sender) // Don't ping self
        .map(async (name: string) => {
          const webhookUrl = await env.WEBHOOKS_KV?.get(`webhook:${name}`)
          if (webhookUrl) {
            try {
              await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'house_mention',
                  sender,
                  recipient: name,
                  content,
                  messageId: msg.id,
                  timestamp: msg.created_at,
                  url: `https://onde.surf/house/chat`,
                }),
              })
            } catch (e) {
              console.error(`Webhook failed for ${name}:`, e)
            }
          }
        })
      // @ts-ignore
      ctx.waitUntil(Promise.all(webhookPromises))
    }
  }

  return res
}
