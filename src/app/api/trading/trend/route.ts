import { NextResponse } from 'next/server';

export const runtime = 'edge';

interface DailyStats {
  date: string;
  winRate: number;
  trades: number;
  won: number;
  lost: number;
  pnlCents: number;
}

// Since we're on edge runtime, we can't read local files
// We'll provide an endpoint that the server-side script can populate
// For now, return mock data that mimics real patterns

function generateRealisticTrendData(days: number = 30): DailyStats[] {
  const data: DailyStats[] = [];
  
  // Simulate realistic trading data
  // V2 model started ~Jan 28, 2026, so show improvement trend
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  let cumulativeWins = 0;
  let cumulativeTrades = 0;
  
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);
    
    // Simulate trades per day (more on weekdays)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseTrades = isWeekend ? 3 : 8;
    const dailyTrades = Math.max(0, baseTrades + Math.floor((Math.random() - 0.3) * 6));
    
    if (dailyTrades === 0) {
      // No trades this day, use cumulative stats
      const winRate = cumulativeTrades > 0 ? (cumulativeWins / cumulativeTrades) * 100 : 0;
      data.push({
        date: dateStr,
        winRate: Math.round(winRate * 10) / 10,
        trades: 0,
        won: 0,
        lost: 0,
        pnlCents: 0
      });
      continue;
    }
    
    // Simulate win rate - trending upward as model improves
    // Days into trading affects base win rate (learning curve)
    const dayFactor = Math.min(i / days, 1); // 0 to 1 over the period
    const baseWinRate = 35 + dayFactor * 20; // 35% -> 55% over 30 days
    
    // Add daily variance
    const variance = (Math.random() - 0.5) * 20;
    const dailyWinRate = Math.max(0, Math.min(100, baseWinRate + variance));
    
    const won = Math.round(dailyTrades * dailyWinRate / 100);
    const lost = dailyTrades - won;
    
    cumulativeWins += won;
    cumulativeTrades += dailyTrades;
    
    // Calculate PnL (assume avg 15 cent profit per win, 20 cent loss per loss)
    const pnlCents = won * 15 - lost * 20;
    
    data.push({
      date: dateStr,
      winRate: Math.round(dailyWinRate * 10) / 10,
      trades: dailyTrades,
      won,
      lost,
      pnlCents
    });
  }
  
  return data;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30', 10);
  const source = searchParams.get('source') || 'v2';
  
  // Clamp days to reasonable range
  const clampedDays = Math.max(7, Math.min(90, days));
  
  // Generate trend data
  // In production, this would read from a pre-computed cache file
  // that gets updated by a cron job reading actual trade data
  const trendData = generateRealisticTrendData(clampedDays);
  
  // Calculate summary stats
  const totalTrades = trendData.reduce((sum, d) => sum + d.trades, 0);
  const totalWon = trendData.reduce((sum, d) => sum + d.won, 0);
  const overallWinRate = totalTrades > 0 ? (totalWon / totalTrades) * 100 : 0;
  const totalPnlCents = trendData.reduce((sum, d) => sum + d.pnlCents, 0);
  
  // Trend direction (comparing last 7 days to previous 7 days)
  const recentDays = trendData.slice(-7);
  const previousDays = trendData.slice(-14, -7);
  const recentAvgWR = recentDays.reduce((s, d) => s + d.winRate, 0) / recentDays.length;
  const previousAvgWR = previousDays.length > 0 
    ? previousDays.reduce((s, d) => s + d.winRate, 0) / previousDays.length 
    : recentAvgWR;
  const trend = recentAvgWR > previousAvgWR + 2 ? 'improving' 
              : recentAvgWR < previousAvgWR - 2 ? 'declining' 
              : 'stable';
  
  return NextResponse.json({
    data: trendData,
    summary: {
      days: clampedDays,
      source,
      totalTrades,
      totalWon,
      totalLost: totalTrades - totalWon,
      overallWinRate: Math.round(overallWinRate * 10) / 10,
      totalPnlCents,
      trend,
      recentAvgWinRate: Math.round(recentAvgWR * 10) / 10,
      previousAvgWinRate: Math.round(previousAvgWR * 10) / 10
    },
    lastUpdated: new Date().toISOString(),
    note: 'Data simulated for edge runtime. For real data, use server-side endpoint or pre-computed cache.'
  });
}
