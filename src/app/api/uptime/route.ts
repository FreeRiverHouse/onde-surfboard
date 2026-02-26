import { NextResponse } from 'next/server'

export const runtime = 'edge'

// Gist URL for uptime history (populated by cron job)
const GIST_URL = 'https://gist.githubusercontent.com/petrucciani/onde-uptime-history/raw/uptime-history.json'

export async function GET() {
  try {
    // Try to fetch from gist
    const res = await fetch(GIST_URL, {
      next: { revalidate: 60 } // Cache for 1 minute
    })
    
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }
    
    // Fallback: return empty structure
    return NextResponse.json({
      generated_at: new Date().toISOString(),
      sites: {},
      error: 'Uptime data not available'
    })
  } catch (error) {
    console.error('Error fetching uptime history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch uptime history' },
      { status: 500 }
    )
  }
}
