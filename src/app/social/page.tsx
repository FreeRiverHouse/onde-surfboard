'use client'

export const runtime = 'edge'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// Types
interface SocialPost {
  id: string
  text: string
  account: 'onde' | 'frh'
  status: 'draft' | 'ready' | 'posted'
  imageUrl?: string
  scheduledFor?: string
  createdAt: string
  postedAt?: string
  postUrl?: string
}

// LocalStorage key
const STORAGE_KEY = 'surfboard-social-posts'

// Icons
const XIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const PencilIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const ImageIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const XMarkIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

// Account styles
const accountConfig = {
  onde: { 
    gradient: 'from-cyan-500 to-teal-500', 
    border: 'border-cyan-400/30', 
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    handle: '@Onde_FRH',
    name: 'Onde',
    avatar: '🌊'
  },
  frh: { 
    gradient: 'from-purple-500 to-pink-500', 
    border: 'border-purple-400/30', 
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
    handle: '@FreeRiverHouse',
    name: 'FreeRiverHouse',
    avatar: '🏠'
  }
}

// Status styles
const statusConfig = {
  draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Draft' },
  ready: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Ready' },
  posted: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Posted' }
}

// Character count colors
function getCharCountColor(count: number): string {
  if (count > 280) return 'text-red-400'
  if (count > 260) return 'text-yellow-400'
  return 'text-gray-400'
}

// Twitter Preview Component
function TwitterPreview({ post }: { post: SocialPost }) {
  const account = accountConfig[post.account]
  
  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg max-w-[500px]">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${account.gradient} flex items-center justify-center text-2xl`}>
          {account.avatar}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="font-bold text-gray-900">{account.name}</span>
            <svg className="w-5 h-5 text-blue-500" viewBox="0 0 22 22" fill="currentColor">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/>
            </svg>
          </div>
          <span className="text-gray-500 text-sm">{account.handle}</span>
        </div>
        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </div>
      
      {/* Content */}
      <div className="mt-3">
        <p className="text-gray-900 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {post.text || <span className="text-gray-400 italic">Your tweet will appear here...</span>}
        </p>
      </div>
      
      {/* Image Preview */}
      {post.imageUrl && (
        <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
          <img 
            src={post.imageUrl} 
            alt="Post image" 
            className="w-full h-auto max-h-[300px] object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
      )}
      
      {/* Footer */}
      <div className="mt-3 flex items-center gap-6 text-gray-500">
        <span className="text-sm">💬</span>
        <span className="text-sm">🔁</span>
        <span className="text-sm">❤️</span>
        <span className="text-sm">📊</span>
        <span className="text-sm">📤</span>
      </div>
      
      {/* Timestamp */}
      <div className="mt-3 pt-3 border-t border-gray-100 text-gray-500 text-sm">
        {post.scheduledFor 
          ? new Date(post.scheduledFor).toLocaleString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : 'Now'}
      </div>
    </div>
  )
}

