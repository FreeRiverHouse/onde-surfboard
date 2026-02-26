import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

interface SearchResult {
  id: string
  type: 'activity' | 'task' | 'scheduled'
  title: string
  description?: string
  category?: string
  emoji: string
  timestamp?: string
  relevance: number
  meta?: Record<string, unknown>
}

// Tasks from TASKS.md (static snapshot - updated on deploy)
const KNOWN_TASKS = [
  { id: 'DEPLOY-001', title: 'onde.la deploy funzionante', status: 'DONE', category: 'infra' },
  { id: 'SEO-001', title: 'OG image per /skin-creator', status: 'DONE', category: 'seo' },
  { id: 'SEO-002', title: 'Submit skin-creator a Google Search Console', status: 'READY', category: 'seo' },
  { id: 'MKTG-001', title: 'Post skin creator su Reddit', status: 'DRAFT', category: 'marketing' },
  { id: 'GAM-001', title: 'Skin Creator: Mobile UX improvements', status: 'DONE', category: 'games' },
  { id: 'DASH-001', title: 'Mission Control: Activity Feed', status: 'IN_PROGRESS', category: 'dashboard' },
  { id: 'DASH-002', title: 'Mission Control: Calendar View', status: 'DONE', category: 'dashboard' },
  { id: 'DASH-003', title: 'Mission Control: Global Search', status: 'IN_PROGRESS', category: 'dashboard' },
  { id: 'CONTENT-001', title: 'Add 3 more books to catalog', status: 'DONE', category: 'content' },
  { id: 'CONTENT-002', title: 'Games category pages (puzzle, educational, creative)', status: 'DONE', category: 'content' },
  { id: 'CONTENT-003', title: 'Add 3 more classics: Grimm, Wizard of Oz, Andersen', status: 'DONE', category: 'content' },
  { id: 'GAM-FIX-001', title: 'Test & fix ALL games on onde.la', status: 'DONE', category: 'games' },
  { id: 'ANALYTICS-001', title: 'Setup Plausible/Umami analytics', status: 'DOCS READY', category: 'infra' },
  { id: 'SEO-010', title: 'Add all 40 games to sitemap.xml', status: 'DONE', category: 'seo' },
  { id: 'INT-001', title: 'Inter-game recommendations', status: 'DONE', category: 'games' },
  { id: 'PWA-001', title: 'Offline support per libri', status: 'DONE', category: 'pwa' },
  { id: 'A11Y-001', title: 'Accessibility audit (contrast, aria labels)', status: 'DONE', category: 'a11y' },
  { id: 'PERF-001', title: 'Audit Core Web Vitals', status: 'DONE', category: 'performance' },
]

// Scheduled tasks categories for search
const SCHEDULED_CATEGORIES = [
  { id: 'autotrader', name: 'Kalshi Autotrader Watchdog', emoji: '🤖', schedule: 'Every 5min' },
  { id: 'heartbeat', name: 'Agent Heartbeat', emoji: '💓', schedule: 'Every 5min' },
  { id: 'hourly-snapshot', name: 'Kalshi Hourly Snapshot', emoji: '📸', schedule: 'Every hour' },
  { id: 'site-tests', name: 'Site Smoke Tests', emoji: '🧪', schedule: 'Every 30min' },
  { id: 'memory-backup', name: 'Memory Git Backup', emoji: '💾', schedule: 'Daily 2:00 UTC' },
  { id: 'settlement', name: 'Settlement Tracker', emoji: '💰', schedule: 'Every hour' },
  { id: 'crypto-rss', name: 'Crypto RSS Feed', emoji: '📰', schedule: 'Every 30min' },
  { id: 'daily-tests', name: 'Daily Test Suite', emoji: '✅', schedule: '9AM & 9PM PST' },
]

function scoreMatch(text: string, query: string): number {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const words = lowerQuery.split(/\s+/)

  // Exact match
  if (lowerText === lowerQuery) return 100

  // Contains full query
  if (lowerText.includes(lowerQuery)) return 80

  // All words match
  const allMatch = words.every(w => lowerText.includes(w))
  if (allMatch) return 60

  // Some words match
  const matchCount = words.filter(w => lowerText.includes(w)).length
  if (matchCount > 0) return 20 + (matchCount / words.length) * 40

  return 0
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], query: query || '' })
  }

  const results: SearchResult[] = []

  // 1. Search tasks
  for (const task of KNOWN_TASKS) {
    const titleScore = scoreMatch(task.title, query)
    const idScore = scoreMatch(task.id, query)
    const catScore = scoreMatch(task.category, query)
    const score = Math.max(titleScore, idScore, catScore)

    if (score > 0) {
      const statusEmoji = task.status === 'DONE' ? '✅' : task.status === 'IN_PROGRESS' ? '🔨' : '📋'
      results.push({
        id: `task-${task.id}`,
        type: 'task',
        title: `${task.id}: ${task.title}`,
        description: `Status: ${task.status} • Category: ${task.category}`,
        category: task.category,
        emoji: statusEmoji,
        relevance: score,
        meta: { taskId: task.id, status: task.status },
      })
    }
  }

  // 2. Search scheduled tasks
  for (const sched of SCHEDULED_CATEGORIES) {
    const nameScore = scoreMatch(sched.name, query)
    const idScore = scoreMatch(sched.id, query)
    const score = Math.max(nameScore, idScore)

    if (score > 0) {
      results.push({
        id: `sched-${sched.id}`,
        type: 'scheduled',
        title: sched.name,
        description: `Schedule: ${sched.schedule}`,
        emoji: sched.emoji,
        relevance: score,
      })
    }
  }

  // 3. Search activities in D1
  try {
    const { env } = getRequestContext()
    const db = env.DB

    if (db) {
      const activityResult = await db.prepare(
        `SELECT * FROM activity_log 
         WHERE title LIKE ?1 OR description LIKE ?1 OR actor LIKE ?1 OR type LIKE ?1
         ORDER BY created_at DESC LIMIT 20`
      ).bind(`%${query}%`).all()

      for (const row of activityResult.results) {
        const titleScore = scoreMatch(String(row.title || ''), query)
        const descScore = scoreMatch(String(row.description || ''), query)
        const score = Math.max(titleScore, descScore)

        const typeEmojis: Record<string, string> = {
          task_completed: '✅', deploy: '🚀', git_commit: '📝', heartbeat: '💓',
          agent_action: '🤖', alert: '🚨', game_tested: '🎮', error: '💥',
          monitor: '📊', cron_job: '⏰', memory_update: '🧠',
        }

        results.push({
          id: `activity-${row.id}`,
          type: 'activity',
          title: String(row.title || ''),
          description: row.description ? String(row.description) : undefined,
          emoji: typeEmojis[String(row.type || '')] || '⚡',
          timestamp: row.created_at ? String(row.created_at) : undefined,
          relevance: Math.max(score, 10), // minimum relevance for DB matches
          meta: { actor: row.actor, type: row.type },
        })
      }
    }
  } catch {
    // D1 not available, skip activity search
  }

  // Sort by relevance, then limit
  results.sort((a, b) => b.relevance - a.relevance)
  const limited = results.slice(0, limit)

  return NextResponse.json({
    results: limited,
    query,
    total: results.length,
  })
}
