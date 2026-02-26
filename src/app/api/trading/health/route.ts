import { NextResponse } from 'next/server'

export const runtime = 'edge'

// Gist URL for autotrader health (updated by cron job)
const GIST_URL = 'https://gist.githubusercontent.com/petrucciani/onde-trading-data/raw/autotrader-health.json'

interface AutotraderHealth {
  is_running: boolean
  last_cycle_time: string
  cycle_count: number
  dry_run: boolean
  trades_today: number
  today_won: number
  today_lost: number
  today_pending: number
  win_rate_today: number
  pnl_today_cents: number
  positions_count: number
  cash_cents: number
  circuit_breaker_active: boolean
  circuit_breaker_reason?: string
  consecutive_losses: number
  status: string
}

export async function GET() {
  try {
    const res = await fetch(GIST_URL, {
      next: { revalidate: 30 } // Cache for 30 seconds
    })
    
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch autotrader health', status: 'unknown' },
        { status: 502 }
      )
    }
    
    const data: AutotraderHealth = await res.json()
    
    // Calculate time since last cycle
    const lastCycleTime = new Date(data.last_cycle_time)
    const now = new Date()
    const minutesSinceLastCycle = Math.floor((now.getTime() - lastCycleTime.getTime()) / 60000)
    
    // Determine overall health status
    let healthStatus: 'healthy' | 'degraded' | 'down' = 'healthy'
    let healthReason = ''
    
    if (!data.is_running) {
      healthStatus = 'down'
      healthReason = 'Autotrader is not running'
    } else if (minutesSinceLastCycle > 10) {
      healthStatus = 'down'
      healthReason = `No cycle in ${minutesSinceLastCycle} minutes`
    } else if (data.circuit_breaker_active) {
      healthStatus = 'degraded'
      healthReason = data.circuit_breaker_reason || 'Circuit breaker active'
    } else if (minutesSinceLastCycle > 5) {
      healthStatus = 'degraded'
      healthReason = `Last cycle ${minutesSinceLastCycle} minutes ago`
    }
    
    return NextResponse.json({
      ...data,
      health_status: healthStatus,
      health_reason: healthReason,
      minutes_since_last_cycle: minutesSinceLastCycle,
      checked_at: now.toISOString()
    })
  } catch (error) {
    console.error('Error fetching autotrader health:', error)
    return NextResponse.json(
      { error: 'Failed to fetch autotrader health', status: 'unknown' },
      { status: 500 }
    )
  }
}
