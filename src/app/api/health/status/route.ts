import { NextResponse } from 'next/server'

export const runtime = 'edge'

interface AutotraderStatus {
  running: boolean
  lastCycleTime?: string
  uptime?: string
  version?: string
}

interface SiteHealth {
  url: string
  status: number
  latencyMs: number
  ok: boolean
}

interface TradingStats {
  winRate: number
  pnl: number
  tradesToday: number
  tradesTotal: number
  lastTradeTime?: string
}

interface AlertSummary {
  total24h: number
  byType: Record<string, number>
  lastAlertTime?: string
}

interface HealthStatusResponse {
  timestamp: string
  status: 'healthy' | 'degraded' | 'critical'
  autotrader: AutotraderStatus
  sites: {
    ondeLa: SiteHealth
    ondeSurf: SiteHealth
  }
  trading: TradingStats
  alerts: AlertSummary
}

// Quick site check
async function checkSite(url: string): Promise<SiteHealth> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'HealthStatus/1.0' }
    })
    
    clearTimeout(timeoutId)
    const latencyMs = Date.now() - start
    
    return {
      url,
      status: response.status,
      latencyMs,
      ok: response.ok
    }
  } catch {
    return {
      url,
      status: 0,
      latencyMs: Date.now() - start,
      ok: false
    }
  }
}

// Fetch trading stats from gist
async function fetchTradingStats(): Promise<TradingStats> {
  try {
    const response = await fetch(
      'https://gist.githubusercontent.com/mathix420/8f0e5d4f64f4e2dddc5fdcb40f540d23/raw/kalshi-trading-stats.json',
      { headers: { 'Cache-Control': 'no-cache' } }
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch trading stats')
    }
    
    const data = await response.json()
    
    // Parse trading stats
    const trades = data.trades || []
    const today = new Date().toISOString().split('T')[0]
    const tradesToday = trades.filter((t: { timestamp?: string }) => 
      t.timestamp?.startsWith(today)
    ).length
    
    return {
      winRate: data.winRate || 0,
      pnl: data.totalPnL || 0,
      tradesToday,
      tradesTotal: trades.length,
      lastTradeTime: trades[0]?.timestamp
    }
  } catch {
    return {
      winRate: 0,
      pnl: 0,
      tradesToday: 0,
      tradesTotal: 0
    }
  }
}

// Fetch alert summary from gist
async function fetchAlertSummary(): Promise<AlertSummary> {
  try {
    const response = await fetch(
      'https://gist.githubusercontent.com/mathix420/8f0e5d4f64f4e2dddc5fdcb40f540d23/raw/kalshi-trading-stats.json',
      { headers: { 'Cache-Control': 'no-cache' } }
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch alerts')
    }
    
    const data = await response.json()
    const alerts = data.alerts || []
    
    // Filter last 24h
    const now = Date.now()
    const dayAgo = now - 24 * 60 * 60 * 1000
    const recent = alerts.filter((a: { timestamp?: string }) => {
      const ts = a.timestamp ? new Date(a.timestamp).getTime() : 0
      return ts > dayAgo
    })
    
    // Count by type
    const byType: Record<string, number> = {}
    for (const alert of recent) {
      const type = alert.type || 'unknown'
      byType[type] = (byType[type] || 0) + 1
    }
    
    return {
      total24h: recent.length,
      byType,
      lastAlertTime: alerts[0]?.timestamp
    }
  } catch {
    return {
      total24h: 0,
      byType: {}
    }
  }
}

export async function GET() {
  const timestamp = new Date().toISOString()
  
  // Run checks in parallel
  const [ondeLa, ondeSurf, trading, alerts] = await Promise.all([
    checkSite('https://onde.la'),
    checkSite('https://onde.surf'),
    fetchTradingStats(),
    fetchAlertSummary()
  ])
  
  // Autotrader status - we can't check process from edge, so use trading activity as proxy
  const lastTradeMs = trading.lastTradeTime 
    ? Date.now() - new Date(trading.lastTradeTime).getTime() 
    : Infinity
  const autotraderRunning = lastTradeMs < 30 * 60 * 1000 // Active if traded in last 30min
  
  const autotrader: AutotraderStatus = {
    running: autotraderRunning || trading.tradesToday > 0,
    lastCycleTime: trading.lastTradeTime,
    version: 'v2'
  }
  
  // Determine overall status
  let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
  
  if (!ondeLa.ok || !ondeSurf.ok) {
    status = 'critical'
  } else if (ondeLa.latencyMs > 3000 || ondeSurf.latencyMs > 3000) {
    status = 'degraded'
  } else if (!autotrader.running) {
    status = 'degraded'
  }
  
  const response: HealthStatusResponse = {
    timestamp,
    status,
    autotrader,
    sites: {
      ondeLa,
      ondeSurf
    },
    trading,
    alerts
  }
  
  return NextResponse.json(response, {
    status: status === 'critical' ? 503 : 200,
    headers: {
      'Cache-Control': 'public, max-age=60', // Cache 1 min
      'X-Health-Status': status
    }
  })
}
