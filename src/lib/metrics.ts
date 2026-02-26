// Metrics Library - Historical data tracking for onde.surf

export interface Metric {
  id: number
  metric_key: string
  metric_value: number
  metric_date: string
  source: string | null
  metadata: string | null
  created_at: string
}

export interface MetricDefinition {
  id: number
  metric_key: string
  display_name: string
  category: string
  unit: string | null
  description: string | null
  is_cumulative: number
  created_at: string
}

export interface MetricPoint {
  date: string
  value: number
}

export interface MetricWithHistory {
  key: string
  displayName: string
  currentValue: number | null
  previousValue: number | null
  change: number | null
  changePercent: number | null
  history: MetricPoint[]
  unit: string | null
}

// Record a new metric value
export async function recordMetric(
  db: D1Database,
  metricKey: string,
  value: number,
  date?: string,
  source?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const metricDate = date || new Date().toISOString().split('T')[0]
  
  await db
    .prepare(`
      INSERT INTO metrics (metric_key, metric_value, metric_date, source, metadata)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(metric_key, metric_date) DO UPDATE SET
        metric_value = excluded.metric_value,
        source = excluded.source,
        metadata = excluded.metadata
    `)
    .bind(
      metricKey,
      value,
      metricDate,
      source || null,
      metadata ? JSON.stringify(metadata) : null
    )
    .run()
}

// Get latest value for a metric
export async function getLatestMetric(
  db: D1Database,
  metricKey: string
): Promise<Metric | null> {
  return await db
    .prepare(`
      SELECT * FROM metrics 
      WHERE metric_key = ? 
      ORDER BY metric_date DESC 
      LIMIT 1
    `)
    .bind(metricKey)
    .first<Metric>()
}

// Get metric history for a date range
export async function getMetricHistory(
  db: D1Database,
  metricKey: string,
  days: number = 30
): Promise<MetricPoint[]> {
  const result = await db
    .prepare(`
      SELECT metric_date as date, metric_value as value 
      FROM metrics 
      WHERE metric_key = ? 
        AND metric_date >= date('now', '-' || ? || ' days')
      ORDER BY metric_date ASC
    `)
    .bind(metricKey, days)
    .all<MetricPoint>()
  
  return result.results
}

// Get metric with history and calculated changes
export async function getMetricWithHistory(
  db: D1Database,
  metricKey: string,
  days: number = 30
): Promise<MetricWithHistory | null> {
  // Get definition
  const definition = await db
    .prepare(`SELECT * FROM metric_definitions WHERE metric_key = ?`)
    .bind(metricKey)
    .first<MetricDefinition>()
  
  if (!definition) return null
  
  // Get history
  const history = await getMetricHistory(db, metricKey, days)
  
  if (history.length === 0) {
    return {
      key: metricKey,
      displayName: definition.display_name,
      currentValue: null,
      previousValue: null,
      change: null,
      changePercent: null,
      history: [],
      unit: definition.unit
    }
  }
  
  const currentValue = history[history.length - 1]?.value ?? null
  const previousValue = history.length > 7 
    ? history[Math.max(0, history.length - 8)]?.value ?? null
    : history[0]?.value ?? null
  
  const change = currentValue !== null && previousValue !== null 
    ? currentValue - previousValue 
    : null
  const changePercent = change !== null && previousValue !== null && previousValue !== 0
    ? (change / previousValue) * 100
    : null
  
  return {
    key: metricKey,
    displayName: definition.display_name,
    currentValue,
    previousValue,
    change,
    changePercent,
    history,
    unit: definition.unit
  }
}

// Get all metrics for a category
export async function getCategoryMetrics(
  db: D1Database,
  category: string,
  days: number = 30
): Promise<MetricWithHistory[]> {
  const definitions = await db
    .prepare(`SELECT metric_key FROM metric_definitions WHERE category = ?`)
    .bind(category)
    .all<{ metric_key: string }>()
  
  const metrics: MetricWithHistory[] = []
  
  for (const def of definitions.results) {
    const metric = await getMetricWithHistory(db, def.metric_key, days)
    if (metric) metrics.push(metric)
  }
  
  return metrics
}

