import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Trading history API - requires local file access
// Returns informative message on Edge/Cloudflare deployment

interface Trade {
  timestamp: string;
  type: string;
  ticker: string;
  side: string;
  asset?: string;
  contracts?: number;
  price_cents?: number;
  pnl_cents?: number;
  result_status?: string;
}

export async function GET() {
  // On Edge runtime, file system access is not available
  // Return informative response for Cloudflare deployment
  
  const mockTrades: Trade[] = [
    {
      timestamp: new Date().toISOString(),
      type: 'info',
      ticker: 'N/A',
      side: 'N/A',
      asset: 'N/A',
      contracts: 0,
      price_cents: 0,
      pnl_cents: 0,
      result_status: 'pending'
    }
  ];

  return NextResponse.json({
    trades: mockTrades,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
    filters: {},
    notice: 'Trading history requires local file access. View on local development server or check scripts/kalshi-trades.jsonl directly.',
    edgeRuntime: true
  });
}
