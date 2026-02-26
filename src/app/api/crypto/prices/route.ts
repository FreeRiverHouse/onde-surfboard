import { NextResponse } from 'next/server';

export const runtime = 'edge';

interface CryptoPrices {
  btc: number;
  eth: number;
  btc24hChange?: number;
  eth24hChange?: number;
  lastUpdated: string;
}

export async function GET() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true',
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    const prices: CryptoPrices = {
      btc: data.bitcoin?.usd || 0,
      eth: data.ethereum?.usd || 0,
      btc24hChange: data.bitcoin?.usd_24h_change,
      eth24hChange: data.ethereum?.usd_24h_change,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(prices);
  } catch (error) {
    console.error('Crypto prices error:', error);
    return NextResponse.json({
      btc: 0,
      eth: 0,
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
