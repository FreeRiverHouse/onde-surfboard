"use client"

import { useState, useEffect, useCallback } from 'react'

// Activity types with their emoji icons and colors
const activityTypes: Record<string, { emoji: string; color: string }> = {
  // Content
  post_approved: { emoji: '✅', color: 'emerald-400' },
  post_rejected: { emoji: '❌', color: 'red-400' },
  post_created: { emoji: '✏️', color: 'blue-400' },
  post_posted: { emoji: '📤', color: 'cyan-400' },
  image_generated: { emoji: '🎨', color: 'purple-400' },
  book_updated: { emoji: '📚', color: 'amber-400' },
  // Agent
  agent_action: { emoji: '🤖', color: 'blue-400' },
  task_completed: { emoji: '✅', color: 'emerald-400' },
  task_started: { emoji: '🚀', color: 'blue-400' },
  git_commit: { emoji: '📝', color: 'violet-400' },
  heartbeat: { emoji: '💓', color: 'pink-400' },
  alert: { emoji: '🚨', color: 'red-400' },
  game_tested: { emoji: '🎮', color: 'green-400' },
  translation: { emoji: '🌍', color: 'teal-400' },
  memory_update: { emoji: '🧠', color: 'purple-400' },
  cron_job: { emoji: '⏰', color: 'orange-400' },
  // Infra
  deploy: { emoji: '🚀', color: 'cyan-400' },
  monitor: { emoji: '📊', color: 'sky-400' },
  error: { emoji: '💥', color: 'red-500' },
  chat_message: { emoji: '💬', color: 'indigo-400' },
}

const defaultType = { emoji: '⚡', color: 'gray-400' }

interface Activity {
  id: string | number
  type: string
  title: string
  description?: string
  created_at: string
  actor?: string
  metadata?: Record<string, unknown>
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

interface ActivityFeedProps {
  maxItems?: number
  showHeader?: boolean
  className?: string
  filterType?: string
  filterActor?: string
}

export function ActivityFeed({ maxItems = 8, showHeader = true, className = '', filterType, filterActor }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLive, setIsLive] = useState(true)
  const [newActivityCount, setNewActivityCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchActivities = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: String(maxItems) })
      if (filterType) params.set('type', filterType)
      if (filterActor) params.set('actor', filterActor)
      const res = await fetch(`/api/activity?${params}`)
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setIsLoading(false)
    }
  }, [maxItems, filterType, filterActor])

  // Initial fetch
  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  // Periodic refresh when live
  useEffect(() => {
    if (!isLive) return

    const interval = setInterval(() => {
      fetchActivities()
      setNewActivityCount(prev => prev + 1)
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [isLive, fetchActivities])

  if (isLoading) {
    return (
      <div className={`bg-white/5 rounded-xl border border-white/10 overflow-hidden ${className}`}>
        {showHeader && (
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium text-white">Activity Feed</span>
          </div>
        )}
        <div className="p-4 flex justify-center">
          <div className="w-5 h-5 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white/5 rounded-xl border border-white/10 overflow-hidden ${className}`}>
      {showHeader && (
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium text-white">Activity Feed</span>
            {newActivityCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-cyan-400/20 text-cyan-400 rounded-full">
                {newActivityCount} new
              </span>
            )}
          </div>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${
              isLive
                ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                : 'bg-white/5 text-white/40 border border-white/10'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
            {isLive ? 'Live' : 'Paused'}
          </button>
        </div>
      )}

      <div className="divide-y divide-white/5">
        {activities.length === 0 ? (
          <div className="px-4 py-8 text-center text-white/40 text-sm">
            No activity yet
          </div>
        ) : (
          activities.map((activity, index) => {
            const config = activityTypes[activity.type] || defaultType
            return (
              <div
                key={activity.id}
                className="px-4 py-3 hover:bg-white/5 transition-colors group"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: index === 0 && newActivityCount > 0 ? 'slideIn 0.3s ease-out' : undefined
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-base flex-shrink-0">
                    {config.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white font-medium truncate">{activity.title}</span>
                      <span className="text-xs text-white/30 flex-shrink-0">{formatTimeAgo(activity.created_at)}</span>
                    </div>
                    {activity.description && (
                      <p className="text-xs text-white/50 mt-0.5 truncate">{activity.description}</p>
                    )}
                    {activity.actor && (
                      <span className="text-xs text-white/30 mt-1 inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        {activity.actor}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="px-4 py-2 border-t border-white/5">
        <button
          onClick={() => {
            setNewActivityCount(0)
            fetchActivities()
          }}
          className="text-xs text-white/40 hover:text-white/60 transition-colors w-full text-center"
        >
          Refresh activity
        </button>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
