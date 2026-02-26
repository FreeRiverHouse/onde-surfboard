import { NextResponse } from 'next/server'

export const runtime = 'edge'

// Scheduled tasks derived from actual crontab + Clawdbot cron jobs
// These represent the recurring operations in the Free River House system

interface ScheduledTask {
  id: string
  name: string
  schedule: string // human-readable
  cronExpr?: string // actual cron expression
  category: 'trading' | 'monitoring' | 'maintenance' | 'content' | 'agent'
  emoji: string
  nextRun?: string // ISO date
  lastRun?: string // ISO date
  enabled: boolean
  agent?: string
  description?: string
}

function getNextCronRun(cronExpr: string): Date {
  // Simple next-run calculator for common patterns
  const now = new Date()
  const parts = cronExpr.split(' ')
  const [minute, hour, dayOfMonth, , dayOfWeek] = parts

  const next = new Date(now)
  next.setSeconds(0)
  next.setMilliseconds(0)

  // Handle */N patterns
  if (minute.startsWith('*/')) {
    const interval = parseInt(minute.slice(2))
    const currentMinute = now.getMinutes()
    const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval
    if (nextMinute >= 60) {
      next.setHours(next.getHours() + 1)
      next.setMinutes(nextMinute - 60)
    } else {
      next.setMinutes(nextMinute)
    }
    return next
  }

  // Handle specific hour/minute
  if (minute !== '*' && hour !== '*') {
    const targetMinute = parseInt(minute)
    const targetHour = parseInt(hour)
    next.setMinutes(targetMinute)
    next.setHours(targetHour)
    
    if (next <= now) {
      // Check day constraints
      if (dayOfWeek !== '*') {
        // Weekly job
        const targetDay = parseInt(dayOfWeek)
        const currentDay = now.getDay()
        let daysUntil = targetDay - currentDay
        if (daysUntil <= 0) daysUntil += 7
        next.setDate(next.getDate() + daysUntil)
      } else if (dayOfMonth !== '*' && dayOfMonth !== '1') {
        // Monthly job
        next.setMonth(next.getMonth() + 1)
      } else {
        // Daily or more frequent
        next.setDate(next.getDate() + 1)
      }
    }
    return next
  }

  // Hourly (minute set, hour is *)
  if (minute !== '*' && hour === '*') {
    const targetMinute = parseInt(minute)
    next.setMinutes(targetMinute)
    if (next <= now) {
      next.setHours(next.getHours() + 1)
    }
    return next
  }

  // Default: next hour
  next.setHours(next.getHours() + 1)
  next.setMinutes(0)
  return next
}

