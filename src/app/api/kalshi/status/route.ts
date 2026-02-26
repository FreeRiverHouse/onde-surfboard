import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

const BASE_URL = "https://api.elections.kalshi.com";

// Get credentials from CF env at request time (not module level)
function getCredentials(): { apiKeyId: string; privateKeyPem: string } {
  try {
    const { env } = getRequestContext();
    return {
      apiKeyId: (env as any).KALSHI_API_KEY_ID || process.env.KALSHI_API_KEY_ID || "",
      privateKeyPem: (env as any).KALSHI_PRIVATE_KEY || process.env.KALSHI_PRIVATE_KEY || "",
    };
  } catch (err) {
    // Fallback for Next.js local dev server without getRequestContext
    return {
      apiKeyId: process.env.KALSHI_API_KEY_ID || "",
      privateKeyPem: process.env.KALSHI_PRIVATE_KEY || "",
    }
  }
}

interface KalshiStatus {
  cash: number;
  portfolioValue: number;
  positions: Array<{
    ticker: string;
    position: number;
    exposure: number;
    pnl?: number;
  }>;
  btcPrice: number;
  ethPrice: number;
  lastUpdated: string;
  error?: string;
}

// Convert PEM to binary
function pemToBinary(pem: string): ArrayBuffer {
  // Handle literal '\n' that might have been escaped in .env, and remove \r
  const normalizedPem = pem.replace(/\\n/g, '\n').replace(/\r/g, '');
  const lines = normalizedPem.split('\n');
  const base64 = lines
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('-----'))
    .join('');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Import RSA private key for signing
async function importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
  const binaryKey = pemToBinary(privateKeyPem);
  return await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSA-PSS',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

// Sign request
async function signRequest(method: string, path: string, timestamp: string, privateKeyPem: string): Promise<string> {
  const privateKey = await importPrivateKey(privateKeyPem);
  const message = `${timestamp}${method}${path}`;
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    {
      name: 'RSA-PSS',
      saltLength: 32, // Using fixed salt length for consistency
    },
    privateKey,
    encoder.encode(message)
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Make authenticated API request
async function apiRequest(method: string, path: string): Promise<any> {
  const { apiKeyId, privateKeyPem } = getCredentials();
  if (!apiKeyId || !privateKeyPem) {
    throw new Error('Kalshi credentials not configured');
  }
  const timestamp = String(Date.now());
  const signature = await signRequest(method, path, timestamp, privateKeyPem);

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'KALSHI-ACCESS-KEY': apiKeyId,
      'KALSHI-ACCESS-SIGNATURE': signature,
      'KALSHI-ACCESS-TIMESTAMP': timestamp,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Kalshi API error: ${response.status}`);
  }

  return response.json();
}

export async function GET() {
  try {
    // Fetch balance and positions in parallel
    const [balanceData, positionsData] = await Promise.all([
      apiRequest('GET', '/trade-api/v2/portfolio/balance'),
      apiRequest('GET', '/trade-api/v2/portfolio/positions'),
    ]);

    const positions = positionsData.market_positions || [];

    const status: KalshiStatus = {
      cash: (balanceData.balance || 0) / 100,
      portfolioValue: (balanceData.portfolio_value || 0) / 100,
      positions: positions.map((p: any) => ({
        ticker: p.ticker || '',
        position: p.position || 0,
        exposure: (p.market_exposure || 0) / 100,
        pnl: p.realized_pnl ? p.realized_pnl / 100 : undefined,
      })),
      btcPrice: 0,
      ethPrice: 0,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Kalshi API error:', error);

    return NextResponse.json({
      cash: 0,
      portfolioValue: 0,
      positions: [],
      btcPrice: 0,
      ethPrice: 0,
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    } as KalshiStatus, { status: 500 });
  }
}
