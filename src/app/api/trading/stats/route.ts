import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Trading stats API - requires local file access
// Returns informative message on Edge/Cloudflare deployment

export async function GET() {
  // On Edge runtime, file system access is not available
  // Return informative response for Cloudflare deployment
  
  return NextResponse.json({
    totalTrades: 0,
    winRate: 0,
    pnlCents: 0,
    todayStats: {
      trades: 0,
      wins: 0,
      losses: 0,
      pending: 0,
      pnl: 0
    },
    recentTrades: [],
    grossProfitCents: 0,
    grossLossCents: 0,
    profitFactor: 0,
    sharpeRatio: 0,
    maxDrawdownCents: 0,
    maxDrawdownPercent: 0,
    calmarRatio: 0,
    sortinoRatio: 0,
    avgDurationHours: 0,
    longestWinStreak: 0,
    longestLossStreak: 0,
    currentStreak: 0,
    currentStreakType: 'none',
    avgReturnCents: 0,
    avgLatencyMs: null,
    notice: 'Trading stats require local file access. View on local development server.',
    edgeRuntime: true
  });
}