function buildScheduledTasks(): ScheduledTask[] {
  const tasks: ScheduledTask[] = [
    // Agent heartbeats
    {
      id: 'heartbeat-clawdinho',
      name: 'Clawdinho Heartbeat',
      schedule: 'Every 5 minutes',
      cronExpr: '*/5 * * * *',
      category: 'agent',
      emoji: '🐾',
      enabled: true,
      agent: 'Clawdinho',
      description: 'Check alerts, autotrader, tasks, agent chat',
    },
    {
      id: 'agent-heartbeat',
      name: 'Agent Heartbeat Check',
      schedule: 'Every 5 minutes',
      cronExpr: '*/5 * * * *',
      category: 'agent',
      emoji: '💓',
      enabled: true,
      description: 'Monitor agent activity and health',
    },
    // Trading
    {
      id: 'watchdog-autotrader',
      name: 'Autotrader Watchdog',
      schedule: 'Every 5 minutes',
      cronExpr: '*/5 * * * *',
      category: 'trading',
      emoji: '🤖',
      enabled: true,
      description: 'Check if Kalshi autotrader is running, restart if dead',
    },
    {
      id: 'hourly-snapshot',
      name: 'Kalshi Hourly Snapshot',
      schedule: 'Every hour',
      cronExpr: '0 * * * *',
      category: 'trading',
      emoji: '📸',
      enabled: true,
      description: 'Capture market state and positions',
    },
    {
      id: 'settlement-tracker',
      name: 'Settlement Tracker',
      schedule: 'Every hour',
      cronExpr: '0 * * * *',
      category: 'trading',
      emoji: '💰',
      enabled: true,
      description: 'Track contract settlements and P&L',
    },
    {
      id: 'price-spread',
      name: 'Price Spread Detection',
      schedule: 'Every 15 minutes',
      cronExpr: '*/15 * * * *',
      category: 'trading',
      emoji: '📊',
      enabled: true,
      description: 'Detect price spreads > 1.0 threshold',
    },
    {
      id: 'winrate-alert',
      name: 'Win Rate Alert',
      schedule: 'Every 6 hours',
      cronExpr: '0 */6 * * *',
      category: 'trading',
      emoji: '🎯',
      enabled: true,
      description: 'Alert if win rate drops below threshold',
    },
    {
      id: 'btc-correlation',
      name: 'BTC-ETH Correlation',
      schedule: 'Daily at 12:00 UTC',
      cronExpr: '0 12 * * *',
      category: 'trading',
      emoji: '🔗',
      enabled: true,
      description: 'Track BTC-ETH price correlation',
    },
    {
      id: 'api-reliability',
      name: 'API Reliability Check',
      schedule: 'Every hour',
      cronExpr: '0 * * * *',
      category: 'trading',
      emoji: '📡',
      enabled: true,
      description: 'Track Kalshi API reliability metrics',
    },
    {
      id: 'api-weekly-report',
      name: 'API Weekly Report',
      schedule: 'Sunday 10:00 UTC',
      cronExpr: '0 10 * * 0',
      category: 'trading',
      emoji: '📋',
      enabled: true,
      description: 'Weekly API reliability summary report',
    },
    // Monitoring
    {
      id: 'health-webhook',
      name: 'Health Webhook',
      schedule: 'Every 5 minutes',
      cronExpr: '*/5 * * * *',
      category: 'monitoring',
      emoji: '🏥',
      enabled: true,
      description: 'Send health status to onde.surf webhook',
    },
    {
      id: 'uptime-recorder',
      name: 'Uptime Recorder',
      schedule: 'Every 5 minutes',
      cronExpr: '*/5 * * * *',
      category: 'monitoring',
      emoji: '⏱️',
      enabled: true,
      description: 'Record system uptime metrics',
    },
    {
      id: 'watchdog-services',
      name: 'Services Watchdog',
      schedule: 'Every 15 minutes',
      cronExpr: '*/15 * * * *',
      category: 'monitoring',
      emoji: '🔍',
      enabled: true,
      description: 'Monitor all system services health',
    },
    {
      id: 'meta-watchdog',
      name: 'Meta Watchdog',
      schedule: 'Every 15 minutes',
      cronExpr: '*/15 * * * *',
      category: 'monitoring',
      emoji: '🛡️',
      enabled: true,
      description: 'Watch the watchers - meta monitoring',
    },
    {
      id: 'watchdog-auth',
      name: 'onde.surf Auth Watchdog',
      schedule: 'Every 20 minutes',
      cronExpr: '*/20 * * * *',
      category: 'monitoring',
      emoji: '🔐',
      enabled: true,
      description: 'Verify authentication is working',
    },
    {
      id: 'watchdog-all',
      name: 'All Services Check',
      schedule: 'Every hour',
      cronExpr: '0 * * * *',
      category: 'monitoring',
      emoji: '🌐',
      enabled: true,
      description: 'Comprehensive service health check',
    },
    {
      id: 'site-tests',
      name: 'Site Tests',
      schedule: 'Every 30 minutes',
      cronExpr: '*/30 * * * *',
      category: 'monitoring',
      emoji: '🧪',
      enabled: true,
      description: 'Run periodic smoke tests on onde.la',
    },
    {
      id: 'daily-test-suite',
      name: 'Daily Test Suite',
      schedule: '9:00 AM & 9:00 PM PST',
      cronExpr: '0 17,5 * * *',
      category: 'monitoring',
      emoji: '✅',
      enabled: true,
      description: 'Full test suite run twice daily',
    },
    // Maintenance
    {
      id: 'onde-surf-executor',
      name: 'onde.surf Task Executor',
      schedule: 'Every 5 minutes',
      cronExpr: '*/5 * * * *',
      category: 'maintenance',
      emoji: '⚙️',
      enabled: true,
      description: 'Execute pending tasks from dashboard',
    },
    {
      id: 'ohlc-cache',
      name: 'OHLC Cache Check',
      schedule: 'Every 6 hours',
      cronExpr: '0 */6 * * *',
      category: 'monitoring',
      emoji: '📈',
      enabled: true,
      description: 'Verify OHLC price cache freshness',
    },
    {
      id: 'cleanup-stale-alerts',
      name: 'Cleanup Stale Alerts',
      schedule: 'Every 6 hours',
      cronExpr: '0 */6 * * *',
      category: 'maintenance',
      emoji: '🧹',
      enabled: true,
      description: 'Remove old alert files',
    },
    {
      id: 'cleanup-logs',
      name: 'Autotrader Log Cleanup',
      schedule: 'Daily at 3:00 UTC',
      cronExpr: '0 3 * * *',
      category: 'maintenance',
      emoji: '🗑️',
      enabled: true,
      description: 'Clean up old autotrader logs',
    },
    {
      id: 'cleanup-backups',
      name: 'Backup Cleanup',
      schedule: 'Daily at 1:00 UTC',
      cronExpr: '0 1 * * *',
      category: 'maintenance',
      emoji: '📦',
      enabled: true,
      description: 'Clean up old backup files',
    },
    {
      id: 'backup-memory',
      name: 'Memory Backup',
      schedule: 'Daily at 2:00 UTC',
      cronExpr: '0 2 * * *',
      category: 'maintenance',
      emoji: '💾',
      enabled: true,
      description: 'Backup memory files to git',
    },
    {
      id: 'archive-memory',
      name: 'Archive Old Memory',
      schedule: '1st of month',
      cronExpr: '0 0 1 * *',
      category: 'maintenance',
      emoji: '📁',
      enabled: true,
      description: 'Archive old memory files monthly',
    },
    {
      id: 'session-maintenance',
      name: 'Session Maintenance',
      schedule: 'Every 15 minutes',
      cronExpr: '*/15 * * * *',
      category: 'agent',
      emoji: '🔄',
      enabled: true,
      description: 'Clawdbot session maintenance',
    },
    // Content
    {
      id: 'crypto-rss',
      name: 'Crypto RSS Fetch',
      schedule: 'Every 30 minutes',
      cronExpr: '*/30 * * * *',
      category: 'content',
      emoji: '📰',
      enabled: true,
      description: 'Fetch crypto news RSS feeds',
    },
  ]

  // Calculate next runs
  return tasks.map(task => {
    if (task.cronExpr) {
      const nextRun = getNextCronRun(task.cronExpr)
      return { ...task, nextRun: nextRun.toISOString() }
    }
    return task
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    
    let tasks = buildScheduledTasks()
    
    if (category) {
      tasks = tasks.filter(t => t.category === category)
    }

    // Sort by next run
    tasks.sort((a, b) => {
      if (!a.nextRun) return 1
      if (!b.nextRun) return -1
      return new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime()
    })

    return NextResponse.json({ tasks, count: tasks.length })
  } catch (error) {
    console.error('Error fetching scheduled tasks:', error)
    return NextResponse.json({ tasks: [], count: 0, error: 'Failed to fetch tasks' }, { status: 500 })
  }
}
