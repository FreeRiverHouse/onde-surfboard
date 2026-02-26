'use client'

export const runtime = 'edge'


import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Post {
  id: string
  account: 'onde' | 'frh' | 'magmatic'
  content: string
  status: 'pending' | 'approved' | 'rejected' | 'posted'
  scheduled_for?: string
  created_at: string
  approved_at?: string
  posted_at?: string
  post_url?: string
  feedback?: string[]
  error?: string
}

const ACCOUNT_CONFIG = {
  onde: { label: '@Onde_FRH', color: 'cyan', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  frh: { label: '@FreeRiverHouse', color: 'emerald', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  magmatic: { label: '@magmatic__', color: 'purple', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' }
}

export default function PRDashboard() {
  const { status: authStatus } = useSession()
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [filter, setFilter] = useState<'pending' | 'posted' | 'all'>('pending')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({})
  const [showFeedbackFor, setShowFeedbackFor] = useState<string | null>(null)

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login')
    }
  }, [authStatus, router])

  const fetchPosts = useCallback(async () => {
    try {
      const status = filter === 'all' ? '' : filter === 'posted' ? 'posted' : 'pending,approved'
      const res = await fetch(`/api/pr/posts?status=${status}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } catch (e) {
      console.error('Failed to fetch posts:', e)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchPosts()
      const interval = setInterval(fetchPosts, 15000)
      return () => clearInterval(interval)
    }
  }, [authStatus, fetchPosts])

  const handleApprove = async (postId: string) => {
    setActionLoading(prev => ({ ...prev, [postId]: true }))

    try {
      const res = await fetch(`/api/pr/posts/${postId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (res.ok) {
        // Optimistically update UI
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, status: 'approved' as const } : p
        ))
        // Refresh after a short delay to get the posted status
        setTimeout(fetchPosts, 3000)
      }
    } catch (e) {
      console.error('Approve failed:', e)
    } finally {
      setActionLoading(prev => ({ ...prev, [postId]: false }))
    }
  }

  const handleFeedback = async (postId: string) => {
    const text = feedbackText[postId]
    if (!text?.trim()) return

    setActionLoading(prev => ({ ...prev, [`feedback_${postId}`]: true }))

    try {
      const res = await fetch(`/api/pr/posts/${postId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: text })
      })

      if (res.ok) {
        setFeedbackText(prev => ({ ...prev, [postId]: '' }))
        setShowFeedbackFor(null)
        fetchPosts()
      }
    } catch (e) {
      console.error('Feedback failed:', e)
    } finally {
      setActionLoading(prev => ({ ...prev, [`feedback_${postId}`]: false }))
    }
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  const pendingCount = posts.filter(p => p.status === 'pending').length
  const approvedCount = posts.filter(p => p.status === 'approved').length

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl">📢</span>
            OndePR Dashboard
          </h1>
          <p className="text-white/50">Approve posts to auto-publish on X</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-amber-400">{pendingCount}</div>
            <div className="text-sm text-white/50">Pending</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-blue-400">{approvedCount}</div>
            <div className="text-sm text-white/50">Approved</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {posts.filter(p => p.status === 'posted').length}
            </div>
            <div className="text-sm text-white/50">Posted</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'posted', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
              }`}
            >
              {f === 'pending' ? 'Pending' : f === 'posted' ? 'Posted' : 'All'}
            </button>
          ))}
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {posts.map(post => {
            const config = ACCOUNT_CONFIG[post.account]
            const isPending = post.status === 'pending'
            const isApproved = post.status === 'approved'
            const isPosted = post.status === 'posted'

            return (
              <article
                key={post.id}
                className={`rounded-2xl border overflow-hidden transition-all ${
                  isPosted
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : isApproved
                    ? 'bg-blue-500/5 border-blue-500/20'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Header */}
                <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text}`}>
                      {config.label}
                    </span>
                    {isApproved && (
                      <span className="flex items-center gap-1.5 text-xs text-blue-400">
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Posting...
                      </span>
                    )}
                    {isPosted && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                        Posted
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/40">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Content */}
                <div className="px-5 py-4">
                  <p className="text-white/90 whitespace-pre-wrap leading-relaxed">
                    {post.content}
                  </p>

                  {/* Post URL if posted */}
                  {post.post_url && (
                    <a
                      href={post.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      View on X
                    </a>
                  )}

                  {/* Feedback history */}
                  {post.feedback && post.feedback.length > 0 && (
                    <div className="mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <div className="text-xs text-amber-400 mb-1">Feedback:</div>
                      {post.feedback.map((f, i) => (
                        <div key={i} className="text-sm text-white/70">{f}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions for pending posts */}
                {isPending && (
                  <div className="px-5 py-4 border-t border-white/10 bg-white/[0.02]">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(post.id)}
                        disabled={actionLoading[post.id]}
                        className="flex-1 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {actionLoading[post.id] ? (
                          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                        )}
                        Approve & Post
                      </button>
                      <button
                        onClick={() => setShowFeedbackFor(showFeedbackFor === post.id ? null : post.id)}
                        className="px-4 py-3 rounded-xl bg-amber-500/20 text-amber-400 font-medium hover:bg-amber-500/30 transition-all"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                    </div>

                    {/* Feedback input */}
                    {showFeedbackFor === post.id && (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={feedbackText[post.id] || ''}
                          onChange={e => setFeedbackText(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleFeedback(post.id)}
                          placeholder="What changes do you need?"
                          className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
                        />
                        <button
                          onClick={() => handleFeedback(post.id)}
                          disabled={!feedbackText[post.id]?.trim() || actionLoading[`feedback_${post.id}`]}
                          className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 font-medium hover:bg-amber-500/30 transition-all disabled:opacity-50"
                        >
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}

          {posts.length === 0 && (
            <div className="text-center py-12 text-white/40">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <p>No {filter === 'pending' ? 'pending' : filter === 'posted' ? 'posted' : ''} posts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
