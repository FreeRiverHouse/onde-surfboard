'use client'

export const runtime = 'edge'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { GlowCard } from '@/components/ui/GlowCard'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { GradientText } from '@/components/ui/AnimatedText'

/* ─── Types ─── */
interface DailyPoint {
  date: string
  views: number
  visits?: number
}

interface PageEntry { path: string; views: number }
interface ReferrerEntry { referrer: string; views: number }
interface DeviceEntry { type: string; views: number }
interface BrowserEntry { browser: string; views: number }
interface CountryEntry { country: string; views: number }
interface OSEntry { os: string; views: number }

interface MetricsData {
  summary: { pageViews30d: number; pageViews7d: number; visits30d?: number; visits7d?: number }
  daily: DailyPoint[]
  topPages: PageEntry[]
  topReferrers: ReferrerEntry[]
  devices: DeviceEntry[]
  browsers: BrowserEntry[]
  countries: CountryEntry[]
  operatingSystems: OSEntry[]
  hasData: boolean
  lastUpdated: string | null
}

type TimeRange = '7d' | '30d'
type ChartMetric = 'pageviews' | 'unique_visitors' | 'visitors_device' | 'pages_per_day' | 'top_page_trend'

const CHART_METRICS: { key: ChartMetric; label: string; description: string }[] = [
  { key: 'pageviews', label: 'Page Views', description: 'Total page loads per day' },
  { key: 'unique_visitors', label: 'Visitors', description: 'Unique visitors per day' },
  { key: 'visitors_device', label: 'By Device', description: 'Mobile vs Desktop breakdown' },
  { key: 'pages_per_day', label: 'Pages / Day', description: 'Average pages viewed daily' },
  { key: 'top_page_trend', label: 'Top Pages', description: 'Most visited pages trend' },
]

