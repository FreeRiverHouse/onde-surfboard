import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

const TEST_REPORT_KEY = 'latest-test-report'

// Fallback for when KV is not available (local dev)
const FALLBACK_REPORT = {
  timestamp: new Date().toISOString(),
  run_type: 'unknown',
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  },
  alerts: [],
  error: 'No test data available yet',
}

export async function GET() {
  try {
    const ctx = getRequestContext()
    const kv = ctx.env?.TEST_REPORTS_KV

    if (!kv) {
      // Local dev or KV not configured
      return NextResponse.json(FALLBACK_REPORT)
    }

    const data = await kv.get(TEST_REPORT_KEY, 'json')

    if (!data) {
      return NextResponse.json({
        ...FALLBACK_REPORT,
        error: 'No test report found - tests may not have run yet',
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({
      ...FALLBACK_REPORT,
      error: error instanceof Error ? error.message : 'Failed to fetch test status',
    })
  }
}

// POST endpoint to store test results
// Call with: curl -X POST https://onde.surf/api/test-status -H "X-Test-Secret: $SECRET" -d @report.json
export async function POST(request: Request) {
  try {
    const ctx = getRequestContext()
    const kv = ctx.env?.TEST_REPORTS_KV
    const secret = ctx.env?.TEST_UPLOAD_SECRET

    if (!kv) {
      return NextResponse.json({ error: 'KV not configured' }, { status: 500 })
    }

    // Simple auth check
    const authHeader = request.headers.get('X-Test-Secret')
    if (secret && authHeader !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Validate basic structure
    if (!data.timestamp || !data.tests) {
      return NextResponse.json({ error: 'Invalid report format' }, { status: 400 })
    }

    await kv.put(TEST_REPORT_KEY, JSON.stringify(data), {
      expirationTtl: 86400 * 7, // Keep for 7 days
    })

    return NextResponse.json({ ok: true, timestamp: data.timestamp })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to store report' },
      { status: 500 }
    )
  }
}
