// Posts data management for FRH HQ Dashboard
// Uses Cloudflare D1 for persistent storage

export interface PendingPost {
  id: string
  account: 'onde' | 'frh' | 'magmatic'
  content: string
  scheduled_for?: string
  status: 'pending' | 'approved' | 'rejected' | 'posted'
  feedback?: string[]
  media_files?: string[]
  created_at: string
  approved_at?: string
  posted_at?: string
  post_url?: string
  error?: string
  source?: 'dashboard' | 'telegram' | 'agent'
}

// Type for D1 database binding
type D1Database = {
  prepare: (query: string) => D1PreparedStatement
  batch: <T = unknown>(statements: D1PreparedStatement[]) => Promise<D1Result<T>[]>
  exec: (query: string) => Promise<D1ExecResult>
}

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement
  first: <T = unknown>(colName?: string) => Promise<T | null>
  run: <T = unknown>() => Promise<D1Result<T>>
  all: <T = unknown>() => Promise<D1Result<T>>
}

type D1Result<T> = {
  results: T[]
  success: boolean
  meta: Record<string, unknown>
}

type D1ExecResult = {
  count: number
  duration: number
}

// Get D1 database from environment
// In Cloudflare Workers, DB is available via env binding
let _db: D1Database | null = null

export function setDatabase(db: D1Database) {
  _db = db
}

export function getDatabase(): D1Database | null {
  return _db
}

// Fallback in-memory storage for development
let inMemoryPosts: PendingPost[] = [
  {
    id: '1',
    account: 'onde',
    content: 'New book release coming soon! Stay tuned for our latest children\'s story about MILO the robot.',
    scheduled_for: '2026-01-22 08:08',
    status: 'pending',
    created_at: new Date().toISOString(),
    source: 'dashboard'
  },
  {
    id: '2',
    account: 'frh',
    content: 'Building in public: Just deployed our new dashboard with real-time monitoring.',
    scheduled_for: '2026-01-22 09:09',
    status: 'pending',
    created_at: new Date().toISOString(),
    source: 'dashboard'
  }
]

// === Database Functions ===

export async function getPendingPostsFromD1(db: D1Database): Promise<PendingPost[]> {
  try {
    const result = await db.prepare(
      'SELECT * FROM posts WHERE status = ? ORDER BY created_at DESC'
    ).bind('pending').all<PendingPost>()

    return result.results.map(row => ({
      ...row,
      feedback: row.feedback ? JSON.parse(row.feedback as unknown as string) : undefined,
      media_files: row.media_files ? JSON.parse(row.media_files as unknown as string) : undefined,
    }))
  } catch (error) {
    console.error('D1 getPendingPosts error:', error)
    return []
  }
}

export async function getAllPostsFromD1(db: D1Database): Promise<PendingPost[]> {
  try {
    const result = await db.prepare(
      'SELECT * FROM posts ORDER BY created_at DESC LIMIT 100'
    ).all<PendingPost>()

    return result.results.map(row => ({
      ...row,
      feedback: row.feedback ? JSON.parse(row.feedback as unknown as string) : undefined,
      media_files: row.media_files ? JSON.parse(row.media_files as unknown as string) : undefined,
    }))
  } catch (error) {
    console.error('D1 getAllPosts error:', error)
    return []
  }
}

export async function approvePostInD1(db: D1Database, id: string): Promise<boolean> {
  try {
    const result = await db.prepare(
      'UPDATE posts SET status = ?, approved_at = ? WHERE id = ? AND status = ?'
    ).bind('approved', new Date().toISOString(), id, 'pending').run()

    // Log activity - wrap in try-catch to not fail the main operation
    try {
      await db.prepare(
        'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)'
      ).bind(0, 'post_approved', JSON.stringify({ post_id: id, source: 'dashboard' })).run()
    } catch { /* ignore activity log errors */ }

    return result.success
  } catch (error) {
    console.error('D1 approvePost error:', error)
    return false
  }
}

export async function rejectPostInD1(db: D1Database, id: string): Promise<boolean> {
  try {
    const result = await db.prepare(
      'UPDATE posts SET status = ? WHERE id = ? AND status = ?'
    ).bind('rejected', id, 'pending').run()

    // Log activity - wrap in try-catch to not fail the main operation
    try {
      await db.prepare(
        'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)'
      ).bind(0, 'post_rejected', JSON.stringify({ post_id: id, source: 'dashboard' })).run()
    } catch { /* ignore activity log errors */ }

    return result.success
  } catch (error) {
    console.error('D1 rejectPost error:', error)
    return false
  }
}