/* ─── Utils ─── */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()}`
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString()
}

/* ─── Main Component ─── */
export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('pageviews')

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/metrics')
        if (!response.ok) throw new Error('Failed to fetch metrics')
        const data = await response.json()
        setMetrics(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [])

  const filteredDaily = useMemo(() => {
    if (!metrics?.daily) return []
    const days = timeRange === '7d' ? 7 : 30
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return metrics.daily
      .filter(d => d.date >= cutoffStr)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [metrics, timeRange])

  const summaryStats = useMemo(() => {
    if (!metrics) return null
    const totalViews = timeRange === '7d' ? metrics.summary.pageViews7d : metrics.summary.pageViews30d
    const avgPerDay = filteredDaily.length > 0
      ? Math.round(filteredDaily.reduce((s, d) => s + d.views, 0) / filteredDaily.length)
      : 0
    const peakDay = filteredDaily.length > 0
      ? filteredDaily.reduce((max, d) => d.views > max.views ? d : max, filteredDaily[0])
      : null
    const totalVisits = timeRange === '7d' ? (metrics.summary.visits7d ?? 0) : (metrics.summary.visits30d ?? 0)
    const mobileViews = metrics.devices.find(d => d.type === 'mobile')?.views ?? 0
    const desktopViews = metrics.devices.find(d => d.type === 'desktop')?.views ?? 0
    const mobilePercent = totalViews > 0 ? Math.round((mobileViews / totalViews) * 100) : 0
    const pagesPerVisit = totalVisits > 0 ? (totalViews / totalVisits).toFixed(1) : '0'

    return { totalViews, totalVisits, avgPerDay, peakDay, mobileViews, desktopViews, mobilePercent, pagesPerVisit }
  }, [metrics, timeRange, filteredDaily])

  const hasData = metrics?.hasData ?? false

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <ScrollReveal animation="fade-up" duration={800}>
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <a href="/" className="text-white/40 hover:text-white/60 transition-colors">← Back</a>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
            <GradientText colors={['#ffffff', '#06b6d4', '#8b5cf6', '#06b6d4', '#ffffff']} speed={4}>
              Analytics
            </GradientText>
          </h1>
          <p className="text-white/40 max-w-xl">
            onde.la web traffic — powered by Cloudflare Web Analytics.
          </p>
        </div>
      </ScrollReveal>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {/* Time Range */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          {(['7d', '30d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                timeRange === range
                  ? 'bg-cyan-500/20 text-cyan-400 shadow-sm shadow-cyan-500/10'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {range === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>

        {/* Metric Selector */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          {CHART_METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                selectedMetric === m.key
                  ? 'bg-purple-500/20 text-purple-400 shadow-sm shadow-purple-500/10'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <GlowCard variant="purple" className="p-8 text-center">
          <div className="text-3xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Error Loading Metrics</h3>
          <p className="text-white/60">{error}</p>
        </GlowCard>
      ) : !hasData ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard
              label="Total Views"
              value={summaryStats?.totalViews ?? 0}
              icon="👁️"
              color="cyan"
            />
            <StatCard
              label="Unique Visitors"
              value={summaryStats?.totalVisits ?? 0}
              icon="👤"
              color="emerald"
            />
            <StatCard
              label="Avg / Day"
              value={summaryStats?.avgPerDay ?? 0}
              icon="📊"
              color="purple"
            />
            <StatCard
              label="Pages / Visit"
              value={parseFloat(summaryStats?.pagesPerVisit ?? '0')}
              icon="📄"
              color="amber"
            />
            <StatCard
              label="Mobile"
              value={summaryStats?.mobilePercent ?? 0}
              suffix="%"
              icon="📱"
              color="cyan"
            />
          </div>

          {/* Main Chart */}
          <GlowCard variant="cyan" noPadding noTilt>
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-white/90">
                    {CHART_METRICS.find(m => m.key === selectedMetric)?.label}
                  </h3>
                  <p className="text-xs text-white/40">
                    {CHART_METRICS.find(m => m.key === selectedMetric)?.description}
                  </p>
                </div>
              </div>

              {selectedMetric === 'pageviews' && (
                <DailyBarChart data={filteredDaily} />
              )}
              {selectedMetric === 'unique_visitors' && (
                <DailyBarChart data={filteredDaily.map(d => ({ ...d, views: d.visits ?? 0 }))} color="#10b981" label="visitors" />
              )}
              {selectedMetric === 'visitors_device' && metrics && (
                <DeviceBreakdownChart devices={metrics.devices} total={summaryStats?.totalViews ?? 0} />
              )}
              {selectedMetric === 'pages_per_day' && (
                <DailyLineChart data={filteredDaily} />
              )}
              {selectedMetric === 'top_page_trend' && metrics && (
                <TopPagesChart pages={metrics.topPages} />
              )}
            </div>
          </GlowCard>

          {/* Detail Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Top Pages */}
            <GlowCard variant="cyan" noPadding noTilt>
              <div className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-white/80">
                  <span>📄</span> Top Pages
                </h3>
                {metrics?.topPages && metrics.topPages.length > 0 ? (
                  <div className="space-y-2.5">
                    {metrics.topPages.slice(0, 10).map((page, i) => (
                      <BarRow
                        key={i}
                        rank={i + 1}
                        label={page.path}
                        value={page.views}
                        maxValue={metrics.topPages[0].views}
                        color="cyan"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyRow />
                )}
              </div>
            </GlowCard>

            {/* Top Referrers */}
            <GlowCard variant="purple" noPadding noTilt>
              <div className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-white/80">
                  <span>🔗</span> Top Referrers
                </h3>
                {metrics?.topReferrers && metrics.topReferrers.length > 0 ? (
                  <div className="space-y-2.5">
                    {metrics.topReferrers.slice(0, 10).map((ref, i) => (
                      <BarRow
                        key={i}
                        rank={i + 1}
                        label={ref.referrer || '(direct)'}
                        value={ref.views}
                        maxValue={metrics.topReferrers[0].views}
                        color="purple"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyRow />
                )}
              </div>
            </GlowCard>
          </div>

          {/* Browsers, Countries, OS */}
          <div className="grid md:grid-cols-3 gap-4">
            <GlowCard variant="cyan" noPadding noTilt>
              <div className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-white/80">
                  <span>🌐</span> Browsers
                </h3>
                {metrics?.browsers && metrics.browsers.length > 0 ? (
                  <div className="space-y-2.5">
                    {metrics.browsers.slice(0, 6).map((b, i) => (
                      <BarRow
                        key={i}
                        label={b.browser}
                        value={b.views}
                        maxValue={metrics.browsers[0].views}
                        color="cyan"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyRow />
                )}
              </div>
            </GlowCard>

            <GlowCard variant="purple" noPadding noTilt>
              <div className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-white/80">
                  <span>🌍</span> Countries
                </h3>
                {metrics?.countries && metrics.countries.length > 0 ? (
                  <div className="space-y-2.5">
                    {metrics.countries.slice(0, 6).map((c, i) => (
                      <BarRow
                        key={i}
                        label={c.country}
                        value={c.views}
                        maxValue={metrics.countries[0].views}
                        color="purple"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyRow />
                )}
              </div>
            </GlowCard>

            <GlowCard variant="cyan" noPadding noTilt>
              <div className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-white/80">
                  <span>💻</span> Operating Systems
                </h3>
                {metrics?.operatingSystems && metrics.operatingSystems.length > 0 ? (
                  <div className="space-y-2.5">
                    {metrics.operatingSystems.slice(0, 6).map((o, i) => (
                      <BarRow
                        key={i}
                        label={o.os}
                        value={o.views}
                        maxValue={metrics.operatingSystems[0].views}
                        color="cyan"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyRow />
                )}
              </div>
            </GlowCard>
          </div>

          {/* Last Updated */}
          {metrics?.lastUpdated && (
            <div className="text-center text-white/30 text-xs pt-2">
              Updated: {new Date(metrics.lastUpdated).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Daily Bar Chart (SVG) ─── */
function DailyBarChart({ data, color = '#06b6d4', label = 'views' }: { data: DailyPoint[]; color?: string; label?: string }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  if (data.length === 0) return <ChartEmpty />

  const maxVal = Math.max(...data.map(d => d.views), 1)
  // Y-axis nice ticks
  const yTicks = useMemo(() => {
    const step = Math.ceil(maxVal / 4)
    const niceStep = step <= 5 ? step : Math.ceil(step / 5) * 5
    const ticks: number[] = []
    for (let v = 0; v <= maxVal + niceStep; v += niceStep) {
      ticks.push(v)
      if (ticks.length >= 5) break
    }
    return ticks
  }, [maxVal])

  const chartMax = yTicks[yTicks.length - 1] || maxVal

  // Show every Nth label so they don't overlap
  const labelEvery = data.length > 20 ? 5 : data.length > 14 ? 3 : data.length > 7 ? 2 : 1

  const chartH = 220
  const padLeft = 44
  const padRight = 12
  const padTop = 12
  const padBottom = 32

  const barWidth = Math.max(4, Math.min(24, (600 - padLeft - padRight) / data.length - 2))
  const chartW = padLeft + padRight + data.length * (barWidth + 2)

  return (
    <div ref={containerRef} className="relative overflow-x-auto">
      {/* Tooltip */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div
          className="absolute z-10 pointer-events-none bg-black/90 border border-white/20 rounded-lg px-3 py-2 text-xs shadow-lg"
          style={{
            left: padLeft + hoveredIndex * (barWidth + 2) + barWidth / 2,
            top: 0,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="text-white font-semibold">{data[hoveredIndex].views} {label}</div>
          <div className="text-white/50">{formatDate(data[hoveredIndex].date)}</div>
        </div>
      )}

      <svg
        width={Math.max(chartW, 300)}
        height={chartH}
        viewBox={`0 0 ${Math.max(chartW, 300)} ${chartH}`}
        className="w-full"
        style={{ minWidth: Math.min(chartW, 300) }}
      >
        {/* Y-axis grid + labels */}
        {yTicks.map((tick, i) => {
          const y = padTop + ((chartMax - tick) / chartMax) * (chartH - padTop - padBottom)
          return (
            <g key={i}>
              <line
                x1={padLeft}
                y1={y}
                x2={Math.max(chartW, 300) - padRight}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 4"
              />
              <text x={padLeft - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="10">
                {formatNumber(tick)}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = (d.views / chartMax) * (chartH - padTop - padBottom)
          const x = padLeft + i * (barWidth + 2)
          const y = chartH - padBottom - barH
          const isHovered = hoveredIndex === i

          return (
            <g
              key={d.date}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Hover background */}
              <rect
                x={x - 1}
                y={padTop}
                width={barWidth + 2}
                height={chartH - padTop - padBottom}
                fill={isHovered ? 'rgba(255,255,255,0.03)' : 'transparent'}
                rx={2}
              />
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, 1)}
                rx={2}
                fill={isHovered ? (color === '#10b981' ? '#34d399' : '#22d3ee') : color}
                opacity={isHovered ? 1 : 0.7}
              >
                <animate attributeName="height" from="0" to={Math.max(barH, 1)} dur="0.4s" fill="freeze" />
                <animate attributeName="y" from={chartH - padBottom} to={y} dur="0.4s" fill="freeze" />
              </rect>

              {/* X-axis label */}
              {i % labelEvery === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={chartH - padBottom + 16}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.4)"
                  fontSize="9"
                >
                  {formatDateShort(d.date)}
                </text>
              )}
            </g>
          )
        })}

        {/* X axis month labels for 30d view */}
        {data.length > 14 && (() => {
          const months = new Set<string>()
          return data.map((d, i) => {
            const monthKey = d.date.slice(0, 7)
            if (months.has(monthKey)) return null
            months.add(monthKey)
            const x = padLeft + i * (barWidth + 2) + barWidth / 2
            const label = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })
            return (
              <text
                key={monthKey}
                x={x}
                y={chartH - 2}
                textAnchor="start"
                fill="rgba(255,255,255,0.25)"
                fontSize="9"
                fontWeight="600"
              >
                {label}
              </text>
            )
          })
        })()}
      </svg>
    </div>
  )
}

/* ─── Daily Line Chart (SVG) ─── */
function DailyLineChart({ data }: { data: DailyPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (data.length === 0) return <ChartEmpty />

  const maxVal = Math.max(...data.map(d => d.views), 1)
  const chartH = 220
  const padLeft = 44
  const padRight = 12
  const padTop = 16
  const padBottom = 32

  const yTicks = useMemo(() => {
    const step = Math.ceil(maxVal / 4)
    const niceStep = step <= 5 ? step : Math.ceil(step / 5) * 5
    const ticks: number[] = []
    for (let v = 0; v <= maxVal + niceStep; v += niceStep) {
      ticks.push(v)
      if (ticks.length >= 5) break
    }
    return ticks
  }, [maxVal])

  const chartMax = yTicks[yTicks.length - 1] || maxVal
  const chartW = 600
  const innerW = chartW - padLeft - padRight
  const innerH = chartH - padTop - padBottom
  const labelEvery = data.length > 20 ? 5 : data.length > 14 ? 3 : data.length > 7 ? 2 : 1

  const points = data.map((d, i) => ({
    x: padLeft + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
    y: padTop + ((chartMax - d.views) / chartMax) * innerH,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${chartH - padBottom} L${points[0].x},${chartH - padBottom} Z`

  return (
    <div className="relative overflow-x-auto">
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div
          className="absolute z-10 pointer-events-none bg-black/90 border border-white/20 rounded-lg px-3 py-2 text-xs shadow-lg"
          style={{
            left: points[hoveredIndex].x,
            top: points[hoveredIndex].y - 40,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="text-white font-semibold">{data[hoveredIndex].views} views</div>
          <div className="text-white/50">{formatDate(data[hoveredIndex].date)}</div>
        </div>
      )}

      <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} className="w-full">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y grid */}
        {yTicks.map((tick, i) => {
          const y = padTop + ((chartMax - tick) / chartMax) * innerH
          return (
            <g key={i}>
              <line x1={padLeft} y1={y} x2={chartW - padRight} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <text x={padLeft - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="10">
                {formatNumber(tick)}
              </text>
            </g>
          )
        })}

        {/* Area */}
        <path d={areaPath} fill="url(#lineGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" />

        {/* Dots + hover areas */}
        {points.map((p, i) => (
          <g
            key={data[i].date}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={p.x - 10}
              y={padTop}
              width={20}
              height={innerH}
              fill="transparent"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 5 : 3}
              fill={hoveredIndex === i ? '#a78bfa' : '#8b5cf6'}
              stroke={hoveredIndex === i ? '#fff' : 'none'}
              strokeWidth={1.5}
            />
            {/* X label */}
            {i % labelEvery === 0 && (
              <text x={p.x} y={chartH - padBottom + 16} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
                {formatDateShort(data[i].date)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

/* ─── Device Breakdown ─── */
function DeviceBreakdownChart({ devices, total }: { devices: DeviceEntry[]; total: number }) {
  if (devices.length === 0) return <ChartEmpty />

  const colors: Record<string, string> = {
    desktop: '#06b6d4',
    mobile: '#8b5cf6',
    tablet: '#f59e0b',
    other: '#6b7280',
  }

  const sorted = [...devices].sort((a, b) => b.views - a.views)

  return (
    <div className="space-y-4 py-4">
      {sorted.map((device) => {
        const pct = total > 0 ? (device.views / total) * 100 : 0
        const color = colors[device.type.toLowerCase()] || colors.other
        return (
          <div key={device.type}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm text-white/70 capitalize">{device.type}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-white">{device.views.toLocaleString()}</span>
                <span className="text-xs text-white/40 w-10 text-right">{pct.toFixed(1)}%</span>
              </div>
            </div>
            <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Top Pages Horizontal Bar Chart ─── */
function TopPagesChart({ pages }: { pages: PageEntry[] }) {
  if (pages.length === 0) return <ChartEmpty />

  const top = pages.slice(0, 8)
  const maxViews = top[0]?.views || 1

  return (
    <div className="space-y-3 py-2">
      {top.map((page, i) => {
        const pct = (page.views / maxViews) * 100
        return (
          <div key={page.path}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/60 truncate max-w-[70%]" title={page.path}>
                {page.path}
              </span>
              <span className="text-xs font-semibold text-white ml-2">{page.views}</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Subcomponents ─── */
function StatCard({
  label, value, suffix, subtitle, icon, color
}: {
  label: string
  value: number
  suffix?: string
  subtitle?: string
  icon: string
  color: 'cyan' | 'purple' | 'amber' | 'emerald'
}) {
  const colorClasses = {
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
  }
  return (
    <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.08] hover:border-white/[0.15] transition-colors">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color]} tabular-nums`}>
        {value.toLocaleString()}{suffix || ''}
      </div>
      {subtitle && <div className="text-[10px] text-white/30 mt-0.5">{subtitle}</div>}
    </div>
  )
}

function BarRow({
  rank, label, value, maxValue, color
}: {
  rank?: number
  label: string
  value: number
  maxValue: number
  color: 'cyan' | 'purple'
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  const barColor = color === 'cyan' ? 'bg-cyan-400/60' : 'bg-purple-400/60'

  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-0.5">
        {rank !== undefined && (
          <span className="text-[10px] text-white/25 w-4 text-right tabular-nums">{rank}</span>
        )}
        <span className="text-xs text-white/60 truncate flex-1" title={label}>{label}</span>
        <span className="text-xs font-medium text-white/80 tabular-nums">{value.toLocaleString()}</span>
      </div>
      <div className={`h-1 bg-white/[0.04] rounded-full overflow-hidden ${rank !== undefined ? 'ml-6' : ''}`}>
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ChartEmpty() {
  return (
    <div className="h-48 flex items-center justify-center text-white/30">
      <div className="text-center">
        <div className="text-2xl mb-2">📈</div>
        <p className="text-sm">No data for this period</p>
      </div>
    </div>
  )
}

function EmptyRow() {
  return <div className="text-center py-4 text-white/25 text-xs">No data</div>
}

function EmptyState() {
  return (
    <GlowCard variant="cyan" className="p-12 text-center">
      <div className="text-5xl mb-4">📊</div>
      <h3 className="text-xl font-semibold mb-2">No Data Yet</h3>
      <p className="text-white/50 max-w-md mx-auto">
        Analytics will appear once Cloudflare Web Analytics starts collecting data for onde.la.
      </p>
    </GlowCard>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 animate-pulse">
            <div className="h-3 bg-white/10 rounded w-16 mb-3" />
            <div className="h-7 bg-white/10 rounded w-12" />
          </div>
        ))}
      </div>
      <div className="bg-white/5 rounded-xl p-6 border border-white/10 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-24 mb-4" />
        <div className="h-48 bg-white/[0.03] rounded" />
      </div>
    </div>
  )
}
