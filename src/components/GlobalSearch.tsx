"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

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

const typeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  task: { label: 'Task', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
  activity: { label: 'Activity', color: 'text-cyan-400', bgColor: 'bg-cyan-400/10' },
  scheduled: { label: 'Scheduled', color: 'text-violet-400', bgColor: 'bg-violet-400/10' },
}

function formatTimestamp(ts?: string): string {
  if (!ts) return ''
  const date = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return date.toLocaleDateString()
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{part}</mark>
    ) : (
      part
    )
  )
}

interface GlobalSearchProps {
  className?: string
}

export function GlobalSearch({ className = '' }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [total, setTotal] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Search with debounce
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setTotal(0)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=15`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
        setTotal(data.total || 0)
        setSelectedIndex(0)
      }
    } catch {
      // search failed
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInputChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 250)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      // Could navigate to detail in the future
      setIsOpen(false)
    }
  }

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  // Flatten for index tracking
  let flatIndex = 0

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group ${className}`}
      >
        <svg className="w-4 h-4 text-white/40 group-hover:text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm text-white/40 group-hover:text-white/60">Search...</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-white/30 bg-white/5 border border-white/10 rounded font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Search modal */}
          <div className="relative w-full max-w-2xl mx-4 bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <svg className="w-5 h-5 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search tasks, activities, schedules..."
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
              )}
              <kbd className="px-1.5 py-0.5 text-[10px] text-white/30 bg-white/5 border border-white/10 rounded font-mono">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {query.length < 2 ? (
                <div className="px-4 py-8 text-center">
                  <div className="text-2xl mb-2">🔍</div>
                  <p className="text-sm text-white/30">
                    Search across tasks, activities, and scheduled operations
                  </p>
                  <div className="flex justify-center gap-4 mt-4 text-xs text-white/20">
                    <span>📋 Tasks</span>
                    <span>⚡ Activities</span>
                    <span>📅 Scheduled</span>
                  </div>
                </div>
              ) : results.length === 0 && !isLoading ? (
                <div className="px-4 py-8 text-center">
                  <div className="text-2xl mb-2">🤷</div>
                  <p className="text-sm text-white/40">No results for &quot;{query}&quot;</p>
                </div>
              ) : (
                Object.entries(grouped).map(([type, typeResults]) => {
                  const config = typeConfig[type] || typeConfig.activity
                  return (
                    <div key={type}>
                      {/* Section header */}
                      <div className="px-4 py-2 bg-white/[0.02] sticky top-0">
                        <span className={`text-[11px] font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-[11px] text-white/20 ml-1.5">({typeResults.length})</span>
                      </div>
                      {/* Results */}
                      {typeResults.map(result => {
                        const currentIndex = flatIndex++
                        const isSelected = currentIndex === selectedIndex
                        return (
                          <div
                            key={result.id}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                              isSelected ? 'bg-cyan-400/10' : 'hover:bg-white/5'
                            }`}
                            onMouseEnter={() => setSelectedIndex(currentIndex)}
                            onClick={() => setIsOpen(false)}
                          >
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-base flex-shrink-0">
                              {result.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">
                                {highlightMatch(result.title, query)}
                              </div>
                              {result.description && (
                                <div className="text-xs text-white/40 truncate mt-0.5">
                                  {highlightMatch(result.description, query)}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {result.timestamp && (
                                <span className="text-[10px] text-white/20">
                                  {formatTimestamp(result.timestamp)}
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 text-[10px] rounded ${config.bgColor} ${config.color}`}>
                                {config.label}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {results.length > 0 && (
              <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-white/20">
                  {total} result{total !== 1 ? 's' : ''} found
                </span>
                <div className="flex gap-3 text-[10px] text-white/20">
                  <span>↑↓ Navigate</span>
                  <span>↵ Select</span>
                  <span>esc Close</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
