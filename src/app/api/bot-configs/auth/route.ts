/**
 * POST /api/bot-configs/auth
 * Verifies secondary password and sets auth cookie.
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const AUTH_TOKEN = 'FRH-BOTS-OK-2026'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    const expected = (process.env.BOT_CONFIGS_PASSWORD || 'Fr33R1v3r2918!')

    if (password !== expected) {
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set('frh_bots_auth', AUTH_TOKEN, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
