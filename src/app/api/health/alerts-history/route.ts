import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

// Gist URL for fallback/backup (same gist as trading stats)
const GIST_URL = 'https://gist.githubusercontent.com/mathix420/8f0e5d4f64f4e2dddc5fdcb40f540d23/raw/kalshi-trading-stats.json'

interface HealthAlert {
  id: string
  timestamp: string
  status: 'critical' | 'degraded' | 'healthy'
  affectedServices: string[]
  message: string
  resolvedAt?: string
  durationMs?: number
}

interface AlertsHistoryResponse {
  alerts: HealthAlert[]
  summary: {
    total: number
    byService: Record<string, number>
    avgResolutionTime?: number
    lastAlertTime?: string
  }
  source?: 'kv' | 'gist'
}

// Fetch alerts from Gist as fallback
async function fetchAlertsFromGist(days: number): Promise<HealthAlert[]> {
  try {
    const response = await fetch(GIST_URL, {
      headers: { 'Cache-Control': 'no-cache' }
    })
    if (!response.ok) return []
    
    const data = await response.json()
    const webhookAlerts = data.webhookAlerts?.alerts || []
    
    // Filter to last N days and convert format
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return webhookAlerts
      .filter((a: { timestamp?: string }) => {
        const ts = a.timestamp ? new Date(a.timestamp).getTime() : 0
        return ts > cutoff
      })
      .map((a: { timestamp?: string; status?: string; details?: { ondeLaDown?: boolean; ondeSurfDown?: boolean; autotraderDown?: boolean } }, i: number) => ({
        id: `gist-alert-${i}`,
        timestamp: a.timestamp || new Date().toISOString(),
        status: a.status || 'critical',
        affectedServices: [
          ...(a.details?.ondeLaDown ? ['onde.la'] : []),
          ...(a.details?.ondeSurfDown ? ['onde.surf'] : []),
          ...(a.details?.autotraderDown ? ['autotrader'] : [])
        ],
        message: `Health alert: ${a.status}`,
        resolvedAt: undefined,
        durationMs: undefined
      }))
  } catch {
    return []
  }
}

// GET /api/health/alerts-history - Fetch alert history from KV (with Gist fallback)
export async function GET(request: Request) {
  const url = new URL(request.url)
  const days = parseInt(url.searchParams.get('days') || '7')
  const limit = parseInt(url.searchParams.get('limit') || '50')
  
  let source: 'kv' | 'gist' = 'kv'
  let alerts: HealthAlert[] = []
  const byService: Record<string, number> = {}
  let totalResolutionTime = 0
  let resolvedCount = 0
  
  try {
    const { env } = getRequestContext()
    const kv = env.HEALTH_ALERTS_KV as KVNamespace | undefined
    
    if (!kv) {
      // Fallback to Gist if KV not configured
      alerts = await fetchAlertsFromGist(days)
      source = 'gist'
    } else {
      // Fetch from KV
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
      const listResult = await kv.list({ prefix: 'health-alert-' })
      
      // Fetch each alert (up to limit)
      for (const key of listResult.keys.slice(0, limit)) {
        const alertData = await kv.get(key.name, 'json') as HealthAlert | null
        if (!alertData) continue
        
        const alertTime = new Date(alertData.timestamp).getTime()
        if (alertTime < cutoff) continue
        
        alerts.push(alertData)
      }
    }
    
    // Process alerts for summary
    for (const alert of alerts) {
      // Count by service
      for (const service of alert.affectedServices) {
        byService[service] = (byService[service] || 0) + 1
      }
      
      // Track resolution time
      if (alert.durationMs) {
        totalResolutionTime += alert.durationMs
        resolvedCount++
      }
    }
    
    // Sort by timestamp descending
    alerts.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    
    const response: AlertsHistoryResponse = {
      alerts,
      summary: {
        total: alerts.length,
        byService,
        avgResolutionTime: resolvedCount > 0 
          ? Math.round(totalResolutionTime / resolvedCount) 
          : undefined,
        lastAlertTime: alerts[0]?.timestamp
      },
      source
    }
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300' // 5 min cache
      }
    })
    
  } catch (error) {
    console.error('Failed to fetch alerts history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts history', alerts: [], summary: { total: 0, byService: {} } },
      { status: 500 }
    )
  }
}

// POST /api/health/alerts-history - Store a new alert
export async function POST(request: Request) {
  try {
    const { env } = getRequestContext()
    const kv = env.HEALTH_ALERTS_KV as KVNamespace | undefined
    
    if (!kv) {
      return NextResponse.json({ 
        error: 'KV not configured. Set HEALTH_ALERTS_KV binding in Cloudflare Pages dashboard.',
        hint: 'Go to Pages > onde-surf > Settings > Functions > KV namespace bindings'
      }, { status: 503 })
    }
    
    const body = await request.json() as Partial<HealthAlert>
    
    // Validate required fields
    if (!body.status || !body.affectedServices || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields: status, affectedServices, message' },
        { status: 400 }
      )
    }
    
    // Generate alert with ID and timestamp
    const timestamp = new Date().toISOString()
    const alert: HealthAlert = {
      id: `health-alert-${Date.now()}`,
      timestamp,
      status: body.status,
      affectedServices: body.affectedServices,
      message: body.message,
      resolvedAt: body.resolvedAt,
      durationMs: body.durationMs
    }
    
    // Store in KV with 30-day TTL
    const key = `health-alert-${Date.now()}`
    await kv.put(key, JSON.stringify(alert), {
      expirationTtl: 30 * 24 * 60 * 60 // 30 days
    })
    
    return NextResponse.json({ 
      success: true, 
      alert,
      key 
    }, { status: 201 })
    
  } catch (error) {
    console.error('Failed to store alert:', error)
    return NextResponse.json(
      { error: 'Failed to store alert' },
      { status: 500 }
    )
  }
}

// PATCH /api/health/alerts-history - Mark an alert as resolved
export async function PATCH(request: Request) {
  try {
    const { env } = getRequestContext()
    const kv = env.HEALTH_ALERTS_KV as KVNamespace | undefined
    
    if (!kv) {
      return NextResponse.json({ error: 'KV not configured' }, { status: 503 })
    }
    
    const body = await request.json() as { alertId?: string; key?: string }
    const key = body.key || body.alertId
    
    if (!key) {
      return NextResponse.json(
        { error: 'Missing alertId or key' },
        { status: 400 }
      )
    }
    
    // Fetch existing alert
    const existing = await kv.get(key, 'json') as HealthAlert | null
    if (!existing) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }
    
    // Update with resolution info
    const resolvedAt = new Date().toISOString()
    const durationMs = new Date(resolvedAt).getTime() - new Date(existing.timestamp).getTime()
    
    const updated: HealthAlert = {
      ...existing,
      resolvedAt,
      durationMs
    }
    
    await kv.put(key, JSON.stringify(updated), {
      expirationTtl: 30 * 24 * 60 * 60
    })
    
    return NextResponse.json({ success: true, alert: updated })
    
  } catch (error) {
    console.error('Failed to update alert:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}
