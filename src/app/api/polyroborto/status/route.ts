import { NextResponse } from 'next/server'
import { getTradingStatus } from '@/lib/polyroborto'

export const runtime = 'edge'

export async function GET() {
  const status = getTradingStatus()
  return NextResponse.json(status)
}