// Post Card Component
function PostCard({ 
  post, 
  onApprove, 
  onEdit, 
  onDelete 
}: {
  post: SocialPost
  onApprove: (id: string) => void
  onEdit: (post: SocialPost) => void
  onDelete: (id: string) => void
}) {
  const account = accountConfig[post.account]
  const status = statusConfig[post.status]
  const charCount = post.text.length

  return (
    <div className={`bg-white/5 rounded-2xl border ${account.border} hover:bg-white/10 transition-all duration-300 overflow-hidden`}>
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${account.gradient} flex items-center justify-center text-2xl`}>
              {account.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{account.handle}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${status.bg} ${status.text} font-medium`}>
                  {status.label}
                </span>
              </div>
              {post.scheduledFor && (
                <div className="flex items-center gap-1 text-sm text-white/50 mt-0.5">
                  <ClockIcon />
                  <span>{new Date(post.scheduledFor).toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Character Count */}
          <div className={`text-sm font-mono ${getCharCountColor(charCount)}`}>
            {charCount}/280
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-2 gap-4 p-4">
        {/* Text Content */}
        <div>
          <p className="text-white whitespace-pre-wrap text-[15px] leading-relaxed">
            {post.text}
          </p>
          
          {/* Image Preview */}
          {post.imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-white/10">
              <img 
                src={post.imageUrl} 
                alt="Post image" 
                className="w-full h-auto max-h-[200px] object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          )}
        </div>
        
        {/* Twitter Preview */}
        <div className="flex items-start justify-center">
          <div className="transform scale-[0.85] origin-top">
            <TwitterPreview post={post} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-white/5 flex justify-between items-center">
        <div className="flex gap-2">
          {post.status === 'draft' && (
            <button
              onClick={() => onApprove(post.id)}
              className="px-4 py-2 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <CheckIcon /> Mark Ready
            </button>
          )}
          {post.status === 'ready' && (
            <button
              onClick={() => onApprove(post.id)}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <CheckIcon /> Mark Posted
            </button>
          )}
          <button
            onClick={() => onEdit(post)}
            className="px-4 py-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <PencilIcon /> Edit
          </button>
          <button
            onClick={() => onDelete(post.id)}
            className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <TrashIcon /> Delete
          </button>
        </div>
        <span className="text-xs text-white/30">
          {new Date(post.createdAt).toLocaleDateString('en-US', { 
            day: 'numeric', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  )
}

// Editor Modal
function PostEditor({ 
  post, 
  onSave, 
  onClose 
}: {
  post: SocialPost | null
  onSave: (post: SocialPost) => void
  onClose: () => void
}) {
  const [text, setText] = useState(post?.text || '')
  const [account, setAccount] = useState<'onde' | 'frh'>(post?.account || 'onde')
  const [imageUrl, setImageUrl] = useState(post?.imageUrl || '')
  const [scheduledFor, setScheduledFor] = useState(post?.scheduledFor || '')
  const [status, setStatus] = useState<'draft' | 'ready' | 'posted'>(post?.status || 'draft')

  const charCount = text.length
  const isValid = text.length > 0 && text.length <= 280

  const handleSave = () => {
    if (!isValid) return
    
    const newPost: SocialPost = {
      id: post?.id || crypto.randomUUID(),
      text,
      account,
      status,
      imageUrl: imageUrl || undefined,
      scheduledFor: scheduledFor || undefined,
      createdAt: post?.createdAt || new Date().toISOString(),
      postedAt: post?.postedAt,
      postUrl: post?.postUrl
    }
    
    onSave(newPost)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-[#0a0f1a] rounded-2xl border border-white/10 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {post ? 'Edit Post' : 'New Post'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <XMarkIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-4">
              {/* Account Selector */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Account</label>
                <div className="flex gap-2">
                  {(['onde', 'frh'] as const).map((acc) => {
                    const config = accountConfig[acc]
                    return (
                      <button
                        key={acc}
                        onClick={() => setAccount(acc)}
                        className={`flex-1 p-3 rounded-xl border transition-all ${
                          account === acc
                            ? `${config.bg} ${config.border} ${config.text}`
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-xl mr-2">{config.avatar}</span>
                        {config.handle}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Text Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-white/60">Tweet Content</label>
                  <span className={`text-sm font-mono ${getCharCountColor(charCount)}`}>
                    {charCount}/280
                  </span>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What's happening?"
                  rows={6}
                  className={`w-full p-4 rounded-xl bg-white/5 border ${
                    charCount > 280 ? 'border-red-500/50' : 'border-white/10'
                  } text-white placeholder-white/30 resize-none focus:outline-none focus:border-cyan-400/50 transition-colors`}
                />
                {charCount > 280 && (
                  <p className="text-red-400 text-sm mt-1">
                    Tweet is {charCount - 280} characters over the limit
                  </p>
                )}
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  <ImageIcon className="inline w-4 h-4 mr-1" />
                  Image URL (optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  <ClockIcon className="inline w-4 h-4 mr-1" />
                  Schedule (optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-400/50 transition-colors [color-scheme:dark]"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Status</label>
                <div className="flex gap-2">
                  {(['draft', 'ready', 'posted'] as const).map((s) => {
                    const config = statusConfig[s]
                    return (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={`flex-1 p-2 rounded-xl border transition-all text-sm font-medium ${
                          status === s
                            ? `${config.bg} border-current ${config.text}`
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm text-white/60 mb-2">Preview</label>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <TwitterPreview 
                  post={{ 
                    id: '', 
                    text, 
                    account, 
                    status, 
                    imageUrl, 
                    scheduledFor, 
                    createdAt: '' 
                  }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className={`px-6 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
              isValid
                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:opacity-90'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            <CheckIcon />
            {post ? 'Save Changes' : 'Create Post'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Filter Button
function FilterButton({ 
  active, 
  onClick, 
  children, 
  count 
}: { 
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number 
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
        active
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/30'
          : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
      }`}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className={`px-1.5 py-0.5 text-xs rounded-full ${active ? 'bg-cyan-400/30' : 'bg-white/10'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

// Main Component
export default function SocialDashboard() {
  const { status: authStatus } = useSession()
  const router = useRouter()

  const [posts, setPosts] = useState<SocialPost[]>([])
  const [filterAccount, setFilterAccount] = useState<'all' | 'onde' | 'frh'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'ready' | 'posted'>('all')
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login')
    }
  }, [authStatus, router])

  // Load posts from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          setPosts(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to parse saved posts:', e)
        }
      }
      setIsLoading(false)
    }
  }, [])

  // Save posts to localStorage
  const savePosts = useCallback((newPosts: SocialPost[]) => {
    setPosts(newPosts)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPosts))
    }
  }, [])

  // Create or update post
  const handleSavePost = (post: SocialPost) => {
    const existing = posts.find(p => p.id === post.id)
    if (existing) {
      savePosts(posts.map(p => p.id === post.id ? post : p))
    } else {
      savePosts([post, ...posts])
    }
    setShowEditor(false)
    setEditingPost(null)
  }

  // Advance post status
  const handleApprove = (id: string) => {
    savePosts(posts.map(p => {
      if (p.id !== id) return p
      if (p.status === 'draft') return { ...p, status: 'ready' as const }
      if (p.status === 'ready') return { ...p, status: 'posted' as const, postedAt: new Date().toISOString() }
      return p
    }))
  }

  // Edit post
  const handleEdit = (post: SocialPost) => {
    setEditingPost(post)
    setShowEditor(true)
  }

  // Delete post
  const handleDelete = (id: string) => {
    if (confirm('Delete this post?')) {
      savePosts(posts.filter(p => p.id !== id))
    }
  }

  // Create new post
  const handleNewPost = () => {
    setEditingPost(null)
    setShowEditor(true)
  }

  // Filter posts
  const filteredPosts = posts.filter(post => {
    if (filterAccount !== 'all' && post.account !== filterAccount) return false
    if (filterStatus !== 'all' && post.status !== filterStatus) return false
    return true
  })

  // Counts
  const counts = {
    all: posts.length,
    onde: posts.filter(p => p.account === 'onde').length,
    frh: posts.filter(p => p.account === 'frh').length,
    draft: posts.filter(p => p.status === 'draft').length,
    ready: posts.filter(p => p.status === 'ready').length,
    posted: posts.filter(p => p.status === 'posted').length
  }

  // Loading state
  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Not authenticated
  if (authStatus === 'unauthenticated') {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white">
              <XIcon />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Social Dashboard</h1>
              <p className="text-white/60">Manage posts for @Onde_FRH and @FreeRiverHouse</p>
            </div>
          </div>
          <button
            onClick={handleNewPost}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <PlusIcon /> New Post
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-cyan-400 mb-1">{counts.all}</div>
            <div className="text-white/50 text-sm">Total Posts</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-gray-400 mb-1">{counts.draft}</div>
            <div className="text-white/50 text-sm">Drafts</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-1">{counts.ready}</div>
            <div className="text-white/50 text-sm">Ready</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-green-400 mb-1">{counts.posted}</div>
            <div className="text-white/50 text-sm">Posted</div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="mb-8">
        <div className="flex flex-wrap gap-3 mb-4">
          <span className="text-white/50 text-sm py-2">Account:</span>
          <FilterButton active={filterAccount === 'all'} onClick={() => setFilterAccount('all')} count={counts.all}>
            All
          </FilterButton>
          <FilterButton active={filterAccount === 'onde'} onClick={() => setFilterAccount('onde')} count={counts.onde}>
            <span className="text-cyan-400">🌊 @Onde_FRH</span>
          </FilterButton>
          <FilterButton active={filterAccount === 'frh'} onClick={() => setFilterAccount('frh')} count={counts.frh}>
            <span className="text-purple-400">🏠 @FreeRiverHouse</span>
          </FilterButton>
        </div>

        <div className="flex flex-wrap gap-3">
          <span className="text-white/50 text-sm py-2">Status:</span>
          <FilterButton active={filterStatus === 'all'} onClick={() => setFilterStatus('all')}>
            All
          </FilterButton>
          <FilterButton active={filterStatus === 'draft'} onClick={() => setFilterStatus('draft')} count={counts.draft}>
            <span className="text-gray-400">Draft</span>
          </FilterButton>
          <FilterButton active={filterStatus === 'ready'} onClick={() => setFilterStatus('ready')} count={counts.ready}>
            <span className="text-yellow-400">Ready</span>
          </FilterButton>
          <FilterButton active={filterStatus === 'posted'} onClick={() => setFilterStatus('posted')} count={counts.posted}>
            <span className="text-green-400">Posted</span>
          </FilterButton>
        </div>
      </section>

      {/* Posts */}
      <section>
        <h2 className="text-xl font-bold text-white mb-6">
          Posts ({filteredPosts.length})
        </h2>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-16 text-white/50">
            {posts.length === 0 ? (
              <div>
                <p className="text-lg mb-4">No posts yet</p>
                <button
                  onClick={handleNewPost}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                >
                  <PlusIcon /> Create your first post
                </button>
              </div>
            ) : (
              'No posts match these filters'
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onApprove={handleApprove}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      {/* Editor Modal */}
      {showEditor && (
        <PostEditor
          post={editingPost}
          onSave={handleSavePost}
          onClose={() => {
            setShowEditor(false)
            setEditingPost(null)
          }}
        />
      )}
    </div>
  )
}