// Batch record multiple metrics at once
export async function recordMetricsBatch(
  db: D1Database,
  metrics: Array<{
    key: string
    value: number
    date?: string
    source?: string
  }>
): Promise<void> {
  const date = new Date().toISOString().split('T')[0]
  
  const stmt = db.prepare(`
    INSERT INTO metrics (metric_key, metric_value, metric_date, source)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(metric_key, metric_date) DO UPDATE SET
      metric_value = excluded.metric_value,
      source = excluded.source
  `)
  
  const batch = metrics.map(m => 
    stmt.bind(m.key, m.value, m.date || date, m.source || null)
  )
  
  await db.batch(batch)
}

// Get dashboard stats (aggregated)
export interface DashboardMetrics {
  publishing: {
    booksPublished: number | null
    audiobooks: number | null
    podcasts: number | null
    videos: number | null
    history: MetricPoint[]
  }
  social: {
    xFollowers: number | null
    igFollowers: number | null
    tiktokFollowers: number | null
    youtubeSubscribers: number | null
    postsThisWeek: number | null
  }
  analytics: {
    pageviews: number | null
    users: number | null
    sessions: number | null
    bounceRate: number | null
    history: MetricPoint[]
  }
  search: {
    clicks: number | null
    impressions: number | null
    ctr: number | null
    avgPosition: number | null
    history: MetricPoint[]
  }
  lastUpdated: string | null
}

export async function getDashboardMetrics(db: D1Database): Promise<DashboardMetrics> {
  // Helper to get latest value
  const getLatest = async (key: string) => {
    const m = await getLatestMetric(db, key)
    return m?.metric_value ?? null
  }
  
  // Get all latest values in parallel
  const [
    booksPublished,
    audiobooks,
    podcasts,
    videos,
    xFollowers,
    igFollowers,
    tiktokFollowers,
    youtubeSubscribers,
    postsThisWeek,
    pageviews,
    users,
    sessions,
    bounceRate,
    clicks,
    impressions,
    ctr,
    avgPosition,
    booksHistory,
    analyticsHistory,
    searchHistory
  ] = await Promise.all([
    getLatest('books_published'),
    getLatest('audiobooks_published'),
    getLatest('podcasts_published'),
    getLatest('videos_published'),
    getLatest('x_followers'),
    getLatest('ig_followers'),
    getLatest('tiktok_followers'),
    getLatest('youtube_subscribers'),
    getLatest('posts_published'),
    getLatest('ga_pageviews'),
    getLatest('ga_users'),
    getLatest('ga_sessions'),
    getLatest('ga_bounce_rate'),
    getLatest('gsc_clicks'),
    getLatest('gsc_impressions'),
    getLatest('gsc_ctr'),
    getLatest('gsc_avg_position'),
    getMetricHistory(db, 'books_published', 30),
    getMetricHistory(db, 'ga_pageviews', 30),
    getMetricHistory(db, 'gsc_clicks', 30)
  ])
  
  // Get last updated timestamp
  const lastMetric = await db
    .prepare(`SELECT MAX(created_at) as last FROM metrics`)
    .first<{ last: string | null }>()
  
  return {
    publishing: {
      booksPublished,
      audiobooks,
      podcasts,
      videos,
      history: booksHistory
    },
    social: {
      xFollowers,
      igFollowers,
      tiktokFollowers,
      youtubeSubscribers,
      postsThisWeek
    },
    analytics: {
      pageviews,
      users,
      sessions,
      bounceRate,
      history: analyticsHistory
    },
    search: {
      clicks,
      impressions,
      ctr,
      avgPosition,
      history: searchHistory
    },
    lastUpdated: lastMetric?.last ?? null
  }
}

// Check if we have any data for a metric
export async function hasMetricData(db: D1Database, metricKey: string): Promise<boolean> {
  const count = await db
    .prepare(`SELECT COUNT(*) as count FROM metrics WHERE metric_key = ?`)
    .bind(metricKey)
    .first<{ count: number }>()
  
  return (count?.count ?? 0) > 0
}

// Get all metric definitions
export async function getMetricDefinitions(db: D1Database): Promise<MetricDefinition[]> {
  const result = await db
    .prepare(`SELECT * FROM metric_definitions ORDER BY category, display_name`)
    .all<MetricDefinition>()
  
  return result.results
}
