// Types
export interface Task {
  id: string
  title: string
  description: string
  category: string
  priority: number
  status: string
  dependencies: string[]
  estimated_effort: string
  files_involved: string[]
  claimed_by: string | null
  claimed_at: string | null
  completed_at?: string
  created_at?: string
}

export interface DashboardStats {
  tasks: {
    total: number
    completed: number
    inProgress: number
    available: number
    blocked: number
    completionRate: number
    history: { date: string; value: number }[]
  }
  categories: {
    name: string
    completed: number
    total: number
  }[]
  recentActivity: {
    id: string
    title: string
    status: string
    timestamp: string
    category: string
  }[]
  publishing: {
    booksPublished: number | null
    audiobooks: number | null
    podcasts: number | null
    videos: number | null
    history: { date: string; value: number }[]
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
    history: { date: string; value: number }[]
  }
  search: {
    clicks: number | null
    impressions: number | null
    ctr: number | null
    avgPosition: number | null
    history: { date: string; value: number }[]
  }
  revenue: {
    kdpEarnings: number | null
    spotifyPlays: number | null
    youtubeViews: number | null
  }
  activeWorkers: number
  lastUpdated: string | null
  hasData: boolean
}

// Client-side function - fetches from API
export async function getDashboardStats(): Promise<DashboardStats> {
  // Return empty/null state - data will be fetched client-side via API
  // This ensures no fake data is ever shown
  return getEmptyStats()
}

// Empty stats for initial load / no data state
export function getEmptyStats(): DashboardStats {
  return {
    tasks: {
      total: 0,
      completed: 0,
      inProgress: 0,
      available: 0,
      blocked: 0,
      completionRate: 0,
      history: []
    },
    categories: [],
    recentActivity: [],
    publishing: {
      booksPublished: null,
      audiobooks: null,
      podcasts: null,
      videos: null,
      history: []
    },
    social: {
      xFollowers: null,
      igFollowers: null,
      tiktokFollowers: null,
      youtubeSubscribers: null,
      postsThisWeek: null
    },
    analytics: {
      pageviews: null,
      users: null,
      sessions: null,
      bounceRate: null,
      history: []
    },
    search: {
      clicks: null,
      impressions: null,
      ctr: null,
      avgPosition: null,
      history: []
    },
    revenue: {
      kdpEarnings: null,
      spotifyPlays: null,
      youtubeViews: null
    },
    activeWorkers: 0,
    lastUpdated: null,
    hasData: false
  }
}
