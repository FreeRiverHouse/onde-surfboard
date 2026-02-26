import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Trading Settlements API - T349
 * 
 * Combines v1 and v2 settlement statistics for the trading dashboard.
 * On Edge/Cloudflare deployment, returns placeholder data.
 * Real data is available via GitHub Gist (see push-stats-to-gist.py).
 */

interface SettlementStats {
  totalSettled: number;
  totalPending: number;
  totalWon: number;
  totalLost: number;
  winRate: number;
  totalPnlCents: number;
  totalPayoutCents: number;
  byAsset: {
    BTC: { settled: number; won: number; lost: number; pending: number; pnlCents: number };
    ETH: { settled: number; won: number; lost: number; pending: number; pnlCents: number };
  };
  lastSettlementTime: string | null;
  oldestPendingTime: string | null;
}

interface CombinedSettlements {
  v1: SettlementStats;
  v2: SettlementStats;
  combined: SettlementStats;
  source: 'v1' | 'v2' | 'all';
  notice?: string;
  edgeRuntime: boolean;
}

function emptyStats(): SettlementStats {
  return {
    totalSettled: 0,
    totalPending: 0,
    totalWon: 0,
    totalLost: 0,
    winRate: 0,
    totalPnlCents: 0,
    totalPayoutCents: 0,
    byAsset: {
      BTC: { settled: 0, won: 0, lost: 0, pending: 0, pnlCents: 0 },
      ETH: { settled: 0, won: 0, lost: 0, pending: 0, pnlCents: 0 }
    },
    lastSettlementTime: null,
    oldestPendingTime: null
  };
}

function combineStats(v1: SettlementStats, v2: SettlementStats): SettlementStats {
  const combined = emptyStats();
  
  combined.totalSettled = v1.totalSettled + v2.totalSettled;
  combined.totalPending = v1.totalPending + v2.totalPending;
  combined.totalWon = v1.totalWon + v2.totalWon;
  combined.totalLost = v1.totalLost + v2.totalLost;
  combined.winRate = combined.totalSettled > 0 
    ? (combined.totalWon / combined.totalSettled) * 100 
    : 0;
  combined.totalPnlCents = v1.totalPnlCents + v2.totalPnlCents;
  combined.totalPayoutCents = v1.totalPayoutCents + v2.totalPayoutCents;
  
  for (const asset of ['BTC', 'ETH'] as const) {
    combined.byAsset[asset] = {
      settled: v1.byAsset[asset].settled + v2.byAsset[asset].settled,
      won: v1.byAsset[asset].won + v2.byAsset[asset].won,
      lost: v1.byAsset[asset].lost + v2.byAsset[asset].lost,
      pending: v1.byAsset[asset].pending + v2.byAsset[asset].pending,
      pnlCents: v1.byAsset[asset].pnlCents + v2.byAsset[asset].pnlCents
    };
  }
  
  // Use most recent settlement time
  const times = [v1.lastSettlementTime, v2.lastSettlementTime].filter(Boolean) as string[];
  combined.lastSettlementTime = times.length > 0 
    ? times.sort().reverse()[0] 
    : null;
  
  // Use oldest pending time
  const pendingTimes = [v1.oldestPendingTime, v2.oldestPendingTime].filter(Boolean) as string[];
  combined.oldestPendingTime = pendingTimes.length > 0 
    ? pendingTimes.sort()[0] 
    : null;
  
  return combined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || 'all';
  
  // On Edge runtime, return placeholder data with notice
  const v1Stats = emptyStats();
  const v2Stats = emptyStats();
  const combined = combineStats(v1Stats, v2Stats);
  
  const response: CombinedSettlements = {
    v1: v1Stats,
    v2: v2Stats,
    combined: combined,
    source: source as 'v1' | 'v2' | 'all',
    notice: 'Settlement stats require local file access. Real data available via GitHub Gist.',
    edgeRuntime: true
  };
  
  // Filter based on source param
  if (source === 'v1') {
    return NextResponse.json({ ...response.v1, source: 'v1', edgeRuntime: true, notice: response.notice });
  } else if (source === 'v2') {
    return NextResponse.json({ ...response.v2, source: 'v2', edgeRuntime: true, notice: response.notice });
  }
  
  return NextResponse.json(response);
}
