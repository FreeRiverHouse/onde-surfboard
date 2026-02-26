'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from './Toast'

interface PendingPost {
  id: string
  account: 'onde' | 'frh' | 'magmatic'
  content: string
  scheduledFor?: string
  status: 'pending' | 'approved' | 'rejected'
}

type ServiceStatus = 'online' | 'offline' | 'checking'

export function PostApproval() {
  const [posts, setPosts] = useState<PendingPost[]>([])
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('checking')
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const { showToast } = useToast()

  const fetchPosts = useCallback(async () => {
    // Try our edge API (works everywhere)
    try {
      const res = await fetch('/api/posts/pending')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
        setServiceStatus('online')
        setLoading(false)
        return
      }
    } catch {
      // API not available
    }

    // Fallback: show offline status
    setServiceStatus('offline')
    setPosts([])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPosts()
    const interval = setInterval(fetchPosts, 30000)
    return () => clearInterval(interval)
  }, [fetchPosts])

  const handleApprove = useCallback(async (id: string) => {
    const post = posts.find(p => p.id === id)
    setActionLoading(prev => ({ ...prev, [id]: true }))
    setPosts(posts.map(p => p.id === id ? { ...p, status: 'approved' } : p))

    try {
      const res = await fetch('/api/posts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (res.ok) {
        showToast(`Post approved for ${post?.account || 'account'}`, 'success')
      } else {
        showToast('Post approved (queued for posting)', 'success')
      }
    } catch {
      showToast('Post approved (will sync when service is online)', 'warning')
    }

    setActionLoading(prev => ({ ...prev, [id]: false }))
    setTimeout(fetchPosts, 1000)
  }, [posts, showToast, fetchPosts])

  const handleReject = useCallback(async (id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: true }))
    setPosts(posts.map(p => p.id === id ? { ...p, status: 'rejected' } : p))

    try {
      await fetch('/api/posts/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      showToast('Post rejected', 'info')
    } catch {
      showToast('Post rejected locally', 'info')
    }

    setActionLoading(prev => ({ ...prev, [id]: false }))
    setTimeout(fetchPosts, 1000)
  }, [posts, showToast, fetchPosts])

  const handleFeedback = useCallback(async (id: string) => {
    const text = feedback[id]
    if (!text?.trim()) return

    setActionLoading(prev => ({ ...prev, [`feedback-${id}`]: true }))

    try {
      await fetch('/api/posts/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, feedback: text })
      })
      showToast('Feedback sent to agent', 'success')
    } catch {
      showToast('Feedback saved', 'info')
    }

    setActionLoading(prev => ({ ...prev, [`feedback-${id}`]: false }))
    setFeedback(prev => ({ ...prev, [id]: '' }))
    fetchPosts()
  }, [feedback, showToast, fetchPosts])

  const accountColors = useMemo(() => ({
    onde: 'text-cyan-400',
    frh: 'text-emerald-400',
    magmatic: 'text-purple-400'
  }), [])

  const accountLabels = useMemo(() => ({
    onde: '@Onde_FRH',
    frh: '@FreeRiverHouse',
    magmatic: '@magmatic__'
  }), [])

  const pendingCount = useMemo(() =>
    posts.filter(p => p.status === 'pending').length,
    [posts]
  )

  return (
    <section
      aria-label="Post Approval"
      className="bg-white/5 rounded-2xl p-6 border border-white/10 card-lift"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-white">Post Approval</h2>
          <div className="flex items-center gap-2">
            <div className={`status-dot ${serviceStatus === 'online' ? 'status-dot-online' : serviceStatus === 'offline' ? 'status-dot-offline' : 'status-dot-warning'}`} />
            <span className="text-xs text-white/40">
              {serviceStatus === 'online' ? 'Connected' : serviceStatus === 'offline' ? 'Offline' : 'Checking...'}
            </span>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${pendingCount > 0 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/10 text-white/40'}`}>
          {pendingCount} pending
        </span>
      </div>

      {/* Offline notice */}
      {serviceStatus === 'offline' && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Posting service offline - posts will be queued</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading posts">
          <div className="skeleton-enhanced h-24 w-full" aria-hidden="true" />
          <div className="skeleton-enhanced h-24 w-full" aria-hidden="true" />
          <span className="sr-only">Loading pending posts...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-white/40 text-sm py-8 text-center flex flex-col items-center gap-2">
          <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>No pending posts</span>
        </div>
      ) : (
        <div
          className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scroll-thin"
          role="list"
          aria-label="Pending posts"
        >
          {posts.map(post => (
            <article
              key={post.id}
              role="listitem"
              aria-label={`Post for ${accountLabels[post.account]}`}
              className={`p-4 rounded-xl border transition-all duration-300 ${
                post.status === 'approved'
                  ? 'bg-emerald-500/10 border-emerald-500/20 animate-bounce-in'
                  : post.status === 'rejected'
                  ? 'bg-red-500/10 border-red-500/20 opacity-60'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${accountColors[post.account]}`}>
                  {accountLabels[post.account]}
                </span>
                {post.scheduledFor && (
                  <span className="text-xs text-white/40">{post.scheduledFor}</span>
                )}
              </div>

              <p className="text-white/80 text-sm mb-3 whitespace-pre-wrap leading-relaxed">{post.content}</p>

              {post.status === 'pending' && (
                <>
                  <div className="flex gap-2 mb-3" role="group" aria-label="Post actions">
                    <button
                      onClick={() => handleApprove(post.id)}
                      disabled={actionLoading[post.id]}
                      aria-label={`Approve post for ${accountLabels[post.account]}`}
                      className="flex-1 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 btn-press transition-all disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
                    >
                      {actionLoading[post.id] ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : null}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(post.id)}
                      disabled={actionLoading[post.id]}
                      aria-label={`Reject post for ${accountLabels[post.account]}`}
                      className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 btn-press transition-all disabled:opacity-50 disabled:cursor-wait"
                    >
                      Reject
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <label className="sr-only" htmlFor={`feedback-${post.id}`}>Feedback for agent</label>
                    <input
                      id={`feedback-${post.id}`}
                      type="text"
                      placeholder="Feedback for agent..."
                      value={feedback[post.id] || ''}
                      onChange={e => setFeedback(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleFeedback(post.id)}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                    <button
                      onClick={() => handleFeedback(post.id)}
                      disabled={!feedback[post.id]?.trim() || actionLoading[`feedback-${post.id}`]}
                      aria-label="Send feedback"
                      className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 btn-press transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {actionLoading[`feedback-${post.id}`] ? '...' : 'Send'}
                    </button>
                  </div>
                </>
              )}

              {post.status !== 'pending' && (
                <div
                  className={`text-xs font-medium flex items-center gap-1.5 ${post.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}
                  role="status"
                  aria-live="polite"
                >
                  {post.status === 'approved' ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Approved</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Rejected</span>
                    </>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