export async function addFeedbackInD1(db: D1Database, id: string, feedback: string): Promise<boolean> {
  try {
    // Get current feedback
    const post = await db.prepare('SELECT feedback FROM posts WHERE id = ?').bind(id).first<{ feedback: string }>()

    let feedbackArray: string[] = []
    if (post?.feedback) {
      feedbackArray = JSON.parse(post.feedback)
    }
    feedbackArray.push(feedback)

    const result = await db.prepare(
      'UPDATE posts SET feedback = ? WHERE id = ?'
    ).bind(JSON.stringify(feedbackArray), id).run()

    return result.success
  } catch (error) {
    console.error('D1 addFeedback error:', error)
    return false
  }
}

export async function addPostToD1(db: D1Database, post: Omit<PendingPost, 'id' | 'created_at'>): Promise<PendingPost | null> {
  try {
    const newPost: PendingPost = {
      ...post,
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    }

    await db.prepare(
      `INSERT INTO posts (id, account, content, scheduled_for, status, feedback, media_files, created_at, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newPost.id,
      newPost.account,
      newPost.content,
      newPost.scheduled_for || null,
      newPost.status || 'pending',
      newPost.feedback ? JSON.stringify(newPost.feedback) : null,
      newPost.media_files ? JSON.stringify(newPost.media_files) : null,
      newPost.created_at,
      newPost.source || 'dashboard'
    ).run()

    // Log activity - wrap in try-catch to not fail the main operation
    try {
      await db.prepare(
        'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)'
      ).bind(0, 'post_created', JSON.stringify({ post_id: newPost.id, account: newPost.account, source: newPost.source })).run()
    } catch { /* ignore activity log errors */ }

    return newPost
  } catch (error) {
    console.error('D1 addPost error:', error)
    return null
  }
}

export async function markPostAsPostedInD1(db: D1Database, id: string, postUrl: string): Promise<boolean> {
  try {
    const result = await db.prepare(
      'UPDATE posts SET status = ?, posted_at = ?, post_url = ? WHERE id = ?'
    ).bind('posted', new Date().toISOString(), postUrl, id).run()

    // Log activity - wrap in try-catch to not fail the main operation
    try {
      await db.prepare(
        'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)'
      ).bind(0, 'post_posted', JSON.stringify({ post_id: id, url: postUrl })).run()
    } catch { /* ignore activity log errors */ }

    return result.success
  } catch (error) {
    console.error('D1 markAsPosted error:', error)
    return false
  }
}

// === Activity Log Functions ===

export async function getActivityLogFromD1(db: D1Database, limit = 20): Promise<Array<{
  id: number
  type: string
  title: string
  description?: string
  actor?: string
  metadata?: Record<string, unknown>
  created_at: string
}>> {
  try {
    const result = await db.prepare(
      'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?'
    ).bind(limit).all()

    return result.results.map((row: Record<string, unknown>) => ({
      id: row.id as number,
      type: row.type as string,
      title: row.title as string,
      description: row.description as string | undefined,
      actor: row.actor as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      created_at: row.created_at as string
    }))
  } catch (error) {
    console.error('D1 getActivityLog error:', error)
    return []
  }
}

// === Fallback In-Memory Functions (for local dev without D1) ===

export function getPendingPosts(): PendingPost[] {
  return inMemoryPosts.filter(p => p.status === 'pending')
}

export function getAllPosts(): PendingPost[] {
  return inMemoryPosts
}

export function approvePost(id: string): boolean {
  const post = inMemoryPosts.find(p => p.id === id)
  if (post) {
    post.status = 'approved'
    post.approved_at = new Date().toISOString()
    return true
  }
  return false
}

export function rejectPost(id: string): boolean {
  const post = inMemoryPosts.find(p => p.id === id)
  if (post) {
    post.status = 'rejected'
    return true
  }
  return false
}

export function addFeedback(id: string, feedback: string): boolean {
  const post = inMemoryPosts.find(p => p.id === id)
  if (post) {
    if (!post.feedback) post.feedback = []
    post.feedback.push(feedback)
    return true
  }
  return false
}

export function addPost(post: Omit<PendingPost, 'id' | 'created_at'>): PendingPost {
  const newPost: PendingPost = {
    ...post,
    id: Date.now().toString(),
    created_at: new Date().toISOString()
  }
  inMemoryPosts.push(newPost)
  return newPost
}

export function clearApprovedRejected(): void {
  inMemoryPosts = inMemoryPosts.filter(p => p.status === 'pending')
}
