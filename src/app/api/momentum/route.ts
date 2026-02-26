import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

interface MomentumData {
  asset: string;
  symbol: string;
  currentPrice: number;
  momentum: {
    h1: number;
    h4: number;
    h24: number;
    composite: number;
  };
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
  priceHistory: number[];  // Last 24 hourly close prices for charting
}

async function fetchOHLC(coinId: string): Promise<number[][]> {
  // Fetch 2 days of hourly OHLC from CoinGecko
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=2`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 60 } // Cache for 60 seconds
  });
  
  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status}`);
  }
  
  return res.json();
}

function calculateMomentum(ohlc: number[][]): { h1: number; h4: number; h24: number; composite: number } {
  if (ohlc.length < 24) {
    return { h1: 0, h4: 0, h24: 0, composite: 0 };
  }

  const currentPrice = ohlc[ohlc.length - 1][4]; // Close price
  
  // 1h momentum (last vs 1 candle ago)
  const price1h = ohlc.length >= 2 ? ohlc[ohlc.length - 2][4] : currentPrice;
  const h1 = ((currentPrice - price1h) / price1h) * 100;
  
  // 4h momentum (last vs 4 candles ago)
  const price4h = ohlc.length >= 5 ? ohlc[ohlc.length - 5][4] : currentPrice;
  const h4 = ((currentPrice - price4h) / price4h) * 100;
  
  // 24h momentum (last vs 24 candles ago)
  const price24h = ohlc.length >= 25 ? ohlc[ohlc.length - 25][4] : currentPrice;
  const h24 = ((currentPrice - price24h) / price24h) * 100;
  
  // Composite momentum (weighted average: short-term more weight)
  const composite = (h1 * 0.4) + (h4 * 0.35) + (h24 * 0.25);
  
  return {
    h1: Math.round(h1 * 100) / 100,
    h4: Math.round(h4 * 100) / 100,
    h24: Math.round(h24 * 100) / 100,
    composite: Math.round(composite * 100) / 100
  };
}

function getMomentumSignal(composite: number): { signal: 'bullish' | 'bearish' | 'neutral'; strength: 'strong' | 'moderate' | 'weak' } {
  const absComposite = Math.abs(composite);
  
  let strength: 'strong' | 'moderate' | 'weak';
  if (absComposite >= 2) {
    strength = 'strong';
  } else if (absComposite >= 0.5) {
    strength = 'moderate';
  } else {
    strength = 'weak';
  }
  
  let signal: 'bullish' | 'bearish' | 'neutral';
  if (composite >= 0.3) {
    signal = 'bullish';
  } else if (composite <= -0.3) {
    signal = 'bearish';
  } else {
    signal = 'neutral';
  }
  
  return { signal, strength };
}

export async function GET() {
  try {
    // Fetch OHLC data for BTC and ETH in parallel
    const [btcOHLC, ethOHLC] = await Promise.all([
      fetchOHLC('bitcoin'),
      fetchOHLC('ethereum')
    ]);

    const btcMomentum = calculateMomentum(btcOHLC);
    const btcSignal = getMomentumSignal(btcMomentum.composite);
    const btcPrice = btcOHLC.length > 0 ? btcOHLC[btcOHLC.length - 1][4] : 0;
    // Extract last 24 close prices for charting
    const btcPriceHistory = btcOHLC.slice(-24).map(candle => candle[4]);

    const ethMomentum = calculateMomentum(ethOHLC);
    const ethSignal = getMomentumSignal(ethMomentum.composite);
    const ethPrice = ethOHLC.length > 0 ? ethOHLC[ethOHLC.length - 1][4] : 0;
    const ethPriceHistory = ethOHLC.slice(-24).map(candle => candle[4]);

    const data: MomentumData[] = [
      {
        asset: 'Bitcoin',
        symbol: 'BTC',
        currentPrice: btcPrice,
        momentum: btcMomentum,
        signal: btcSignal.signal,
        strength: btcSignal.strength,
        priceHistory: btcPriceHistory
      },
      {
        asset: 'Ethereum',
        symbol: 'ETH',
        currentPrice: ethPrice,
        momentum: ethMomentum,
        signal: ethSignal.signal,
        strength: ethSignal.strength,
        priceHistory: ethPriceHistory
      }
    ];

    return NextResponse.json({
      data,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching momentum:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch momentum data',
      details: String(error)
    }, { status: 500 });
  }
}
