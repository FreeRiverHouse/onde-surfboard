'use client'

export const runtime = 'edge'


import { useState, useEffect } from 'react'
import { FreeRiverHouse } from '@/components/FreeRiverHouse'

interface Book {
  id: string
  title: string
  slug: string
  status: 'planning' | 'writing' | 'illustrating' | 'reviewing' | 'published'
  chapters_total: number
  chapters_done: number
  illustrations_total: number
  illustrations_done: number
  cover_ready: number
  author_agent: string
  illustrator_agent: string
}

interface Stats {
  agents: number
  tasks: {
    pending: number
    in_progress: number
    done: number
    total: number
  }
  books: {
    planning: number
    writing: number
    illustrating: number
    reviewing: number
    published: number
  }
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  planning: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Planning' },
  writing: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Writing' },
  illustrating: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Illustrating' },
  reviewing: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Reviewing' },
  published: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Published' }
}

export default function HouseDashboard() {
  const [books, setBooks] = useState<Book[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/house')
      if (res.ok) {
        const data = await res.json()
        setBooks(data.books || [])
        setStats(data.stats)
      } else {
        console.error('House API error:', res.status, res.statusText)
      }
    } catch (e) {
      console.error('Failed to fetch house data:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white/60">Loading dashboard...</div>
      </div>
    )
  }

  const tasksCompletionPercent = stats?.tasks.total
    ? Math.round((stats.tasks.done / stats.tasks.total) * 100)
    : 0

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <span className="text-4xl">🏠</span>
              FreeRiverHouse HQ
            </h1>
            <p className="text-white/50">Central Operations Dashboard</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/house/chat"
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-400/10 border border-emerald-400/20 rounded-xl text-sm text-emerald-400 hover:bg-emerald-400/20 transition-colors"
            >
              <span>💬</span>
              House Chat
            </a>
            <a
              href="/house/mission-control"
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-400/10 border border-cyan-400/20 rounded-xl text-sm text-cyan-400 hover:bg-cyan-400/20 transition-colors"
            >
              <span>🎛️</span>
              Mission Control
            </a>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-cyan-400">{stats.agents}</div>
              <div className="text-sm text-white/50">Agents</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-emerald-400">{tasksCompletionPercent}%</div>
              <div className="text-sm text-white/50">Tasks Done</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-amber-400">{stats.tasks.in_progress}</div>
              <div className="text-sm text-white/50">In Progress</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-purple-400">{books.length}</div>
              <div className="text-sm text-white/50">Books</div>
            </div>
          </div>
        )}

        {/* House Map */}
        <div className="mb-8">
          <FreeRiverHouse />
        </div>

        {/* Books Pipeline */}
        <section className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <span>📚</span>
              Books Pipeline
            </h2>
          </div>

          {/* Pipeline Stages */}
          <div className="p-6">
            <div className="grid grid-cols-5 gap-2 mb-6">
              {(['planning', 'writing', 'illustrating', 'reviewing', 'published'] as const).map(stage => {
                const color = STATUS_COLORS[stage]
                const count = books.filter(b => b.status === stage).length
                return (
                  <div key={stage} className={`${color.bg} rounded-lg p-3 text-center`}>
                    <div className={`text-2xl font-bold ${color.text}`}>{count}</div>
                    <div className="text-xs text-white/50">{color.label}</div>
                  </div>
                )
              })}
            </div>

            {/* Books List */}
            <div className="space-y-3">
              {books.map(book => {
                const statusColor = STATUS_COLORS[book.status]
                const progress = book.chapters_total > 0
                  ? Math.round((book.chapters_done / book.chapters_total) * 100)
                  : 0

                return (
                  <div
                    key={book.id}
                    className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-white">{book.title}</h3>
                      <span className={`px-2 py-1 rounded-lg text-xs ${statusColor.bg} ${statusColor.text}`}>
                        {statusColor.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-white/50">
                      <span>📝 {book.chapters_done}/{book.chapters_total} chapters</span>
                      {book.cover_ready ? (
                        <span className="text-emerald-400">✓ Cover ready</span>
                      ) : (
                        <span className="text-white/30">○ No cover</span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statusColor.bg.replace('/20', '')} transition-all`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              {books.length === 0 && (
                <div className="text-center py-8 text-white/40">
                  No books in pipeline
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
